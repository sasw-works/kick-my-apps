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
# One kind of thing -- a monitored app -- that is either "mine" or "other"; others are compared with mine.
INSTAGRAM="389801252"; FACEBOOK="284882215"; WHATSAPP="310633997"; TIKTOK="835599320"
for t in ["pulse_alerts","pulse_reviews","pulse_snapshots","pulse_monitors","rate_limits","email_codes","users","accounts","sessions"]:
    try: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    except Exception: pass

ALICE=signin("alice@x.com"); BOB=signin("bob@x.com"); ADMIN=signin("admin@x.com")
add=lambda ck,app,**kw: req("POST","/api/pulse/monitors",cookie=ck,body={"appId":app,"country":"us",**kw})
st,js,_=add(ALICE,INSTAGRAM)
mid=js["monitor"]["id"] if js and js.get("monitor") else None
check("(setup) alice monitors her app (default kind: mine, alerts on)", st==200 and mid and js["monitor"]["kind"]=="mine" and js["monitor"]["alerts_enabled"] is True, f"{st} {js}")
cmpr=lambda m=mid,ck=ALICE: req("GET",f"/api/pulse/monitors/{m}/compare",cookie=ck)

print("== 1. adding another app")
st,js,_=cmpr()
check("nothing to compare yet; 'self' carries her numbers", st==200 and js["others"]==[] and js["hidden"]==0 and js["self"]["avgRating"] is not None, f"{st} {js}")
st,js,_=add(ALICE,FACEBOOK,kind="other")
cid=js["monitor"]["id"] if js and js.get("monitor") else None
check("alice adds another app (kind other, alerts default OFF)", st==200 and cid and js["monitor"]["kind"]=="other" and js["monitor"]["alerts_enabled"] is False, f"{st} {js}")
st,js,_=cmpr()
c=js["others"][0] if js["others"] else {}
check("it shows real rating, version and a gap against her app", c.get("avgRating") is not None and c.get("version") and c.get("ratingGap") is not None, c)
check("...and the fields the table needs exist", all(k in c for k in ["ratingCount","versionReleasedAt","updatesSeen","negativePct","topComplaints","reviewSample"]), list(c))
check("junk kind -> 400", add(BOB,INSTAGRAM,kind="enemy")[0]==400)
check("junk alertsEnabled -> 400", add(BOB,INSTAGRAM,alertsEnabled="yes")[0]==400)

print("== 2. one list, one limit")
st,js,_=req("GET","/api/pulse/monitors",cookie=ALICE)
check("both appear in the Monitor list, each with its kind", sorted((m["id"],m["kind"]) for m in js["monitors"])==sorted([(mid,"mine"),(cid,"other")]), [(m["id"],m.get("kind")) for m in js["monitors"]])
check("the list limit is the Free 2", js["limit"]==2)
st,js,_=req("GET","/api/account/usage",cookie=ALICE)
check("usage counts both against the one limit (2 of 2)", js["pulse"]=={"used":2,"limit":2}, str(js))
st,js,_=add(ALICE,WHATSAPP,kind="other")
check("a third app is refused (PLAN_LIMIT), whichever kind", st==403 and js.get("code")=="PLAN_LIMIT", f"{st} {js}")
st,js,_=add(ALICE,WHATSAPP)
check("...also for 'mine'", st==403 and js.get("code")=="PLAN_LIMIT", f"{st} {js}")
check("same app twice -> 409", add(ALICE,FACEBOOK,kind="other")[0]==409)
check("garbage app id -> 400", add(ALICE,"abc",kind="other")[0]==400)

print("== 3. the compare view belongs to 'my apps'")
check("an 'other' app has no compare view (404)", cmpr(cid)[0]==404)

