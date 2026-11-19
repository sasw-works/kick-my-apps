import http.client, json, subprocess, urllib.parse, sys, threading, time, os, signal
from http.server import BaseHTTPRequestHandler, HTTPServer

# Account webhook settings API against a local receiver. Starts its own app server on port 3112:
# once normally (SSRF rules active), once with WEBHOOK_ALLOW_PRIVATE=1 so a local receiver can be used.
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


RECV=3998
got=[]; rstatus={"v":200}
class H(BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def do_POST(self):
        b=json.loads(self.rfile.read(int(self.headers.get("content-length",0))) or b"{}")
        got.append({"path":self.path,"body":b}); self.send_response(rstatus["v"]); self.end_headers()
httpd=HTTPServer(("127.0.0.1",RECV),H); threading.Thread(target=httpd.serve_forever,daemon=True).start()
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


for t in ["notification_channels","rate_limits","email_codes","users","accounts","sessions","pulse_monitors"]:
    try: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    except Exception: pass
URL=f"http://127.0.0.1:{RECV}/hook/SECRETTOKEN1234"

print("== A. SSRF rules (normal server)")
proc=start_server({})
try:
    A=signin("alice@x.com")
    check("anonymous GET 401",req("GET","/api/account/notifications")[0]==401)
    check("anonymous PUT 401",req("PUT","/api/account/notifications",body={"url":"https://example.com/x"})[0]==401)
    check("anonymous POST 401",req("POST","/api/account/notifications")[0]==401)
    check("anonymous DELETE 401",req("DELETE","/api/account/notifications")[0]==401)
    s,js,_=req("GET","/api/account/notifications",A); check("no channel yet",s==200 and js["channel"] is None,str(js))
    for bad in ["http://example.com/x","https://127.0.0.1/x","https://localhost/x","https://169.254.169.254/x","https://[::1]/x","https://a:b@example.com/x","nonsense",""]:
        s,js,_=req("PUT","/api/account/notifications",A,{"url":bad}); check(f"refused: {bad or '(empty)'}",s==400 and js.get("code")=="BAD_URL",f"{s} {js}")
    s,js,_=req("PUT","/api/account/notifications",A,{"url":"https://example.com/x","kind":"slack"}); check("slack kind on a foreign host refused",s==400)
    s,js,_=req("PUT","/api/account/notifications",A,{"url":"https://hooks.slack.com/services/T000/B000/XXXXSECRET"})
    check("slack url saved, kind detected, url masked in the answer",s==200 and js["channel"]["kind"]=="slack" and "XXXXSECRET" not in json.dumps(js) and js["channel"]["urlMasked"].startswith("https://hooks.slack.com/"),str(js))
    s,js,t=req("GET","/api/account/notifications",A); check("GET never returns the full url",s==200 and "XXXXSECRET" not in t and "services/T000" not in t)
    check("bob does not see alice's channel",req("GET","/api/account/notifications",signin("bob@x.com"))[1]["channel"] is None)
    s,js,_=req("DELETE","/api/account/notifications",A); check("delete works",s==200 and req("GET","/api/account/notifications",A)[1]["channel"] is None)
    s,js,_=req("POST","/api/account/notifications",A); check("test without a channel is 404",s==404 and js.get("code")=="NO_CHANNEL")
finally: stop(proc)

print("== B. saving, testing, replacing (local receiver allowed)")
proc=start_server({"WEBHOOK_ALLOW_PRIVATE":"1"})
try:
    A=signin("alice@x.com"); B=signin("bob@x.com")
    s,js,_=req("PUT","/api/account/notifications",A,{"url":URL,"kind":"slack"}); check("saved as slack",s==200 and js["channel"]["kind"]=="slack",str(js))
    s,js,_=req("POST","/api/account/notifications",A)
    check("test message delivered in slack shape",s==200 and len(got)==1 and got[0]["path"]=="/hook/SECRETTOKEN1234" and got[0]["body"]["text"].startswith("*Kick My Apps test message*"),str((s,js,got)))
    ch=req("GET","/api/account/notifications",A)[1]["channel"]; check("last delivery recorded ok",ch["lastOk"] is True and ch["lastSentAt"])
    rstatus["v"]=500
    s,js,t=req("POST","/api/account/notifications",A); check("receiver failure -> 502 with a plain message, no receiver detail",s==502 and js.get("code")=="DELIVERY_FAILED" and "500" in js["error"],str((s,js)))
    ch=req("GET","/api/account/notifications",A)[1]["channel"]; check("failure shown in settings",ch["lastOk"] is False and ch["lastError"])
    rstatus["v"]=200
    s,js,_=req("PUT","/api/account/notifications",A,{"url":URL+"b","kind":"discord"}); check("replacing keeps one channel per account and resets status",s==200 and js["channel"]["kind"]=="discord" and js["channel"]["lastOk"] is None)
    check("one row only",psql("SELECT count(*) FROM notification_channels WHERE user_email='alice@x.com'")=="1")
    check("bob's channel is separate",req("PUT","/api/account/notifications",B,{"url":URL+"c","kind":"generic"})[0]==200 and psql("SELECT count(*) FROM notification_channels")=="2")
    n=len(got); req("POST","/api/account/notifications",B); check("bob's test goes only to bob's url",got[-1]["path"].endswith("c") and len(got)==n+1)
    # rate limit on tests: 10 per hour per user (bob used 1)
    codes=[req("POST","/api/account/notifications",B)[0] for _ in range(11)]; check("test messages are rate limited",429 in codes,str(codes))
    # account deletion removes the channel
    s,_,_=req("DELETE","/api/account/delete",A)
    check("deleting the account removes its channel (and only that one)",s==200 and psql("SELECT count(*) FROM notification_channels WHERE user_email='alice@x.com'")=="0" and psql("SELECT count(*) FROM notification_channels")=="1")
finally: stop(proc)

print(f"\n{P} passed, {F} failed"); sys.exit(1 if F else 0)
