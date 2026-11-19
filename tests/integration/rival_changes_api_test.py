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

# Rival change feed, with seeded data only (no network).
for t in ["pulse_changes","pulse_alerts","pulse_reviews","pulse_snapshots","pulse_monitors","rate_limits","email_codes","users","accounts","sessions"]:
    try: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    except Exception: pass
ALICE=signin("alice@x.com"); BOB=signin("bob@x.com")
req("GET","/api/pulse/monitors",cookie=ALICE)  # makes sure the tables exist
def monitor(email,app,name,kind="other"):
    return psql(f"INSERT INTO pulse_monitors (user_email,app_id,country,app_name,developer,kind,alerts_enabled) VALUES ('{email}','{app}','us','{name}','Dev','{kind}',false) RETURNING id")
def change(m,email,kind,title,detail,days_ago): psql(f"INSERT INTO pulse_changes (monitor_id,user_email,kind,title,detail,detected_at) VALUES ({m},'{email}','{kind}',$t${title}$t$,$t${detail}$t$,now()-interval '{days_ago} days')")
feed=lambda ck=ALICE,q="": req("GET","/api/pulse/changes"+q,cookie=ck)

r1=monitor("alice@x.com","1001","RivalOne"); r2=monitor("alice@x.com","1002","RivalTwo"); mine=monitor("alice@x.com","1003","MyApp","mine"); bob=monitor("bob@x.com","2001","BobRival")
change(r1,"alice@x.com","version","Released version 2.0","Dark mode",1)
change(r1,"alice@x.com","icon","Changed its app icon","x",3)
change(r2,"alice@x.com","price","Changed its price","Free -> $4.99",20)
change(mine,"alice@x.com","price","Should never show","x",1)
change(bob,"bob@x.com","version","Bob's rival","x",1)

print("== 1. the feed")
st,js,_=feed()
check("this week: only the 2 recent changes of her rivals, newest first", st==200 and [c["kind"] for c in js["changes"]]==["version","icon"] and js["days"]==7, f"{st} {js}")
check("each row names the app and links to its monitor", js["changes"][0]["app_name"]=="RivalOne" and js["changes"][0]["monitor_id"]==int(r1))
check("the number of rivals she watches is reported", js["watching"]==2)
st,js,_=feed(q="?days=30"); check("30 days includes the older one", [c["kind"] for c in js["changes"]]==["version","icon","price"])
check("bad days values fall back to 7", len(feed(q="?days=abc")[1]["changes"])==2 and len(feed(q="?days=0")[1]["changes"])==2 and len(feed(q="?days=9999")[1]["changes"])==2)
check("a change logged against her own (mine) app is never shown", all(c["title"]!="Should never show" for c in feed(q="?days=90")[1]["changes"]))
check("bob sees only his own", [c["title"] for c in feed(BOB)[1]["changes"]]==["Bob's rival"] and feed(BOB)[1]["watching"]==1)
check("anonymous -> 401", req("GET","/api/pulse/changes")[0]==401)
check("someone with no rivals gets watching 0 and nothing", (lambda ck: feed(ck)[1]["watching"]==0 and feed(ck)[1]["changes"]==[])(signin("carol@x.com")))

print("== 2. one app's own log")
st,js,_=req("GET",f"/api/pulse/monitors/{r1}",cookie=ALICE)
check("the monitor page data carries its log", st==200 and [c["kind"] for c in js["changes"]]==["version","icon"], f"{st} {str(js)[:200]}")
check("bob can't read it (404)", req("GET",f"/api/pulse/monitors/{r1}",cookie=BOB)[0]==404)

print("== 3. cleanup")
psql("DELETE FROM pulse_monitors WHERE id="+r1)
check("deleting a monitor takes its log along", psql("SELECT count(*) FROM pulse_changes WHERE monitor_id="+r1)=="0")
print(f"\n{P} passed, {F} failed"); sys.exit(1 if F else 0)
