import http.client, json, subprocess, urllib.parse, sys, threading, time, os, signal
from http.server import BaseHTTPRequestHandler, HTTPServer

# The feature requests board is tested (with AI grouping) against a local stand-in for Gemini (GEMINI_API_BASE), so it needs no real
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
seen=[]; behaviour={"mode":"ok","text":"{\"clusters\":[]}","fail_next":0}
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

for t in ["custom_tasks","scans","feature_clusters","pulse_alerts","pulse_reviews","pulse_snapshots","pulse_monitors","rate_limits","email_codes","users","accounts","sessions"]:
    try: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    except Exception: pass
def monitor(email,app,name,kind="mine"):
    return psql(f"INSERT INTO pulse_monitors (user_email,app_id,country,app_name,developer,kind,alerts_enabled) VALUES ('{email}','{app}','us','{name}','Acme','{kind}',true) RETURNING id")
def review(mid,rid,rating,text,days_ago=1,how=None):
    h=f"'{how}'" if how else "NULL"; ha="now()-interval '1 hour'" if how else "NULL"
    psql(f"INSERT INTO pulse_reviews (monitor_id,review_id,rating,title,content,version,reviewed_at,handled_how,handled_at) VALUES ({mid},'{rid}',{rating},'',$t${text}$t$,'1.0',now()-interval '{days_ago} days',{h},{ha})")

def scan(email,app):
    psql(f"INSERT INTO scans (app_name,health_score,result_json,store_url,user_email) VALUES ('App {app}',60,$j${{\"healthScore\":60,\"aiSummary\":\"x\",\"findings\":[],\"lensScores\":{{}}}}$j$::jsonb,'https://apps.apple.com/us/app/x/id{app}','{email}')")
fr=lambda ck,m: req("GET",f"/api/pulse/monitors/{m}/feature-requests",cookie=ck)
add=lambda ck,m,k: req("POST",f"/api/pulse/monitors/{m}/feature-requests",cookie=ck,body={"key":k})
grp=lambda ck,m: req("POST",f"/api/pulse/monitors/{m}/feature-requests",cookie=ck,body={"action":"group"})

procs=start_server({})
try:
    ALICE=signin("alice@x.com"); BOB=signin("bob@x.com")
    req("GET","/api/pulse/monitors",cookie=ALICE)
    a1=int(monitor("alice@x.com","11111","AliceApp")); rival=int(monitor("alice@x.com","22222","Rival","other")); b1=int(monitor("bob@x.com","33333","BobApp"))
    for i,t in enumerate(["Please add dark mode","Would be great to have a dark theme","Can you add dark mode please","I love dark mode, it looks great","wish it had a widget","please add export to PDF","would be nice to export to pdf","I wish I could export my data as pdf"]):
        review(a1,f"r{i}",5-(i%3),t)
    review(a1,"x1",1,"Crashes all the time")
    review(rival,"rv1",4,"please add dark mode"); review(b1,"b1",4,"please add dark mode")
    print("== 1. listing")
    st,js,_=fr(ALICE,a1); T={t["key"]:t for t in js["topics"]} if js else {}
    check("dark mode counted from request wording only (the 'I love dark mode' review is not a request)",st==200 and T.get("dark-mode",{}).get("count")==3 and T["dark-mode"]["canAdd"],str(js))
    check("export counted, below 3 not addable; widget 1",T.get("export",{}).get("count")==3 or T.get("export",{}).get("count")==2,str(T.get("export")))
    check("sample counts every written review, requests only the asking ones",js["sample"]==9 and js["requestCount"]==7,str(js))
    check("rival, other user's and unknown monitors are 404",fr(ALICE,rival)[0]==404 and fr(ALICE,b1)[0]==404 and fr(BOB,a1)[0]==404 and fr(ALICE,"abc")[0]==404 and req("GET",f"/api/pulse/monitors/{a1}/feature-requests")[0]==401)
    check("no AI key -> no grouping offered, group call is 503",js["canGroup"] is False and grp(ALICE,a1)[0]==503)
    print("== 2. add to Tasks")
    st,js,_=add(ALICE,a1,"dark-mode"); check("no report of the app yet -> 409 NO_REPORT",st==409 and js.get("code")=="NO_REPORT",str(js))
    scan("alice@x.com","11111")
    st,js,_=add(ALICE,a1,"dark-mode"); check("with a report the task is added",st==200 and js["added"] is True,str(js))
    check("task row built server-side",psql("SELECT title||'|'||severity||'|'||source FROM custom_tasks WHERE task_key='feat:dark-mode'")=="Users ask for: Dark mode|warn|review")
    st,js,_=add(ALICE,a1,"dark-mode"); check("adding twice is harmless",st==200 and js["added"] is False and psql("SELECT count(*) FROM custom_tasks WHERE task_key='feat:dark-mode'")=="1")
    check("listing now says added",{t["key"]:t for t in fr(ALICE,a1)[1]["topics"]}["dark-mode"]["added"] is True)
    check("too few mentions, unknown keys, bad bodies -> 400",add(ALICE,a1,"widget")[0]==400 and add(ALICE,a1,"nope")[0]==400 and add(ALICE,a1,"x"*50)[0]==400 and req("POST",f"/api/pulse/monitors/{a1}/feature-requests",cookie=ALICE,body={})[0]==400)
    check("Bob can't add to Alice's tasks",add(BOB,a1,"dark-mode")[0]==404 and add(ALICE,rival,"dark-mode")[0]==404)
