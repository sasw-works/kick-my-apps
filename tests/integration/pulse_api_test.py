import http.client, json, subprocess, urllib.parse, sys

PG=["psql","-h","127.0.0.1","-U","kma","-d","kma_test","-tA","-v","ON_ERROR_STOP=1"]
def psql(q):
    r=subprocess.run(PG+["-c",q],capture_output=True,text=True,env={"PGPASSWORD":"kma","PATH":"/usr/bin:/bin"})
    if r.returncode: raise RuntimeError(r.stderr)
    out=r.stdout.strip().splitlines(); return out[0] if out else ""

def req(m,p,cookie=None,body=None,headers=None):
    c=http.client.HTTPConnection("localhost",3111,timeout=30); h=dict(headers or {}); d=None
    if cookie:h["Cookie"]=cookie
    if body is not None: d=json.dumps(body); h["content-type"]="application/json"
    c.request(m,p,body=d,headers=h); r=c.getresponse(); t=r.read().decode("utf-8","ignore"); c.close()
    try: js=json.loads(t)
    except Exception: js=None
    return r.status,js,t

def signin(email,code="123456"):
    psql("""CREATE TABLE IF NOT EXISTS email_codes (email TEXT PRIMARY KEY, code TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, attempts INTEGER NOT NULL DEFAULT 0)""")
    psql(f"INSERT INTO email_codes VALUES ('{email}','123456',now()+interval '10 min',0) ON CONFLICT (email) DO UPDATE SET code='123456',expires_at=now()+interval '10 min',attempts=0")
    # one connection for csrf (token + cookie must come from the SAME request)
    c=http.client.HTTPConnection("localhost",3111,timeout=20); c.request("GET","/api/auth/csrf"); r=c.getresponse()
    js=json.loads(r.read().decode()); ck=r.msg.get_all("Set-Cookie") or []; c.close()
    cc=next(x.split(";")[0] for x in ck if x.startswith("authjs.csrf-token"))
    c=http.client.HTTPConnection("localhost",3111,timeout=20)
    body=urllib.parse.urlencode({"csrfToken":js["csrfToken"],"email":email,"code":code,"callbackUrl":"http://localhost:3111/console","json":"true"})
    c.request("POST","/api/auth/callback/email-code",body=body,headers={"Cookie":cc,"content-type":"application/x-www-form-urlencoded"})
    r=c.getresponse(); r.read(); ck2=r.msg.get_all("Set-Cookie") or []; c.close()
    return next((x.split(";")[0] for x in ck2 if x.startswith("authjs.session-token")),None)

P=F=0
def check(n,c,d=""):
    global P,F
    if c: P+=1; print(f"  ok   {n}")
    else: F+=1; print(f"  FAIL {n}   {d}")

for t in ["pulse_alerts","pulse_reviews","pulse_snapshots","pulse_monitors","rate_limits","email_codes","users","accounts","sessions"]:
    try: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    except Exception: pass

ALICE=signin("alice@x.com"); BOB=signin("bob@x.com")
check("both sign in", ALICE and BOB)

print("== 1. auth required on every Pulse endpoint")
check("GET list, signed out -> 401", req("GET","/api/pulse/monitors")[0]==401)
check("POST add, signed out -> 401", req("POST","/api/pulse/monitors",body={"appId":"1"})[0]==401)
check("cron, no secret at all -> 401", req("GET","/api/cron/pulse-check")[0]==401)
check("cron, wrong secret -> 401", req("GET","/api/cron/pulse-check",headers={"Authorization":"Bearer wrong"})[0]==401)

print("== 2. adding a real app (Instagram, US store)")
st,js,txt=req("POST","/api/pulse/monitors",cookie=ALICE,body={"appId":"389801252","country":"us"})
check("201/200 with a monitor back", st==200 and js and js.get("monitor",{}).get("id"), f"{st} {txt[:200]}")
mon=js["monitor"] if js else None
check("real app data came back (name/developer/icon)", mon and mon.get("app_name") and mon.get("developer") and mon.get("icon_url"), str(mon))
check("an immediate baseline check ran (last_check_ok true, no error)", mon and mon.get("last_check_ok") is True and mon.get("last_checked_at"), str(mon))

