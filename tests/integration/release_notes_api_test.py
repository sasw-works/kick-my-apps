import http.client, json, subprocess, urllib.parse, sys, threading, time, os, signal
from http.server import BaseHTTPRequestHandler, HTTPServer

# The release-notes writer and the "it's fixed" reviews list are tested against a local stand-in for Gemini (GEMINI_API_BASE), so it needs no real
# AI key and can check exactly what would be sent to the model. It starts its own app server on
# port 3112 (once without any AI key, once with a fake one) and leaves the others alone.
PORT=3112; FAKE_PORT=3999
PG=["psql","-h","127.0.0.1","-U","kma","-d","kma_test","-tA","-v","ON_ERROR_STOP=1"]
def psql(q):
    r=subprocess.run(PG+["-c",q],capture_output=True,text=True,env={"PGPASSWORD":"kma","PATH":"/usr/bin:/bin"})
    if r.returncode: raise RuntimeError(r.stderr)
    out=r.stdout.strip().splitlines(); return out[0] if out else ""
def req(m,p,cookie=None,body=None):
    c=http.client.HTTPConnection("localhost",PORT,timeout=40); h={}; d=None
    if cookie:h["Cookie"]=cookie
    if body is not None: d=json.dumps(body); h["content-type"]="application/json"
    c.request(m,p,body=d,headers=h); r=c.getresponse(); t=r.read().decode("utf-8","ignore"); c.close()
    try: js=json.loads(t)
    except Exception: js=None
    return r.status,js,t
def signin(email,code="123456"):
    psql("""CREATE TABLE IF NOT EXISTS email_codes (email TEXT PRIMARY KEY, code TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, attempts INTEGER NOT NULL DEFAULT 0)""")
    psql(f"INSERT INTO email_codes VALUES ('{email}','123456',now()+interval '10 min',0) ON CONFLICT (email) DO UPDATE SET code='123456',expires_at=now()+interval '10 min',attempts=0")
    c=http.client.HTTPConnection("localhost",PORT,timeout=20); c.request("GET","/api/auth/csrf"); r=c.getresponse()
    js=json.loads(r.read().decode()); ck=r.msg.get_all("Set-Cookie") or []; c.close()
    cc=next(x.split(";")[0] for x in ck if x.startswith("authjs.csrf-token"))
    c=http.client.HTTPConnection("localhost",PORT,timeout=20)
    b=urllib.parse.urlencode({"csrfToken":js["csrfToken"],"email":email,"code":code,"callbackUrl":f"http://localhost:{PORT}/console","json":"true"})
    c.request("POST","/api/auth/callback/email-code",body=b,headers={"Cookie":cc,"content-type":"application/x-www-form-urlencoded"})
    r=c.getresponse(); r.read(); ck2=r.msg.get_all("Set-Cookie") or []; c.close()
    return next((x.split(";")[0] for x in ck2 if x.startswith("authjs.session-token")),None)
P=F=0
def check(n,c,d=""):
    global P,F
    if c: P+=1; print(f"  ok   {n}")
    else: F+=1; print(f"  FAIL {n}   {d}")

