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

def seed_scan(email, name):
    # Bypasses /api/history's own report-limit check on purpose: this is test setup (we need scans
    # to exist so we can test the COMPARISONS limit), not a test of the reports limit itself.
    return psql(f"insert into scans (app_name, health_score, user_email, result_json) values ('{name}', 70, '{email}', '{{}}') returning id")

def mk_scan(cookie, name):
    rj = {"healthScore": 70, "findings": []}
    st,js,_=req("POST","/api/history",cookie=cookie,body={"appName":name,"healthScore":70,"badCount":1,"warnCount":0,"good_count":0,"goodCount":0,"resultJson":rj,"storeUrl":""})
    return js["id"] if st==200 and js else None

P=F=0
def check(n,c,d=""):
    global P,F
    if c: P+=1; print(f"  ok   {n}")
    else: F+=1; print(f"  FAIL {n}   {d}")

for t in ["scans","comparisons","rate_limits","email_codes","users","accounts","sessions"]:
    try: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    except Exception: pass

ALICE=signin("alice@x.com"); BOB=signin("bob@x.com")
check("both sign in", ALICE and BOB)

print("== 1. reports limit (Free plan: 2/month) ==")
# no AI key in this sandbox, so a request that CLEARS the plan-limit check fails later (500, missing
# key) -- that itself proves the limit check ran and passed. A request that's blocked by the limit
# must return 403+PLAN_LIMIT BEFORE ever reaching the missing-key check.
st1,js1,_=req("POST","/api/analyze",cookie=ALICE,form={"appName":"x"})
check("analysis #1 (under the limit) is NOT blocked by the plan limit", (js1 or {}).get("code") != "PLAN_LIMIT", f"{st1} {js1}")
mk_scan(ALICE,"AliceApp1")  # simulate the report actually being saved (as the real flow would after a successful analysis)
st2,js2,_=req("POST","/api/analyze",cookie=ALICE,form={"appName":"x"})
check("analysis #2 (still under the limit -- 1 saved so far, limit 2) is NOT blocked", (js2 or {}).get("code") != "PLAN_LIMIT", f"{st2} {js2}")
mk_scan(ALICE,"AliceApp2")  # now 2 saved this month == the Free limit
st3,js3,txt3=req("POST","/api/analyze",cookie=ALICE,form={"appName":"x"})
check("analysis #3 (2 already saved, limit 2) IS blocked", st3==403 and js3.get("code")=="PLAN_LIMIT", f"{st3} {txt3[:200]}")
check("the message is a real sentence, not a code", "report" in js3["error"].lower() and "2" in js3["error"])
check("bob is completely unaffected by alice's usage (owner-scoped)", req("POST","/api/analyze",cookie=BOB,form={"appName":"x"})[1].get("code") != "PLAN_LIMIT")

print("== 2. comparisons limit (Free plan: 1/month) ==")
a1 = seed_scan("alice@x.com","CompareA"); a2 = seed_scan("alice@x.com","CompareB"); a3 = seed_scan("alice@x.com","CompareC")
check("(setup) three scans created for alice", all([a1,a2,a3]))
st,js,_=req("POST","/api/history/compare",cookie=ALICE,body={"scanIdA":a1,"scanIdB":a2,"appNameA":"A","appNameB":"B"})
check("comparison #1 (under the limit of 1) succeeds", st==200 and js.get("id"), f"{st} {js}")
st2,js2,txt2=req("POST","/api/history/compare",cookie=ALICE,body={"scanIdA":a1,"scanIdB":a3,"appNameA":"A","appNameB":"C"})
check("comparison #2 (1 already saved, limit 1) IS blocked", st2==403 and js2.get("code")=="PLAN_LIMIT", f"{st2} {txt2[:200]}")
check("...and nothing new was inserted", psql("select count(*) from comparisons where user_email='alice@x.com'")=="1")
check("the limit check runs even before ownership would matter: bob's own comparisons are separate", req("POST","/api/history/compare",cookie=BOB,body={"scanIdA":99999,"scanIdB":99998})[1].get("code") != "PLAN_LIMIT")

print("== 3. resets next calendar month ==")
psql("update scans set created_at = now() - interval '35 days' where user_email='alice@x.com'")
psql("update comparisons set created_at = now() - interval '35 days' where user_email='alice@x.com'")
st,js,_=req("POST","/api/analyze",cookie=ALICE,form={"appName":"x"})
check("reports: last month's scans don't count against this month's limit", (js or {}).get("code") != "PLAN_LIMIT", f"{st} {js}")
st,js,_=req("POST","/api/history/compare",cookie=ALICE,body={"scanIdA":a1,"scanIdB":a2,"appNameA":"A","appNameB":"B"})
check("comparisons: same reset applies", st==200 and js.get("id"), f"{st} {js}")

print("== 4. /api/account/usage reports real, current numbers ==")
for t in ["scans","comparisons"]: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
seed_scan("alice@x.com","U1"); seed_scan("alice@x.com","U2")
a1=seed_scan("alice@x.com","U3"); a2=seed_scan("alice@x.com","U4")
psql(f"insert into comparisons (scan_id_a,scan_id_b,app_name_a,app_name_b,user_email) values ({a1},{a2},'U3','U4','alice@x.com')")
st,js,_=req("GET","/api/account/usage",cookie=ALICE)
check("reports used = 4, limit = 2 (Free)", js["reports"]=={"used":4,"limit":2}, str(js))
check("comparisons used = 1, limit = 1 (Free)", js["comparisons"]=={"used":1,"limit":1}, str(js))
check("pulse present with a limit even at 0 used", js["pulse"]["limit"]==1 and js["pulse"]["used"]==0, str(js))
check("signed-out cannot read usage", req("GET","/api/account/usage")[0]==401)
check("bob's usage is independent (all zero)", req("GET","/api/account/usage",cookie=BOB)[1]["reports"]["used"]==0)

print(f"\nRESULT: {P} passed, {F} failed"); sys.exit(1 if F else 0)