print("== 4. switching kind and alerts")
check("alerts can be switched on for an other app", req("PATCH",f"/api/pulse/monitors/{cid}",cookie=ALICE,body={"alertsEnabled":True})[0]==200 and psql(f"select alerts_enabled from pulse_monitors where id={cid}")=="t")
check("...and off again", req("PATCH",f"/api/pulse/monitors/{cid}",cookie=ALICE,body={"alertsEnabled":False})[0]==200 and psql(f"select alerts_enabled from pulse_monitors where id={cid}")=="f")
check("making her app 'other' resets alerts to that kind's default (off)", req("PATCH",f"/api/pulse/monitors/{mid}",cookie=ALICE,body={"kind":"other"})[0]==200 and psql(f"select kind||alerts_enabled from pulse_monitors where id={mid}")=="otherfalse")
check("...and its compare view goes away", cmpr(mid)[0]==404)
check("making it 'mine' again turns alerts back on", req("PATCH",f"/api/pulse/monitors/{mid}",cookie=ALICE,body={"kind":"mine"})[0]==200 and psql(f"select kind||alerts_enabled from pulse_monitors where id={mid}")=="minetrue")
check("kind and alerts together: both honoured", req("PATCH",f"/api/pulse/monitors/{cid}",cookie=ALICE,body={"kind":"other","alertsEnabled":True})[0]==200 and psql(f"select alerts_enabled from pulse_monitors where id={cid}")=="t")
req("PATCH",f"/api/pulse/monitors/{cid}",cookie=ALICE,body={"alertsEnabled":False})
check("status still works (pause)", req("PATCH",f"/api/pulse/monitors/{cid}",cookie=ALICE,body={"status":"paused"})[0]==200)
req("PATCH",f"/api/pulse/monitors/{cid}",cookie=ALICE,body={"status":"active"})
check("junk values -> 400, empty body -> 400", req("PATCH",f"/api/pulse/monitors/{cid}",cookie=ALICE,body={"kind":"x"})[0]==400 and req("PATCH",f"/api/pulse/monitors/{cid}",cookie=ALICE,body={"alertsEnabled":"no"})[0]==400 and req("PATCH",f"/api/pulse/monitors/{cid}",cookie=ALICE,body={})[0]==400)

print("== 5. ownership")
check("bob can't read alice's comparison (404)", cmpr(ck=BOB)[0]==404)
check("anonymous -> 401", req("GET",f"/api/pulse/monitors/{mid}/compare")[0]==401)
check("bob can't change alice's app's kind or alerts (404)", req("PATCH",f"/api/pulse/monitors/{cid}",cookie=BOB,body={"kind":"mine"})[0]==404 and req("PATCH",f"/api/pulse/monitors/{cid}",cookie=BOB,body={"alertsEnabled":True})[0]==404)
check("bob can't delete her other app either (404)", req("DELETE",f"/api/pulse/monitors/{cid}",cookie=BOB)[0]==404)
st,js,_=add(BOB,FACEBOOK,kind="other")
check("bob adding the same app is his own monitor, and his compare view doesn't show alice's", st==200 and psql(f"select count(*) from pulse_monitors where app_id='{FACEBOOK}'")=="2")
st,js,_=req("GET","/api/pulse/monitors",cookie=BOB)
check("bob only sees his own", [m["app_name"] for m in js["monitors"]]==[js["monitors"][0]["app_name"]] and len(js["monitors"])==1)

print("== 6. admin is exempt from the limit")
st,js,_=add(ADMIN,INSTAGRAM)
amid=js["monitor"]["id"]
sts=[add(ADMIN,a,kind="other")[0] for a in (FACEBOOK,WHATSAPP,TIKTOK)]
check("admin adds 3 other apps", sts==[200,200,200], sts)
st,js,_=cmpr(amid,ADMIN)
check("all three appear in his comparison", st==200 and len(js["others"])==3, f"{st} {len(js.get('others',[]))}")

print("== 7. removing and cleanup")
check("alice removes her other app", req("DELETE",f"/api/pulse/monitors/{cid}",cookie=ALICE)[0]==200 and cmpr()[1]["others"]==[])
check("...and her own app is untouched", psql(f"select count(*) from pulse_monitors where id={mid}")=="1")
st,js,_=add(ALICE,FACEBOOK,kind="other"); cid2=js["monitor"]["id"]
req("DELETE",f"/api/pulse/monitors/{mid}",cookie=ALICE)
check("deleting her app no longer deletes the other app she monitors", psql(f"select count(*) from pulse_monitors where id={cid2}")=="1")
req("DELETE","/api/account/delete",cookie=ADMIN)
check("deleting an account leaves no monitor rows", psql("select count(*) from pulse_monitors where user_email='admin@x.com'")=="0")

psql("delete from pulse_monitors where user_email in ('alice@x.com','bob@x.com','admin@x.com')")  # leave no rows for later tests
print(f"\nRESULT: {P} passed, {F} failed"); sys.exit(1 if F else 0)
