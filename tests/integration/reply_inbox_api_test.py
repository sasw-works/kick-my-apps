import http.client, json, subprocess, urllib.parse, sys, threading, time, os, signal
from http.server import BaseHTTPRequestHandler, HTTPServer

# The reply inbox is tested (with bulk drafts) against a local stand-in for Gemini (GEMINI_API_BASE), so it needs no real
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

for t in ["pulse_alerts","pulse_reviews","pulse_snapshots","pulse_monitors","rate_limits","email_codes","users","accounts","sessions"]:
    try: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    except Exception: pass
def monitor(email,app,name,kind="mine"):
    return psql(f"INSERT INTO pulse_monitors (user_email,app_id,country,app_name,developer,kind,alerts_enabled) VALUES ('{email}','{app}','us','{name}','Acme','{kind}',true) RETURNING id")
def review(mid,rid,rating,text,days_ago=1,how=None):
    h=f"'{how}'" if how else "NULL"; ha="now()-interval '1 hour'" if how else "NULL"
    psql(f"INSERT INTO pulse_reviews (monitor_id,review_id,rating,title,content,version,reviewed_at,handled_how,handled_at) VALUES ({mid},'{rid}',{rating},'',$t${text}$t$,'1.0',now()-interval '{days_ago} days',{h},{ha})")
inbox=lambda ck: req("GET","/api/pulse/inbox",cookie=ck)
mark=lambda ck,**b: req("PATCH","/api/pulse/inbox",cookie=ck,body=b)

procs=start_server({})
try:
    ALICE=signin("alice@x.com"); BOB=signin("bob@x.com"); CAROL=signin("carol@x.com")
    req("GET","/api/pulse/monitors",cookie=ALICE)
    a1=int(monitor("alice@x.com","11111","AliceApp")); a2=int(monitor("alice@x.com","com.alice.game","AliceGame")); rival=int(monitor("alice@x.com","22222","Rival","other")); b1=int(monitor("bob@x.com","33333","BobApp"))
    review(a1,"one",1,"Crashes on launch",2); review(a1,"two",2,"Too many ads",5); review(a1,"three",3,"It is okay but slow",1)
    review(a1,"five",5,"Love it"); review(a1,"blank",1,"",1)
    review(a1,"old",1,"Ancient complaint",90)
    review(a1,"done",1,"Already answered",3,"replied"); review(a1,"skip",1,"Not worth it",3,"skipped"); review(a2,"play",1,"Play: bad update",1)
    review(a2,"playdone",2,"Play: replied in the store",2,"store")
    review(rival,"rv",1,"Rival's bad review",1); review(b1,"bob",1,"Bob's bad review",1)

    print("== 1. the inbox")
    st,js,_=inbox(ALICE)
    ids=[x["reviewId"] for x in js["open"]]
    check("1-3 star reviews with text of HER apps, still open, within 60 days; worst first (then newest)",st==200 and ids==["play","one","two","three"],f"{st} {ids}")
    check("not shown: 4-5 stars, no text, older than 60 days, answered, skipped, store-replied, rivals', other people's",not set(ids)&{"five","blank","old","done","skip","playdone","rv","bob"})
    check("each item names the app, version, age and monitor",js["open"][0]["appName"] and js["open"][0]["monitorId"] in (a1,a2) and isinstance(js["open"][0]["ageDays"],int) and js["watching"]==2 and js["openTotal"]==4)
    s=js["stats"]; check("stats: 7 low reviews with text in 30 days; 2 answered (1 marked, 1 by the store); the skipped one is left out of the rate (2 of 6)",s["windowDays"]==30 and s["lowTotal"]==7 and s["replied"]==2 and s["rate"]==33,str(s))
    check("median time to reply only counts replies she marked herself",s["medianHours"] is not None and s["medianHours"]>=70,str(s))
    check("bob only sees his own",[x["reviewId"] for x in inbox(BOB)[1]["open"]]==["bob"])
    check("carol (no apps) gets an empty inbox and watching 0",inbox(CAROL)[1]["watching"]==0 and inbox(CAROL)[1]["open"]==[])
    check("anonymous -> 401",req("GET","/api/pulse/inbox")[0]==401 and req("PATCH","/api/pulse/inbox",body={})[0]==401 and req("POST","/api/pulse/inbox/drafts",body={})[0]==401)

    print("== 2. marking")
    check("bad input -> 400",all(mark(ALICE,**b)[0]==400 for b in [{},{"monitorId":a1,"reviewId":"one"},{"monitorId":a1,"reviewId":"one","status":"deleted"},{"monitorId":"x","reviewId":"one","status":"replied"},{"monitorId":a1,"reviewId":"","status":"replied"}]))
    check("someone else's or a rival's review -> 404",mark(ALICE,monitorId=b1,reviewId="bob",status="replied")[0]==404 and mark(ALICE,monitorId=rival,reviewId="rv",status="replied")[0]==404 and mark(BOB,monitorId=a1,reviewId="one",status="replied")[0]==404)
    check("unknown review -> 404",mark(ALICE,monitorId=a1,reviewId="nope",status="replied")[0]==404)
    check("mark replied: it leaves the inbox and counts in the stats",mark(ALICE,monitorId=a1,reviewId="one",status="replied")[0]==200 and "one" not in [x["reviewId"] for x in inbox(ALICE)[1]["open"]] and inbox(ALICE)[1]["stats"]["replied"]==3)
    check("the stored mark is 'replied' with a time",psql("SELECT handled_how||(handled_at IS NOT NULL)::text FROM pulse_reviews WHERE review_id='one'")=="repliedtrue")
    mark(ALICE,monitorId=a1,reviewId="two",status="skipped"); check("skip: leaves the inbox, and isn't counted against the reply rate",inbox(ALICE)[1]["openTotal"]==2 and inbox(ALICE)[1]["stats"]["rate"] is not None)
    check("reopen brings her own mark back",mark(ALICE,monitorId=a1,reviewId="two",status="open")[0]==200 and "two" in [x["reviewId"] for x in inbox(ALICE)[1]["open"]])
    check("a reply the STORE reported can't be reopened or overwritten by a mark",mark(ALICE,monitorId=a2,reviewId="playdone",status="open")[0]==200 and psql("SELECT handled_how FROM pulse_reviews WHERE review_id='playdone'")=="store" and mark(ALICE,monitorId=a2,reviewId="playdone",status="skipped")[0]==200 and psql("SELECT handled_how FROM pulse_reviews WHERE review_id='playdone'")=="store")
