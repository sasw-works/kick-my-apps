import http.client, json, subprocess, urllib.parse, sys

PG=["psql","-h","127.0.0.1","-U","kma","-d","kma_test","-tA","-v","ON_ERROR_STOP=1"]
def psql(q):
    r=subprocess.run(PG+["-c",q],capture_output=True,text=True,env={"PGPASSWORD":"kma","PATH":"/usr/bin:/bin"})
    if r.returncode: raise RuntimeError(r.stderr)
    out=r.stdout.strip().splitlines(); return out[0] if out else ""

def req(m,p,cookie=None,body=None,form=None,headers=None):
    c=http.client.HTTPConnection("localhost",3111,timeout=30); h=dict(headers or {}); d=None
    if cookie:h["Cookie"]=cookie
    if body is not None: d=json.dumps(body); h["content-type"]="application/json"
    if form is not None: d=urllib.parse.urlencode(form); h["content-type"]="application/x-www-form-urlencoded"
    c.request(m,p,body=d,headers=h); r=c.getresponse(); t=r.read().decode("utf-8","ignore"); c.close()
    try: js=json.loads(t)
    except Exception: js=None
    return r.status,js,t

def signin(email,code="123456"):
    psql("""CREATE TABLE IF NOT EXISTS email_codes (email TEXT PRIMARY KEY, code TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, attempts INTEGER NOT NULL DEFAULT 0)""")
    psql(f"INSERT INTO email_codes VALUES ('{email}','123456',now()+interval '10 min',0) ON CONFLICT (email) DO UPDATE SET code='123456',expires_at=now()+interval '10 min',attempts=0")
    c=http.client.HTTPConnection("localhost",3111,timeout=20); c.request("GET","/api/auth/csrf"); r=c.getresponse()
    js=json.loads(r.read().decode()); ck=r.msg.get_all("Set-Cookie") or []; c.close()
    cc=next(x.split(";")[0] for x in ck if x.startswith("authjs.csrf-token"))
    c=http.client.HTTPConnection("localhost",3111,timeout=20)
    b=urllib.parse.urlencode({"csrfToken":js["csrfToken"],"email":email,"code":code,"callbackUrl":"http://localhost:3111/console","json":"true"})
    c.request("POST","/api/auth/callback/email-code",body=b,headers={"Cookie":cc,"content-type":"application/x-www-form-urlencoded"})
    r=c.getresponse(); r.read(); ck2=r.msg.get_all("Set-Cookie") or []; c.close()
    return next((x.split(";")[0] for x in ck2 if x.startswith("authjs.session-token")),None)

def mk_scan(cookie):
    st,js,_=req("POST","/api/history",cookie=cookie,body={"appName":"x","healthScore":70,"badCount":1,"warnCount":0,"goodCount":0,"resultJson":{},"storeUrl":""})
    return st,js

P=F=0
def check(n,c,d=""):
    global P,F
    if c: P+=1; print(f"  ok   {n}")
    else: F+=1; print(f"  FAIL {n}   {d}")

for t in ["scans","comparisons","pulse_monitors","pulse_snapshots","pulse_reviews","pulse_alerts","rate_limits","email_codes","users","accounts","sessions"]:
    try: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    except Exception: pass

print("== 1. account deletion now also removes Pulse monitors (and their cascaded rows) ==")
ALICE=signin("alice@x.com")
uid = psql("select id from users where email='alice@x.com'")
r=req("POST","/api/pulse/monitors",cookie=ALICE,body={"appId":"389801252","country":"us"})
mid = r[1]["monitor"]["id"] if r[1] and r[1].get("monitor") else None
check("(setup) alice has a real pulse monitor with snapshot data", mid and psql(f"select count(*) from pulse_snapshots where monitor_id={mid}")=="1", str(r[1])[:150])
req("DELETE","/api/account/delete",cookie=ALICE)
check("her monitor is gone after deleting her account", psql(f"select count(*) from pulse_monitors where user_email='alice@x.com'")=="0")
check("its snapshots cascaded away too (no orphaned rows)", psql(f"select count(*) from pulse_snapshots where monitor_id={mid}")=="0")

print("== 2. account/me and update-name now die immediately when the account no longer exists ==")
BOB=signin("bob@x.com")
bob_id = psql("select id from users where email='bob@x.com'")
st,js,_=req("GET","/api/account/me",cookie=BOB)
check("bob's /api/account/me works while he exists", st==200, f"{st} {js}")
psql(f"delete from users where id={bob_id}")
st,js,_=req("GET","/api/account/me",cookie=BOB)
check("...and returns 401 the instant his row is gone (old JWT, no re-signin)", st==401, f"{st} {js}")
st,js,_=req("POST","/api/account/update-name",cookie=BOB,body={"name":"New Name"})
check("update-name also refuses (was: silently updated 0 rows and said ok:true)", st==401, f"{st} {js}")

print("== 3. /api/history enforces the report limit directly, not just /api/analyze ==")
CAROL=signin("carol@x.com")
st1,js1=mk_scan(CAROL); st2,js2=mk_scan(CAROL)
check("(setup) 2 reports saved directly via /api/history (Free limit is 2)", st1==200 and st2==200)
st3,js3=mk_scan(CAROL)
check("a 3rd direct call to /api/history is blocked, even bypassing /api/analyze entirely", st3==403 and js3.get("code")=="PLAN_LIMIT", f"{st3} {js3}")
check("...and no 3rd row was written", psql("select count(*) from scans where user_email='carol@x.com'")=="2")

print("== 4. search-app and app-icon now rate-limit by IP (previously unlimited, no auth at all) ==")
psql("truncate rate_limits")
IP={"x-forwarded-for":"203.0.113.50"}
statuses=[req("GET","/api/search-app?term=insta",headers=IP)[0] for _ in range(61)]
check("60 requests/min allowed, the 61st is refused", statuses[:60]==[200]*60 and statuses[60]==429, f"last 3: {statuses[-3:]}")
psql("truncate rate_limits")
statuses2=[req("GET","/api/app-icon?storeUrl=https://apps.apple.com/us/app/x/id1",headers=IP)[0] for _ in range(61)]
check("same for app-icon", statuses2[:60]==[200]*60 and statuses2[60]==429, f"last 3: {statuses2[-3:]}")
check("a different IP is unaffected by the first one's limit", req("GET","/api/search-app?term=insta",headers={"x-forwarded-for":"198.51.100.9"})[0]==200)

print(f"\nRESULT: {P} passed, {F} failed"); sys.exit(1 if F else 0)
