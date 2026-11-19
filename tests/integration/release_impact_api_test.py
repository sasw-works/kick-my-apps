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

# Seeded data only (no network): release impact for a monitored app.
for t in ["pulse_alerts","pulse_reviews","pulse_snapshots","pulse_monitors","scans","task_status","rate_limits","email_codes","users","accounts","sessions"]:
    try: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    except Exception: pass
ALICE=signin("alice@x.com"); BOB=signin("bob@x.com")
req("GET","/api/pulse/monitors",cookie=ALICE); req("GET","/api/history",cookie=ALICE); req("GET","/api/tasks",cookie=ALICE)  # make sure the tables exist
impact=lambda m,ck=ALICE: req("GET",f"/api/pulse/monitors/{m}/impact",cookie=ck)

def monitor(email,app,kind="mine"):
    return psql(f"INSERT INTO pulse_monitors (user_email,app_id,country,app_name,developer,kind,alerts_enabled) VALUES ('{email}','{app}','us','App {app}','Dev','{kind}',true) RETURNING id")
def snap(m,ts,version,rating,released=None):
    r=f"'{released}'" if released else "NULL"
    psql(f"INSERT INTO pulse_snapshots (monitor_id,taken_at,version,version_released_at,avg_rating,rating_count) VALUES ({m},'{ts}','{version}',{r},{rating},500)")
n=[0]
def reviews(m,version,count,rating,text):
    for _ in range(count):
        n[0]+=1; psql(f"INSERT INTO pulse_reviews (monitor_id,review_id,rating,title,content,version) VALUES ({m},'r{n[0]}',{rating},'t',$t${text}$t$,'{version}')")

mid=monitor("alice@x.com","11111")
snap(mid,"2026-03-01 12:00","1.0",4.0)
snap(mid,"2026-03-05 12:00","1.1",4.0,"2026-03-05 08:00")
snap(mid,"2026-03-12 12:00","1.1",4.1)
snap(mid,"2026-03-20 12:00","1.2",4.1,"2026-03-20 08:00")
snap(mid,"2026-03-27 12:00","1.2",4.3)
reviews(mid,"1.1",10,1,"It crashes every time I open it")
reviews(mid,"1.2",10,5,"Works great now")

# Alice made a report of this app from its store link and marked two tasks done.
findings=json.dumps([{"key":"contrast","title":"Fix low contrast","status":"bad","finding":"f","suggestion":"s"},{"key":"buttons","title":"Bigger buttons","status":"warn","finding":"f","suggestion":"s"},{"key":"other","title":"Unrelated","status":"warn","finding":"f","suggestion":"s"}])
psql(f"INSERT INTO scans (app_name,health_score,result_json,store_url,user_email,created_at) VALUES ('App 11111',60,$j${{\"healthScore\":60,\"aiSummary\":\"x\",\"findings\":{findings},\"lensScores\":{{}}}}$j$::jsonb,'https://apps.apple.com/us/app/x/id11111','alice@x.com','2026-03-02')")
psql("INSERT INTO task_status (user_email,project_key,finding_key,status,updated_at) VALUES ('alice@x.com','app:11111','contrast','done','2026-03-10 10:00'),('alice@x.com','app:11111','buttons','done','2026-03-21 10:00'),('alice@x.com','app:11111','other','wontdo','2026-03-11 10:00')")

print("== 1. the release comparison")
st,js,_=impact(mid)
check("200 with the app and its releases", st==200 and js["app"]["name"]=="App 11111" and [r["version"] for r in js["releases"]]==["1.2","1.1"], f"{st} {str(js)[:300]}")
r=js["releases"][0] if st==200 else {}
check("1.2 vs 1.1: review counts, bad-review share and a 'better' verdict", r.get("before",{}).get("n")==10 and r["after"]["n"]==10 and r["before"]["negPct"]==100 and r["after"]["negPct"]==0 and r["verdict"]=="better", str(r)[:300])
check("the topic that moved is named", r["changes"] and r["changes"][0]["key"]=="crash" and r["changes"][0]["afterPct"]==0, r.get("changes"))
check("store average before and after", r["ratingBefore"]==4.1 and r["ratingAfter"]==4.3, (r["ratingBefore"],r["ratingAfter"]))
check("tasks done around the release are listed with their real titles; 'won't do' ones are not", sorted(t["title"] for t in r["tasks"])==["Bigger buttons","Fix low contrast"], r["tasks"])
check("1.1 (the first comparison) has no reviews of 1.0 -> unclear", js["releases"][1]["verdict"]=="unclear")
check("hasReports is true when a report of this app exists", js["hasReports"] is True)

print("== 2. scope and ownership")
m2=monitor("alice@x.com","22222")
snap(m2,"2026-03-01 12:00","1.0",4.0); snap(m2,"2026-03-10 12:00","1.1",4.0,"2026-03-10 08:00")
st,js,_=impact(m2)
check("another app of hers: only her own tasks for THAT app (none), no mix-up", st==200 and js["hasReports"] is False and js["releases"][0]["tasks"]==[], f"{st} {str(js)[:200]}")
oth=monitor("alice@x.com","33333","other")
check("an 'other' app has no release impact (404)", impact(oth)[0]==404)
check("bob can't read alice's (404)", impact(mid,BOB)[0]==404)
check("anonymous -> 401", req("GET",f"/api/pulse/monitors/{mid}/impact")[0]==401)
check("bad id -> 404", req("GET","/api/pulse/monitors/abc/impact",cookie=ALICE)[0]==404)
bm=monitor("bob@x.com","11111")
snap(bm,"2026-03-01 12:00","1.0",4.0); snap(bm,"2026-03-10 12:00","1.1",4.0,"2026-03-10 08:00")
st,js,_=impact(bm,BOB)
check("bob monitors the same app id but doesn't see alice's tasks or reports", st==200 and js["hasReports"] is False and js["releases"][0]["tasks"]==[], f"{st} {str(js)[:200]}")

psql("delete from pulse_monitors where user_email in ('alice@x.com','bob@x.com')")
psql("delete from scans where user_email in ('alice@x.com','bob@x.com')"); psql("delete from task_status where user_email in ('alice@x.com','bob@x.com')")
print(f"\nRESULT: {P} passed, {F} failed"); sys.exit(1 if F else 0)