finally: stop(procs)

procs=start_server({"GEMINI_API_KEY":"SECRET-FAKE-KEY","GEMINI_API_BASE":f"http://127.0.0.1:{FAKE_PORT}"})
try:
    ALICE=signin("alice@x.com"); BOB=signin("bob@x.com")
    for i in range(7): review(a1,f"bulk{i}",1,f"Bulk complaint {i}",1)
    drafts=lambda ck,items: req("POST","/api/pulse/inbox/drafts",cookie=ck,body={"items":items})
    it=lambda rid,m=None: {"monitorId":m or a1,"reviewId":rid}
    print("== 3. bulk drafts")
    behaviour["text"]="Thanks for telling us, we are on it."
    n=len(seen); st,js,_=drafts(ALICE,[it("bulk0"),it("bulk1"),it("three")])
    check("one draft per review, in order",st==200 and [r["reviewId"] for r in js["results"]]==["bulk0","bulk1","three"] and all(r.get("reply")=="Thanks for telling us, we are on it." for r in js["results"]) and len(seen)==n+3,f"{st} {js}")
    check("each prompt carries its own review text",any("Bulk complaint 0" in x["prompt"] for x in seen[n:]) and any("slow" in x["prompt"] for x in seen[n:]))
    check("the key only travels in the header",all(x["key"]=="SECRET-FAKE-KEY" for x in seen[n:]))
    check("more than 5, none, or malformed -> 400",drafts(ALICE,[it(f"bulk{i}") for i in range(6)])[0]==400 and drafts(ALICE,[])[0]==400 and drafts(ALICE,[{"monitorId":"a","reviewId":"x"}])[0]==400 and drafts(ALICE,[{"monitorId":a1}])[0]==400 and req("POST","/api/pulse/inbox/drafts",cookie=ALICE,body={})[0]==400)
    st,js,_=drafts(ALICE,[it("bulk2"),it("bob",b1),it("rv",rival),it("nope")])
    check("someone else's, a rival's and unknown reviews get an error entry, not a draft",st==200 and js["results"][0].get("reply") and all("error" in r for r in js["results"][1:]),str(js))
    behaviour["mode"]="fail"; st,js,body=drafts(ALICE,[it("bulk3")])
    check("provider trouble is reported per review without detail",st==200 and js["results"][0]["error"]=="Couldn't write a draft." and "SECRET" not in body and "boom" not in body,body[:200]); behaviour["mode"]="ok"
    behaviour["text"]="   "; check("an empty answer is an error entry, not an empty draft",drafts(ALICE,[it("bulk4")])[1]["results"][0].get("error")); behaviour["text"]="ok reply"
    check("Bob can't draft for Alice's review",drafts(BOB,[it("bulk5")])[1]["results"][0].get("error")=="Review not found.")
    used=0
    for _ in range(10):
        st,js,_=drafts(ALICE,[it("bulk0"),it("bulk1"),it("bulk2"),it("bulk3"),it("bulk4")])
        used+=sum(1 for r in js["results"] if r.get("reply"))
    check("shares the 30-per-hour allowance with single drafts: stops at the limit and says so",any(r.get("error","").startswith("Hourly limit") for r in js["results"]) and used<=30,f"{used} {js}")
finally: stop(procs)
print(f"\n{P} passed, {F} failed"); sys.exit(1 if F else 0)
