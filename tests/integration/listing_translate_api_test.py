import http.client, json, subprocess, urllib.parse, sys, threading, time, os, signal
from http.server import BaseHTTPRequestHandler, HTTPServer

# Listing translation is tested against a local stand-in for Gemini (GEMINI_API_BASE), so it needs no real
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

tr=lambda ck,b: req("POST","/api/listing/translate",cookie=ck,body=b)
GOOD={"store":"apple","language":"tr","fields":{"name":"Plan Week","keywords":"plan,week","description":"Plan your week with your team."}}

procs=start_server({})
try:
    ALICE=signin("alice@x.com")
    print("== 1. no AI key")
    check("signed out -> 401",req("POST","/api/listing/translate",body=GOOD)[0]==401)
    check("bad input is 400 before anything else",tr(ALICE,{**GOOD,"language":"xx"})[0]==400 and tr(ALICE,{**GOOD,"store":"x"})[0]==400 and tr(ALICE,{**GOOD,"fields":{}})[0]==400 and tr(ALICE,{})[0]==400)
    check("valid request without a key -> 503",tr(ALICE,GOOD)[0]==503)
finally: stop(procs)

procs=start_server({"GEMINI_API_KEY":"SECRET-FAKE-KEY","GEMINI_API_BASE":f"http://127.0.0.1:{FAKE_PORT}"})
try:
    ALICE=signin("alice@x.com")
    print("== 2. translating")
    behaviour["text"]=json.dumps({"fields":{"name":"Hafta Plani","keywords":"plan, hafta","description":"Haftani ekibinle planla.","subtitle":"nope"}})
    n=len(seen); st,js,_=tr(ALICE,GOOD)
    check("fields come back, keywords normalised, unrequested dropped",st==200 and js["fields"]["name"]=="Hafta Plani" and js["fields"]["keywords"]=="plan,hafta" and "subtitle" not in js["fields"] and js["over"]==[] and js["language"]=="Turkish",str(js))
    check("prompt has the language, limits and the user's text; key only in header",len(seen)==n+1 and "Turkish" in seen[n]["prompt"] and "at most 30 characters" in seen[n]["prompt"] and "Plan your week with your team." in seen[n]["prompt"] and seen[n]["key"]=="SECRET-FAKE-KEY")
    behaviour["text"]=json.dumps({"fields":{"name":"x"*31}}); st,js,_=tr(ALICE,GOOD)
    check("over-limit field is flagged",st==200 and js["over"]==["name"],str(js))
    behaviour["mode"]="fail"; st,js,body=tr(ALICE,GOOD)
    check("provider failure -> 502 with no provider detail",st==502 and "SECRET" not in body and "boom" not in body,body[:200]); behaviour["mode"]="ok"
    behaviour["text"]="not json"; check("unusable answer -> 502",tr(ALICE,GOOD)[0]==502)
    behaviour["text"]=json.dumps({"fields":{"name":"ok"}})
    last=0
    for _ in range(25):
        last=tr(ALICE,GOOD)[0]
        if last==429: break
    check("rate limited after 20 an hour",last==429)
finally: stop(procs)
print(f"\n{P} passed, {F} failed"); sys.exit(1 if F else 0)
