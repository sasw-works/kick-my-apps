import http.client, json, subprocess, urllib.parse, sys, threading, time, os, signal
from http.server import BaseHTTPRequestHandler, HTTPServer

# The Console bell: /api/notifications and the events that feed it. Starts its own app server on port 3112.
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

for t in ["app_notifications","scans","rate_limits","email_codes","users","accounts","sessions"]:
    try: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    except Exception: pass

proc=start_server({})
try:
    A=signin("alice@x.com"); B=signin("bob@x.com")
    s,js,_=req("GET","/api/notifications"); check("signed-out is 401",s==401)
    s,js,_=req("GET","/api/notifications",A); check("starts empty",s==200 and js["items"]==[] and js["unread"]==0,str(js))
    # saving a report tells the owner
    s,js,_=req("POST","/api/history",A,{"appName":"Spotify","healthScore":72,"badCount":2,"warnCount":1,"goodCount":3,"resultJson":{"healthScore":72,"findings":[]}})
    check("report saved",s==200,str(js)); rid=js["id"]
    s,js,_=req("GET","/api/notifications",A)
    it=js["items"][0] if js["items"] else {}
    check("saving a report adds a notification with a link to it",js["unread"]==1 and it.get("kind")=="report" and it.get("href")==f"/console/reports/{rid}" and "Spotify" in it.get("title",""),str(js))
    check("it is not shown to anyone else",req("GET","/api/notifications",B)[1]["items"]==[])
    psql("INSERT INTO app_notifications (user_email,kind,title,href) VALUES ('alice@x.com','alert_warn','Second','/console'),('alice@x.com','rival','Third','/console')")
    s,js,_=req("GET","/api/notifications",A); check("newest first, 3 unread",js["unread"]==3 and js["items"][0]["title"]=="Third",str(js))
    ids=[x["id"] for x in js["items"]]
    # bob cannot mark alice's rows
    req("POST","/api/notifications",B,{"ids":ids}); req("POST","/api/notifications",B,{"all":True})
    check("another account cannot mark them read",req("GET","/api/notifications",A)[1]["unread"]==3)
    s,js,_=req("POST","/api/notifications",A,{"ids":[ids[0]]}); check("marking one read lowers the count",s==200 and js["unread"]==2,str(js))
    check("bad body is rejected",req("POST","/api/notifications",A,{})[0]==400 and req("POST","/api/notifications",A,{"ids":["x"]})[1]["unread"]==2)
    s,js,_=req("POST","/api/notifications",A,{"all":True}); check("mark all read",js["unread"]==0 and all(x["read"] for x in req("GET","/api/notifications",A)[1]["items"]))
    # the list stays bounded
    psql("INSERT INTO app_notifications (user_email,kind,title) SELECT 'alice@x.com','report','x'||g FROM generate_series(1,120) g")
    req("POST","/api/history",A,{"appName":"Another","healthScore":50,"resultJson":{"healthScore":50,"findings":[]}})
    check("at most 100 are kept per account",psql("SELECT count(*) FROM app_notifications WHERE user_email='alice@x.com'")=="100")
    s,js,_=req("DELETE","/api/notifications",A); check("clear all",s==200 and req("GET","/api/notifications",A)[1]["items"]==[])
    # account deletion removes them
    req("POST","/api/history",B,{"appName":"Mine","healthScore":60,"resultJson":{"healthScore":60,"findings":[]}})
    check("bob has one",psql("SELECT count(*) FROM app_notifications WHERE user_email='bob@x.com'")=="1")
    s,_,_=req("DELETE","/api/account/delete",B)
    check("deleting the account removes its notifications",s==200 and psql("SELECT count(*) FROM app_notifications WHERE user_email='bob@x.com'")=="0")
finally: stop(proc)

print(f"\n{P} passed, {F} failed"); sys.exit(1 if F else 0)
