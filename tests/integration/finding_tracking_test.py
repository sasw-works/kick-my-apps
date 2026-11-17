import http.client, json, subprocess, urllib.parse, sys, time

PG=["psql","-h","127.0.0.1","-U","kma","-d","kma_test","-tA","-v","ON_ERROR_STOP=1"]
def psql(q):
    r=subprocess.run(PG+["-c",q],capture_output=True,text=True,env={"PGPASSWORD":"kma","PATH":"/usr/bin:/bin"})
    if r.returncode: raise RuntimeError(r.stderr)
    out=r.stdout.strip().splitlines(); return out[0] if out else ""
def req(m,p,cookie=None,body=None):
    c=http.client.HTTPConnection("localhost",3111,timeout=30); h={}; d=None
    if cookie:h["Cookie"]=cookie
    if body is not None: d=json.dumps(body); h["content-type"]="application/json"
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
P=F=0
def check(n,c,d=""):
    global P,F
    if c: P+=1; print(f"  ok   {n}")
    else: F+=1; print(f"  FAIL {n}   {d}")

for t in ["scans","comparisons","rate_limits","email_codes","users","accounts","sessions"]:
    try: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    except Exception: pass

def F_(key,status): return {"key":key,"title":key.title(),"status":status,"finding":"f","suggestion":"s"}
def rj(*fs): return {"healthScore":60,"aiSummary":"x","findings":list(fs),"lensScores":{}}
def save(ck,app,res,score=60): return req("POST","/api/history",cookie=ck,body={"appName":app,"healthScore":score,"resultJson":res,"storeUrl":""})[1]["id"]

# admin@x.com is exempt from the Free plan report limit, so the test can save several reports
ALICE=signin("admin@x.com"); BOB=signin("bob@x.com")
a1=save(ALICE,"App",rj(F_("contrast","bad"),F_("cta","warn"),F_("copy","bad")),50)
st,js,_=req("GET",f"/api/history?id={a1}",cookie=ALICE)

print("== 1. first report: nothing to compare with, nothing tracked")
check("no 'since last scan' data for a first report", js["progress"] is None, js.get("progress"))
check("no finding is marked", not js["scan"].get("finding_status"))

print("== 2. marking findings")
st,js,_=req("PATCH",f"/api/history/findings?id={a1}",cookie=ALICE,body={"key":"contrast","status":"done"})
check("owner can mark a finding fixed", st==200 and js["findingStatus"]=={"contrast":"done"}, f"{st} {js}")
st,js,_=req("PATCH",f"/api/history/findings?id={a1}",cookie=ALICE,body={"key":"cta","status":"wontfix"})
check("...and another won't-fix; both kept", js["findingStatus"]=={"contrast":"done","cta":"wontfix"}, js)
st,js,_=req("GET",f"/api/history?id={a1}",cookie=ALICE)
check("statuses come back with the report", js["scan"]["finding_status"]=={"contrast":"done","cta":"wontfix"}, js["scan"].get("finding_status"))
st,js,_=req("PATCH",f"/api/history/findings?id={a1}",cookie=ALICE,body={"key":"contrast","status":"open"})
check("reopening removes it", js["findingStatus"]=={"cta":"wontfix"}, js)

print("== 3. input and ownership")
check("a category not in the report is refused (no key stuffing)", req("PATCH",f"/api/history/findings?id={a1}",cookie=ALICE,body={"key":"__proto__","status":"done"})[0]==400)
check("an invalid status is refused", req("PATCH",f"/api/history/findings?id={a1}",cookie=ALICE,body={"key":"copy","status":"hacked"})[0]==400)
check("bad id is refused", req("PATCH","/api/history/findings?id=abc",cookie=ALICE,body={"key":"copy","status":"done"})[0]==400)
check("another user can't touch it (404)", req("PATCH",f"/api/history/findings?id={a1}",cookie=BOB,body={"key":"copy","status":"done"})[0]==404)
check("anonymous can't (401)", req("PATCH",f"/api/history/findings?id={a1}",body={"key":"copy","status":"done"})[0]==401)
st,js,_=req("GET",f"/api/history?id={a1}",cookie=ALICE)
check("...and nothing changed after those attempts", js["scan"]["finding_status"]=={"cta":"wontfix"}, js["scan"].get("finding_status"))

print("== 4. 'since your last scan'")
time.sleep(1.1)
a2=save(ALICE,"App",rj(F_("contrast","good"),F_("cta","warn"),F_("trust","bad")),65)
st,js,_=req("GET",f"/api/history?id={a2}",cookie=ALICE)
pr=js["progress"]
check("compares with her previous report of the same app", pr and pr["previousId"]==a1 and pr["previousScore"]==50, pr)
check("contrast (bad -> good) is fixed", [x["key"] for x in pr["resolved"]]==["contrast"], pr)
check("cta is still open", [x["key"] for x in pr["persisting"]]==["cta"], pr)
check("trust is a new issue", [x["key"] for x in pr["newIssues"]]==["trust"], pr)
check("'copy' (absent in the newer scan) isn't claimed as fixed", all(x["key"]!="copy" for x in pr["resolved"]))
check("the newer report starts with its own, empty tracking", not js["scan"].get("finding_status"))
bobapp=save(BOB,"App",rj(F_("contrast","bad")),40)
st,js,_=req("GET",f"/api/history?id={bobapp}",cookie=BOB)
check("another user's report of a same-named app isn't used for comparison", js["progress"] is None, js["progress"])
other=save(ALICE,"OtherApp",rj(F_("contrast","bad")),40)
check("a different app of hers doesn't compare either", req("GET",f"/api/history?id={other}",cookie=ALICE)[1]["progress"] is None)

print("== 5. rate limit")
psql("truncate rate_limits")
sts=[req("PATCH",f"/api/history/findings?id={a1}",cookie=ALICE,body={"key":"copy","status":"done"})[0] for _ in range(601)]
check("600/hour allowed, the 601st is refused", sts[:600]==[200]*600 and sts[600]==429, f"{set(sts[:600])} {sts[-1]}")

print(f"\nRESULT: {P} passed, {F} failed"); sys.exit(1 if F else 0)
