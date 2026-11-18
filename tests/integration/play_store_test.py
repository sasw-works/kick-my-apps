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

# Talks to the real Google Play and App Store: real apps, real lookups (like pulse_competitors_test.py).
SPOTIFY="com.spotify.music"; NETFLIX="com.netflix.mediaclient"; INSTAGRAM="389801252"
for t in ["pulse_alerts","pulse_reviews","pulse_snapshots","pulse_monitors","rate_limits","email_codes","users","accounts","sessions"]:
    try: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    except Exception: pass
ADMIN=signin("admin@x.com"); ALICE=signin("alice@x.com")

print("== 1. search")
st,js,_=req("GET","/api/search-app?term=spotify&country=us&store=play")
check("store=play returns Play apps (package names, tagged)", st==200 and js["results"] and all(r["store"]=="play" and "." in str(r["trackId"]) for r in js["results"]) and any(r["trackId"]==SPOTIFY for r in js["results"]), f"{st} {str(js)[:200]}")
check("Play results carry a link to the store listing", all(r["storeUrl"].startswith("https://play.google.com/store/apps/details?id=") for r in js["results"]))
st,js,_=req("GET","/api/search-app?term=spotify&country=us")
check("default is still the App Store (numeric ids)", st==200 and js["results"] and all(str(r["trackId"]).isdigit() for r in js["results"]), str(js)[:200])
st,js,_=req("GET","/api/search-app?term=spotify&country=us&store=all")
stores={r["store"] for r in js["results"]}
check("store=all mixes both, each tagged", st==200 and stores=={"appstore","play"}, f"{st} {stores}")
st,js,_=req("GET","/api/search-app?term=spotify&country=us&store=%27%3Bdrop")
check("unknown store value falls back safely", st==200 and isinstance(js["results"],list))

print("== 2. monitoring a Play app")
st,js,_=req("POST","/api/pulse/monitors",cookie=ADMIN,body={"appId":SPOTIFY,"country":"us"})
m=js.get("monitor") if js else None
check("adds a Play app", st==200 and m and m["app_id"]==SPOTIFY and m["app_name"], f"{st} {str(js)[:200]}")
mid=m["id"] if m else None
check("store link points at Google Play", m and m["store_url"].startswith("https://play.google.com/"), m and m["store_url"])
check("first check ran and saved real numbers", m and m["last_check_ok"] is True, m and (m["last_check_ok"], m["last_error"]))
snap=psql(f"SELECT avg_rating::text||'|'||rating_count FROM pulse_snapshots WHERE monitor_id={mid} ORDER BY id DESC LIMIT 1") if mid else ""
check("baseline snapshot has a rating and rating count", snap and float(snap.split('|')[0])>1 and int(snap.split('|')[1])>1000, snap)
n=int(psql(f"SELECT COUNT(*) FROM pulse_reviews WHERE monitor_id={mid}") or 0) if mid else 0
check("recent written reviews were stored", n>=10, n)
bad=psql(f"SELECT COUNT(*) FROM pulse_reviews WHERE monitor_id={mid} AND (rating<1 OR rating>5 OR content IS NULL OR content='')") if mid else "1"
check("every stored review has a 1-5 rating and text", bad=="0", bad)
st,js,_=req("GET","/api/pulse/monitors",cookie=ADMIN)
check("shows up in the monitor list", st==200 and any(x["app_id"]==SPOTIFY for x in js["monitors"]))
st,js,_=req("POST","/api/pulse/monitors",cookie=ADMIN,body={"appId":SPOTIFY,"country":"us"})
check("adding it again says so (409)", st==409, f"{st} {js}")
st,js,_=req("POST","/api/pulse/monitors",cookie=ADMIN,body={"appId":"com.zzzz.doesnotexist.qqq","country":"us"})
check("a package that isn't on Play -> 404, nothing saved", st==404 and psql("SELECT COUNT(*) FROM pulse_monitors WHERE app_id='com.zzzz.doesnotexist.qqq'")=="0", f"{st} {js}")
st,js,_=req("POST","/api/pulse/monitors",cookie=ADMIN,body={"appId":"not a package","country":"us"})
check("junk id -> 400", st==400, f"{st} {js}")
st,js,_=req("POST","/api/pulse/monitors",cookie=ADMIN,body={"storeUrl":f"https://play.google.com/store/apps/details?id={NETFLIX}&hl=en&gl=us"})
check("adding from a Play link works (id + country read from it)", st==200 and js["monitor"]["app_id"]==NETFLIX and js["monitor"]["country"]=="us", f"{st} {str(js)[:200]}")
nid=js["monitor"]["id"] if st==200 else None

print("== 3. competitors stay within one store")
st,js,_=req("POST",f"/api/pulse/monitors/{mid}/competitors",cookie=ADMIN,body={"appId":INSTAGRAM})
check("an App Store app can't be a competitor of a Play app", st==400 and "Google Play" in js["error"], f"{st} {js}")
st,js,_=req("POST",f"/api/pulse/monitors/{mid}/competitors",cookie=ADMIN,body={"appId":"com.google.android.youtube"})
check("a Play app can", st==200, f"{st} {str(js)[:200]}")
st,js,_=req("GET",f"/api/pulse/monitors/{mid}/competitors",cookie=ADMIN)
check("it is listed with its numbers", st==200 and len(js["competitors"])==1 and js["competitors"][0]["avgRating"] is not None, f"{st} {str(js)[:300]}")
st,js,_=req("GET","/api/pulse/monitors",cookie=ADMIN)
check("competitors don't appear in the monitor list", all(x["app_id"]!="com.google.android.youtube" for x in js["monitors"]))
st,js,_=req("POST","/api/pulse/monitors",cookie=ADMIN,body={"appId":INSTAGRAM,"country":"us"})
aid=js["monitor"]["id"] if st==200 else None
check("(setup) an App Store monitor", st==200, f"{st} {js}")
st,js,_=req("POST",f"/api/pulse/monitors/{aid}/competitors",cookie=ADMIN,body={"appId":SPOTIFY+"x"}) if aid else (0,{},"")
check("and a Play app can't be a competitor of an App Store app", st==400 and "App Store" in js["error"], f"{st} {js}")

print("== 4. isolation")
st,js,_=req("GET",f"/api/pulse/monitors/{mid}/competitors",cookie=ALICE)
check("another user can't read a Play monitor's competitors", st==404, st)
st,js,_=req("GET","/api/pulse/monitors",cookie=ALICE)
check("another user's list doesn't include it", st==200 and js["monitors"]==[], str(js)[:200])

print(f"\nRESULT: {P} passed, {F} failed")
sys.exit(1 if F else 0)