# --- fake Gemini ---
seen=[]; behaviour={"mode":"ok","text":"Thanks for telling us.","fail_next":0}
class H(BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def do_POST(self):
        body=json.loads(self.rfile.read(int(self.headers.get("content-length",0))) or b"{}")
        seen.append({"path":self.path,"key":self.headers.get("x-goog-api-key"),"prompt":body["contents"][0]["parts"][0]["text"]})
        mode=behaviour["mode"]
        if mode=="fail" or behaviour["fail_next"]>0:
            if behaviour["fail_next"]>0: behaviour["fail_next"]-=1
            self.send_response(500); self.end_headers(); self.wfile.write(b'{"error":"boom SECRET-FAKE-KEY"}'); return
        self.send_response(200); self.send_header("content-type","application/json"); self.end_headers()
        self.wfile.write(json.dumps({"candidates":[{"content":{"parts":[{"text":behaviour["text"]}]}}]}).encode())
httpd=HTTPServer(("127.0.0.1",FAKE_PORT),H); threading.Thread(target=httpd.serve_forever,daemon=True).start()

def start_server(extra_env):
    env=dict(os.environ); env.update({"POSTGRES_URL":"postgres://kma:kma@127.0.0.1:5432/kma_test","AUTH_SECRET":"test-secret-for-sandbox","AUTH_TRUST_HOST":"true","ADMIN_EMAILS":"admin@x.com","CRON_SECRET":"test-cron-secret"})
    for k in ("GEMINI_API_KEY","OPENROUTER_API_KEY","GEMINI_API_BASE"): env.pop(k,None)
    env.update(extra_env)
    proc=subprocess.Popen(["npx","next","start","-p",str(PORT)],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,preexec_fn=os.setsid)
    for _ in range(60):
        try:
            c=http.client.HTTPConnection("localhost",PORT,timeout=2); c.request("GET","/api/auth/csrf"); c.getresponse().read(); c.close(); return proc
        except Exception: time.sleep(1)
    raise RuntimeError("server didn't start")
def stop(proc):
    try: os.killpg(os.getpgid(proc.pid),signal.SIGTERM)
    except Exception: pass
    time.sleep(1)

for t in ["pulse_alerts","pulse_reviews","pulse_snapshots","pulse_monitors","scans","task_status","custom_tasks","rate_limits","email_codes","users","accounts","sessions"]:
    try: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    except Exception: pass

def monitor(email,app,name,kind="mine"):
    return psql(f"INSERT INTO pulse_monitors (user_email,app_id,country,app_name,developer,kind,alerts_enabled) VALUES ('{email}','{app}','us','{name}','Acme Ltd','{kind}',true) RETURNING id")
def snap(mid,version,released_days,taken_days): psql(f"INSERT INTO pulse_snapshots (monitor_id,version,version_released_at,taken_at) VALUES ({mid},'{version}',now()-interval '{released_days} days',now()-interval '{taken_days} days')")
def review(mid,rid,rating,text,version="1.0"): psql(f"INSERT INTO pulse_reviews (monitor_id,review_id,rating,title,content,version) VALUES ({mid},'{rid}',{rating},'',$t${text}$t$,'{version}')")
def done(email,pk,key,days): psql(f"INSERT INTO task_status (user_email,project_key,finding_key,status,updated_at) VALUES ('{email}','{pk}','{key}','done',now()-interval '{days} days')")
def scan(email,app):
    f=json.dumps([{"key":"contrast","title":"Fix low contrast","status":"bad","finding":"f","suggestion":"s"},{"key":"cta","title":"Make the main button obvious","status":"bad","finding":"f","suggestion":"s"},{"key":"todo","title":"Not finished yet","status":"bad","finding":"f","suggestion":"s"}])
    psql(f"INSERT INTO scans (app_name,health_score,result_json,store_url,user_email) VALUES ('App {app}',60,$j${{\"healthScore\":60,\"aiSummary\":\"x\",\"findings\":{f},\"lensScores\":{{}}}}$j$::jsonb,'https://apps.apple.com/us/app/x/id{app}','{email}')")

procs=start_server({})
try:
    ALICE=signin("alice@x.com"); BOB=signin("bob@x.com")
    for ck in (ALICE,): req("GET","/api/pulse/monitors",cookie=ck); req("GET","/api/history",cookie=ck); req("GET","/api/tasks",cookie=ck)
    am=monitor("alice@x.com","11111","AliceApp"); rival=monitor("alice@x.com","22222","Rival","other"); bm=monitor("bob@x.com","33333","BobApp")
    pm=monitor("alice@x.com","com.acme.game","AcmeGame")
    snap(am,"1.0",40,40); snap(am,"1.1",10,9)
    scan("alice@x.com","11111")
    done("alice@x.com","app:11111","contrast",3)      # since the last release -> included
    done("alice@x.com","app:11111","cta",20)           # before version 1.1 shipped -> not included
    done("alice@x.com","app:11111","rev:crash",2)      # a review task, done -> included
    done("alice@x.com","app:11111","made-up-key",1)    # no title anywhere -> not included
    psql("INSERT INTO custom_tasks (user_email,project_key,task_key,title,source) VALUES ('alice@x.com','app:11111','rev:crash','Reviews: Crashes','review'),('alice@x.com','app:11111','rev:login','Reviews: Login','review')")
    for i,t in enumerate(["It crashes on launch","Crashes every time","App keeps crashing since the update"]): review(am,f"c{i}",1,t,"1.0")
    review(am,"l1",1,"Can't log in at all","1.0"); review(am,"ok",5,"Love it, never crashes")
    review(bm,"b1",1,"Bob crash","1.0")
    notes_get=lambda m,ck=ALICE: req("GET",f"/api/pulse/monitors/{m}/release-notes",cookie=ck)
    notes=lambda m,ck=ALICE,**b: req("POST",f"/api/pulse/monitors/{m}/release-notes",cookie=ck,body=b)

    print("== 1. what goes into the next release notes")
    st,js,_=notes_get(am)
    keys=[t["key"] for t in js["tasks"]] if js else []
    check("tasks done since the last release only (not older ones, not unknown keys, not todo)", st==200 and sorted(keys)==["contrast","rev:crash"], f"{st} {js}")
    check("titles come from the report / the review task, with the last version and the store", js["lastVersion"]=="1.1" and {t["title"] for t in js["tasks"]}=={"Fix low contrast","Reviews: Crashes"} and js["store"]=="appstore" and js["maxChars"]==4000)
    check("no AI configured is reported in GET", js["aiAvailable"] is False)
    check("play app: store and the 500 limit", notes_get(pm)[1]["store"]=="play" and notes_get(pm)[1]["maxChars"]==500)
    check("no snapshot yet -> the last 30 days: nothing done there for the play app", notes_get(pm)[1]["tasks"]==[])
    check("bob can't read alice's (404)", notes_get(am,BOB)[0]==404)
    check("another app she monitors (not hers) -> 404", notes_get(rival)[0]==404)
    check("anonymous -> 401", req("GET",f"/api/pulse/monitors/{am}/release-notes")[0]==401 and req("POST",f"/api/pulse/monitors/{am}/release-notes",body={})[0]==401)
    st,js,body=notes(am,taskKeys=["contrast"])
    check("writing without an AI key is a generic 503", st==503 and "KEY" not in body and "GEMINI" not in body, f"{st} {body[:150]}")

    print("== 2. the \"it's fixed\" reviews")
    topics=lambda m,ck=ALICE: req("GET",f"/api/pulse/monitors/{m}/topics",cookie=ck)
    by={t["key"]:t for t in topics(am)[1]["topics"]}
    check("crash is marked fixed (added + done); login is added but not fixed", by["crash"]["fixed"] is True and by["login"]["fixed"] is False, {k:(v["added"],v["fixed"]) for k,v in by.items()})
    fx=lambda m,key,ck=ALICE: req("GET",f"/api/pulse/monitors/{m}/topics/{key}",cookie=ck)
    st,js,_=fx(am,"crash")
    check("the 3 reviews that mention crashes (1-3 star only), with ids and versions", st==200 and js["total"]==3 and sorted(r["id"] for r in js["reviews"])==["c0","c1","c2"] and js["latestVersion"]=="1.1" and js["topic"]["label"], f"{st} {js}")
    check("a topic that isn't done yet is refused (409)", fx(am,"login")[0]==409 and fx(am,"login")[1]["code"]=="NOT_FIXED")
    check("unknown topic -> 404", fx(am,"nonsense")[0]==404)
    check("bob -> 404", fx(am,"crash",BOB)[0]==404)
    check("not her own app -> 404", fx(rival,"crash")[0]==404)
    check("anonymous -> 401", req("GET",f"/api/pulse/monitors/{am}/topics/crash")[0]==401)
    check("bob's reviews never show up for alice", all("Bob" not in (r["content"] or "") for r in fx(am,"crash")[1]["reviews"]))
finally: stop(procs)

procs=start_server({"GEMINI_API_KEY":"SECRET-FAKE-KEY","GEMINI_API_BASE":f"http://127.0.0.1:{FAKE_PORT}"})
try:
    ALICE=signin("alice@x.com"); BOB=signin("bob@x.com")
    print("== 3. writing the notes")
    check("GET now says AI is available", notes_get(am)[1]["aiAvailable"] is True)
    behaviour["text"]="Here's the release notes:\n- Faster, calmer launch\n- **Better** contrast"
    st,js,_=notes(am,taskKeys=["contrast"],extra="Dark mode added",language="Turkish")
    check("a cleaned-up draft comes back with the number of tasks used", st==200 and js["notes"]=="• Faster, calmer launch\n• Better contrast" and js["used"]==1 and js["maxChars"]==4000, f"{st} {js}")
    pr=seen[-1]["prompt"]
    check("the prompt has the chosen task title and note, in Turkish, key only in the header", "Fix low contrast" in pr and "Dark mode added" in pr and "in Turkish" in pr and seen[-1]["key"]=="SECRET-FAKE-KEY")
    check("tasks she did NOT pick, and ones from before the release, are not sent", "Reviews: Crashes" not in pr and "Make the main button obvious" not in pr)
    notes(am,extra="only a note"); check("with no taskKeys given, every task since the release is used", "Fix low contrast" in seen[-1]["prompt"] and "Reviews: Crashes" in seen[-1]["prompt"])
    st,js,_=notes(am,taskKeys=["cta","made-up-key"])
    check("keys outside the list are ignored -> nothing to write (400)", st==400 and js["code"]=="NOTHING_TO_WRITE", f"{st} {js}")
    n=len(seen); st,js,_=notes(am,taskKeys=[],extra="Dark mode added")
    check("only her own note is enough", st==200 and len(seen)==n+1 and "(none)" in seen[-1]["prompt"].split("<<<CHANGES")[1].split("CHANGES>>>")[0])
    check("bad input -> 400", notes(am,taskKeys="x")[0]==400 and notes(am,taskKeys=[1])[0]==400 and notes(am,extra=5)[0]==400 and notes(am,language="x"*50,extra="a")[0]==400 and notes(am,extra="z"*900)[0]==400)
    check("bob -> 404; not her own app -> 404", notes(am,BOB,extra="a")[0]==404 and notes(rival,extra="a")[0]==404)
    behaviour["text"]="• "+("word "*300)
    st,js,_=notes(pm,extra="a game change")
    check("play app: the text is cut to 500 characters", st==200 and len(js["notes"])<=500 and js["maxChars"]==500, f"{st} {len(js.get('notes',''))}")
    behaviour["mode"]="fail"
    st,js,body=notes(am,extra="a"); check("provider trouble -> generic 502, no key or provider detail", st==502 and "SECRET" not in body and "boom" not in body, f"{st} {body[:150]}")
    behaviour["mode"]="ok"; behaviour["text"]="   "
    check("an empty answer is a 502, not an empty draft", notes(am,extra="a")[0]==502)
    behaviour["text"]="• ok"
    codes=[notes(am,extra="a")[0] for _ in range(22)]; check("limited to 20 per hour", 429 in codes, str(codes))
finally: stop(procs)

print(f"\n{P} passed, {F} failed"); sys.exit(1 if F else 0)
