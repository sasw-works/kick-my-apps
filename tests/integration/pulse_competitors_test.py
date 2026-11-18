import http.client, json, subprocess, urllib.parse, sys

PG=["psql","-h","127.0.0.1","-U","kma","-d","kma_test","-tA","-v","ON_ERROR_STOP=1"]
def psql(q):
    r=subprocess.run(PG+["-c",q],capture_output=True,text=True,env={"PGPASSWORD":"kma","PATH":"/usr/bin:/bin"})
    if r.returncode: raise RuntimeError(r.stderr)
    out=r.stdout.strip().splitlines(); return out[0] if out else ""
def req(m,p,cookie=None,body=None):
    c=http.client.HTTPConnection("localhost",3111,timeout=40); h={}; d=None
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

# Talks to the real App Store (like pulse_api_test.py): real apps, real lookups.
INSTAGRAM="389801252"; FACEBOOK="284882215"; WHATSAPP="310633997"; TIKTOK="835599320"
for t in ["pulse_alerts","pulse_reviews","pulse_snapshots","pulse_monitors","rate_limits","email_codes","users","accounts","sessions"]:
    try: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    except Exception: pass

ALICE=signin("alice@x.com"); BOB=signin("bob@x.com"); ADMIN=signin("admin@x.com")
st,js,_=req("POST","/api/pulse/monitors",cookie=ALICE,body={"appId":INSTAGRAM,"country":"us"})
mid=js["monitor"]["id"] if js and js.get("monitor") else None
check("(setup) alice monitors a real app", st==200 and mid, f"{st} {js}")
comp=lambda m=mid,ck=ALICE: req("GET",f"/api/pulse/monitors/{m}/competitors",cookie=ck)

print("== 1. adding a competitor")
st,js,_=comp()
check("starts empty, with the Free limit of 1", st==200 and js["competitors"]==[] and js["limit"]==1, f"{st} {js}")
check("'self' carries your own numbers", js["self"]["avgRating"] is not None and js["self"]["app_name"], js["self"])
st,js,_=req("POST",f"/api/pulse/monitors/{mid}/competitors",cookie=ALICE,body={"appId":FACEBOOK})
cid=js.get("id") if js else None
check("alice adds a competitor (store defaults to the parent's)", st==200 and cid, f"{st} {js}")
st,js,_=comp()
c=js["competitors"][0] if js["competitors"] else {}
check("it shows real rating, version and a gap against her app", c.get("avgRating") is not None and c.get("version") and c.get("ratingGap") is not None, c)
check("...and the fields the table needs exist", all(k in c for k in ["ratingCount","versionReleasedAt","updatesSeen","negativePct","topComplaints","reviewSample"]), list(c))

print("== 2. competitors are not 'her apps'")
st,js,_=req("GET","/api/pulse/monitors",cookie=ALICE)
check("not in the Monitor list", [m["id"] for m in js["monitors"]]==[mid], [m["id"] for m in js["monitors"]])
st,js,_=req("GET","/api/account/usage",cookie=ALICE)
check("and not counted against her monitor limit", js["pulse"]["used"]==1, js["pulse"])
st,js,_=req("POST",f"/api/pulse/monitors/{cid}/competitors",cookie=ALICE,body={"appId":WHATSAPP})
check("a competitor can't have competitors itself (404)", st==404, f"{st} {js}")

print("== 3. rules")
check("same competitor twice -> 409", req("POST",f"/api/pulse/monitors/{mid}/competitors",cookie=ALICE,body={"appId":FACEBOOK})[0]==409)
check("her own app as a competitor -> 400", req("POST",f"/api/pulse/monitors/{mid}/competitors",cookie=ALICE,body={"appId":INSTAGRAM,"country":"us"})[0]==400)
st,js,_=req("POST",f"/api/pulse/monitors/{mid}/competitors",cookie=ALICE,body={"appId":WHATSAPP})
check("Free plan: a 2nd competitor is refused (PLAN_LIMIT)", st==403 and js.get("code")=="PLAN_LIMIT", f"{st} {js}")
check("garbage app id -> 400", req("POST",f"/api/pulse/monitors/{mid}/competitors",cookie=ALICE,body={"appId":"abc"})[0]==400)

print("== 4. ownership")
check("bob can't read alice's competitors (404)", comp(ck=BOB)[0]==404)
check("bob can't add to alice's app (404)", req("POST",f"/api/pulse/monitors/{mid}/competitors",cookie=BOB,body={"appId":TIKTOK})[0]==404)
check("anonymous -> 401", req("GET",f"/api/pulse/monitors/{mid}/competitors")[0]==401)
check("bob can't delete alice's competitor either (404)", req("DELETE",f"/api/pulse/monitors/{cid}",cookie=BOB)[0]==404)

print("== 5. admin is exempt from the limit")
st,js,_=req("POST","/api/pulse/monitors",cookie=ADMIN,body={"appId":INSTAGRAM,"country":"us"})
amid=js["monitor"]["id"]
sts=[req("POST",f"/api/pulse/monitors/{amid}/competitors",cookie=ADMIN,body={"appId":a})[0] for a in (FACEBOOK,WHATSAPP,TIKTOK)]
check("admin adds 3 competitors", sts==[200,200,200], sts)

print("== 6. removing and cleanup")
check("alice removes her competitor", req("DELETE",f"/api/pulse/monitors/{cid}",cookie=ALICE)[0]==200 and comp()[1]["competitors"]==[])
check("...and her own app is untouched", psql(f"select count(*) from pulse_monitors where id={mid}")=="1")
req("POST",f"/api/pulse/monitors/{mid}/competitors",cookie=ALICE,body={"appId":FACEBOOK})
req("DELETE",f"/api/pulse/monitors/{mid}",cookie=ALICE)
check("deleting her app deletes its competitors too", psql("select count(*) from pulse_monitors where user_email='alice@x.com'")=="0")
req("DELETE","/api/account/delete",cookie=ADMIN)
check("deleting an account leaves no competitor rows", psql("select count(*) from pulse_monitors where user_email='admin@x.com'")=="0")

print(f"\nRESULT: {P} passed, {F} failed"); sys.exit(1 if F else 0)