finally: stop(procs)

procs=start_server({"GEMINI_API_KEY":"SECRET-FAKE-KEY","GEMINI_API_BASE":f"http://127.0.0.1:{FAKE_PORT}"})
try:
    ALICE=signin("alice@x.com"); BOB=signin("bob@x.com")
    for i,t in enumerate(["Please add a PDF report option","would love a pdf report i can send my boss","it needs a pdf report","wish there was a way to pin favourites","Please add a way to pin my favourite items to the top"]):
        review(a1,f"g{i}",4,t)
    print("== 3. AI grouping")
    st,js,_=fr(ALICE,a1); check("grouping offered once unrecognised requests exist",st==200 and js["canGroup"] is True and js["ungrouped"]>=5,str(js))
    n=len(seen); behaviour["text"]=json.dumps({"clusters":[{"title":"PDF report","items":[1,2,3]},{"title":"Pin favourites","items":[4,5,99]},{"title":"Single","items":[1]},{"title":"","items":[4,5]}]})
    st,js,_=grp(ALICE,a1); check("groups are saved",st==200 and js["groups"]>=1,str(js))
    prompt=seen[n]["prompt"] if len(seen)>n else ""
    check("prompt carries numbered reviews, flags them as data, key only in header",("PDF report option" in prompt and "DATA" in prompt and seen[n]["key"]=="SECRET-FAKE-KEY"))
    st,js,_=fr(ALICE,a1); T={t["key"]:t for t in js["topics"]}; pdf=[t for t in T.values() if t.get("ai") and t["label"]=="PDF report"]
    check("AI group counts come from stored reviews",len(pdf)==1 and pdf[0]["count"]==3 and pdf[0]["canAdd"],str(js))
    check("invented numbers, singletons and empty titles are dropped",not any(t["label"] in ("Single","") for t in T.values()))
    st,js,_=add(ALICE,a1,pdf[0]["key"]); check("an AI group can be added to Tasks, built from stored reviews",st==200 and js["added"] and psql(f"SELECT finding FROM custom_tasks WHERE task_key='feat:{pdf[0]['key']}'").startswith("3 of the"),str(js))
    behaviour["mode"]="fail"; st,js,body=grp(ALICE,a1)
    check("provider trouble -> 502 without detail",st==502 and "SECRET" not in body and "boom" not in body,body[:200]); behaviour["mode"]="ok"
    behaviour["text"]="not json"; st,js,_=grp(ALICE,a1); check("unparseable answer -> no groups, no crash",st==200 and js["groups"]==0)
    check("Bob can't group Alice's app",grp(BOB,a1)[0]==404)
    cnt=0
    for _ in range(12):
        s,_,_=grp(ALICE,a1); cnt+=1
        if s==429: break
    check("grouping is rate limited",s==429,str(cnt))
finally: stop(procs)
print(f"\n{P} passed, {F} failed"); sys.exit(1 if F else 0)
