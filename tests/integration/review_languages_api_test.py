import http.client, json, subprocess, urllib.parse, sys, threading, time, os, signal
from http.server import BaseHTTPRequestHandler, HTTPServer

# The review language breakdown is tested against a local stand-in for Gemini (GEMINI_API_BASE), so it needs no real
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
seen=[]; behaviour={"mode":"ok","text":"{}","fail_next":0}
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

def monitor(email,app,name,kind="mine"):
    return psql(f"INSERT INTO pulse_monitors (user_email,app_id,country,app_name,developer,kind,alerts_enabled) VALUES ('{email}','{app}','us','{name}','Acme','{kind}',true) RETURNING id")
def review(mid,rid,rating,text,days_ago=1,how=None):
    h=f"'{how}'" if how else "NULL"; ha="now()-interval '1 hour'" if how else "NULL"
    psql(f"INSERT INTO pulse_reviews (monitor_id,review_id,rating,title,content,version,reviewed_at,handled_how,handled_at) VALUES ({mid},'{rid}',{rating},'',$t${text}$t$,'1.0',now()-interval '{days_ago} days',{h},{ha})")


lg=lambda ck,m: req("GET",f"/api/pulse/monitors/{m}/languages",cookie=ck)
procs=start_server({})
try:
    ALICE=signin("alice@x.com"); BOB=signin("bob@x.com")
    req("GET","/api/pulse/monitors",cookie=ALICE)
    a1=int(monitor("alice@x.com","11111","AliceApp")); rival=int(monitor("alice@x.com","22222","Rival","other")); b1=int(monitor("bob@x.com","33333","BobApp")); empty=int(monitor("alice@x.com","44444","Empty"))
    for i in range(6): review(a1,f"e{i}",5,"This app is very good and I love it")
    for i in range(5): review(a1,f"t{i}",1,"Uygulama çok güzel ama çalışmıyor")
    review(a1,"u1",3,"ok"); review(rival,"rv",1,"This app is very good and I love it"); review(b1,"b",1,"Uygulama çok güzel ama çalışmıyor")
    print("== languages")
    st,js,_=lg(ALICE,a1); R={r["code"]:r for r in js["rows"]} if js else {}
    check("counts per language from stored reviews",st==200 and R["en"]["count"]==6 and R["tr"]["count"]==5 and js["sample"]==12 and js["unclear"]==1,str(js))
    check("average rating and gap versus all",R["tr"]["avgRating"]==1 and R["en"]["avgRating"]==5 and R["tr"]["gap"]<-0.5)
    check("rival, other user's, unknown and signed-out are refused",lg(ALICE,rival)[0]==404 and lg(ALICE,b1)[0]==404 and lg(BOB,a1)[0]==404 and lg(ALICE,"abc")[0]==404 and req("GET",f"/api/pulse/monitors/{a1}/languages")[0]==401)
    st,js,_=lg(ALICE,empty); check("an app with no reviews -> empty list, not an error",st==200 and js["rows"]==[] and js["sample"]==0)
finally: stop(procs)
print(f"\n{P} passed, {F} failed"); sys.exit(1 if F else 0)
