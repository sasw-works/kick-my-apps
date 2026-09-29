import http.client, json, subprocess, urllib.parse, sys

PG=["psql","-h","127.0.0.1","-U","kma","-d","kma_test","-tA","-v","ON_ERROR_STOP=1"]
def psql(q):
    r=subprocess.run(PG+["-c",q],capture_output=True,text=True,env={"PGPASSWORD":"kma","PATH":"/usr/bin:/bin"})
    if r.returncode: raise RuntimeError(r.stderr)
    out=r.stdout.strip().splitlines(); return out[0] if out else ""

def req(m,p,cookie=None,body=None,form=None):
    c=http.client.HTTPConnection("localhost",3111,timeout=30); h={}; d=None
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
    body=urllib.parse.urlencode({"csrfToken":js["csrfToken"],"email":email,"code":code,"callbackUrl":"http://localhost:3111/console","json":"true"})
    c.request("POST","/api/auth/callback/email-code",body=body,headers={"Cookie":cc,"content-type":"application/x-www-form-urlencoded"})
    r=c.getresponse(); r.read(); ck2=r.msg.get_all("Set-Cookie") or []; c.close()
    return next((x.split(";")[0] for x in ck2 if x.startswith("authjs.session-token")),None)

def mk_scan(cookie, name):
    st,js,_=req("POST","/api/history",cookie=cookie,body={"appName":name,"healthScore":70,"badCount":1,"warnCount":0,"goodCount":0,"resultJson":{},"storeUrl":""})
    return js["id"] if st==200 and js else None

P=F=0
def check(n,c,d=""):
    global P,F
    if c: P+=1; print(f"  ok   {n}")
    else: F+=1; print(f"  FAIL {n}   {d}")

for t in ["scans","comparisons","pulse_monitors","rate_limits","email_codes","users","accounts","sessions"]:
    try: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    except Exception: pass

ADMIN=signin("admin@x.com"); ALICE=signin("alice@x.com")
check("both sign in", ADMIN and ALICE)

print("== 1. /api/account/usage: admin sees unlimited, alice sees real Free limits ==")
st,js,_=req("GET","/api/account/usage",cookie=ADMIN)
check("admin: reports limit is null (unlimited)", js["reports"]["limit"] is None, str(js))
check("admin: comparisons limit is null", js["comparisons"]["limit"] is None, str(js))
check("admin: pulse limit is null", js["pulse"]["limit"] is None, str(js))
st,js,_=req("GET","/api/account/usage",cookie=ALICE)
check("alice: still sees the real Free limits (2 reports, 1 comparison, 1 pulse)", js["reports"]["limit"]==2 and js["comparisons"]["limit"]==1 and js["pulse"]["limit"]==1, str(js))

print("== 2. admin can exceed what would be alice's report limit ==")
for i in range(5):
    mk_scan(ADMIN, f"AdminApp{i}")
check("(setup) admin has 5 scans this month (Free limit is only 2)", psql("select count(*) from scans where user_email='admin@x.com'")=="5")
st,js,txt=req("POST","/api/analyze",cookie=ADMIN,form={"appName":"one more"})
check("a 6th analysis attempt is NOT blocked by the plan limit", (js or {}).get("code") != "PLAN_LIMIT", f"{st} {txt[:150]}")

print("== 3. admin can exceed what would be alice's comparison limit ==")
ids = [mk_scan(ADMIN, f"CmpAdmin{i}") for i in range(3)]
st,js,_=req("POST","/api/history/compare",cookie=ADMIN,body={"scanIdA":ids[0],"scanIdB":ids[1],"appNameA":"A","appNameB":"B"})
check("comparison #1 succeeds", st==200 and js.get("id"))
st2,js2,txt2=req("POST","/api/history/compare",cookie=ADMIN,body={"scanIdA":ids[0],"scanIdB":ids[2],"appNameA":"A","appNameB":"C"})
check("comparison #2 (would be blocked at Free's limit of 1) is NOT blocked for admin", st2==200 and js2.get("id"), f"{st2} {txt2[:150]}")

print("== 4. alice (non-admin) is still genuinely limited -- the exemption didn't break enforcement ==")
mk_scan(ALICE,"A1"); mk_scan(ALICE,"A2")
st,js,txt=req("POST","/api/analyze",cookie=ALICE,form={"appName":"x"})
check("alice IS blocked at her real limit (2)", st==403 and js.get("code")=="PLAN_LIMIT", f"{st} {txt[:150]}")

print(f"\nRESULT: {P} passed, {F} failed"); sys.exit(1 if F else 0)