print("== 3. duplicate / invalid input")
check("adding the same app again -> 409", req("POST","/api/pulse/monitors",cookie=ALICE,body={"appId":"389801252","country":"us"})[0]==409)
check("garbage appId -> 400", req("POST","/api/pulse/monitors",cookie=ALICE,body={"appId":"not-an-id"})[0]==400)
CAROL=signin("carol@x.com")
st,js,_=req("POST","/api/pulse/monitors",cookie=CAROL,body={"appId":"999999999999"})
check("a real-looking but nonexistent app id -> 404 (fresh account, room in her plan)", st==404, f"{st} {js}")
check("...and nothing got created for her from the failed attempt", req("GET","/api/pulse/monitors",cookie=CAROL)[1]["monitors"]==[])

print("== 4. Free plan limit (1 monitor)")
st,js,txt=req("POST","/api/pulse/monitors",cookie=ALICE,body={"appId":"324684580","country":"us"})  # Spotify
check("a second monitor is refused with the plan-limit code", st==403 and (js or {}).get("code")=="PLAN_LIMIT", f"{st} {txt[:200]}")

print("== 5. ownership: bob can't see, check, or delete alice's monitor")
mid=mon["id"]
st,js,_=req("GET","/api/pulse/monitors",cookie=BOB)
check("bob's list is empty", js["monitors"]==[])
check("bob's plan limit is HIS OWN (1), unaffected by alice's usage", js["limit"]==1, str(js))
check("bob can't fetch alice's monitor by id -> 404", req("GET",f"/api/pulse/monitors/{mid}",cookie=BOB)[0]==404)
check("bob can't pause it -> 404", req("PATCH",f"/api/pulse/monitors/{mid}",cookie=BOB,body={"status":"paused"})[0]==404)
check("bob can't check-now it -> 404", req("POST",f"/api/pulse/monitors/{mid}/check",cookie=BOB)[0]==404)
check("bob can't delete it -> 404", req("DELETE",f"/api/pulse/monitors/{mid}",cookie=BOB)[0]==404)
check("...and it's still there afterwards", psql(f"select count(*) from pulse_monitors where id={mid}")=="1")
st,js,_=req("GET",f"/api/pulse/monitors/{mid}",cookie=ALICE)
check("alice CAN fetch her own, with snapshot/alert history shape", st==200 and "snapshots" in js and "alerts" in js and "reviews" in js, str(js)[:200])

print("== 6. pause / resume")
check("alice pauses it", req("PATCH",f"/api/pulse/monitors/{mid}",cookie=ALICE,body={"status":"paused"})[0]==200)
check("status reflects it", psql(f"select status from pulse_monitors where id={mid}")=="paused")
check("invalid status value rejected", req("PATCH",f"/api/pulse/monitors/{mid}",cookie=ALICE,body={"status":"bogus"})[0]==400)
req("PATCH",f"/api/pulse/monitors/{mid}",cookie=ALICE,body={"status":"active"})

print("== 7. manual re-check respects the same cooldown as the cron")
st,js,txt=req("POST",f"/api/pulse/monitors/{mid}/check",cookie=ALICE)
check("checking again immediately is throttled (429, not silently skipped)", st==429 and js.get("code")=="TOO_SOON" and js.get("retryAfterSeconds",0)>0, f"{st} {txt[:150]}")

print("== 8. deleting")
check("alice deletes her monitor", req("DELETE",f"/api/pulse/monitors/{mid}",cookie=ALICE)[0]==200)
check("gone from the DB, cascaded (no orphaned snapshots)", psql(f"select count(*) from pulse_monitors where id={mid}")=="0" and psql(f"select count(*) from pulse_snapshots where monitor_id={mid}")=="0")
check("now bob can add it (limit was per-user, not global)", req("POST","/api/pulse/monitors",cookie=BOB,body={"appId":"389801252","country":"us"})[0]==200)

print("== 9. cron with the right secret actually runs")
st,js,txt=req("GET","/api/cron/pulse-check",headers={"Authorization":"Bearer test-cron-secret"})
check("200 with a real summary", st==200 and "checked" in js, f"{st} {txt[:200]}")

print(f"\nRESULT: {P} passed, {F} failed"); sys.exit(1 if F else 0)
