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

# Seeded data only (no network): complaint topics from reviews and the one-click task.
for t in ["pulse_alerts","pulse_reviews","pulse_snapshots","pulse_monitors","scans","task_status","custom_tasks","rate_limits","email_codes","users","accounts","sessions"]:
    try: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    except Exception: pass
ALICE=signin("alice@x.com"); BOB=signin("bob@x.com")
req("GET","/api/pulse/monitors",cookie=ALICE); req("GET","/api/history",cookie=ALICE); req("GET","/api/tasks",cookie=ALICE)  # make sure the tables exist
topics=lambda m,ck=ALICE: req("GET",f"/api/pulse/monitors/{m}/topics",cookie=ck)
addt=lambda m,topic,ck=ALICE: req("POST",f"/api/pulse/monitors/{m}/topics",cookie=ck,body={"topic":topic})

def monitor(email,app,kind="mine"):
    return psql(f"INSERT INTO pulse_monitors (user_email,app_id,country,app_name,developer,kind,alerts_enabled) VALUES ('{email}','{app}','us','App {app}','Dev','{kind}',true) RETURNING id")
n=[0]
def review(m,rating,text):
    n[0]+=1; psql(f"INSERT INTO pulse_reviews (monitor_id,review_id,rating,title,content,first_seen_at) VALUES ({m},'r{n[0]}',{rating},'',$t${text}$t$, now() - interval '{n[0]} minutes')")
def scan(email,app):
    f=json.dumps([{"key":"contrast","title":"Fix low contrast","status":"bad","finding":"f","suggestion":"s"}])
    psql(f"INSERT INTO scans (app_name,health_score,result_json,store_url,user_email) VALUES ('App {app}',60,$j${{\"healthScore\":60,\"aiSummary\":\"x\",\"findings\":{f},\"lensScores\":{{}}}}$j$::jsonb,'https://apps.apple.com/us/app/x/id{app}','{email}')")

mid=monitor("alice@x.com","11111")
for t in ["It crashes on launch","Crashes every time","App keeps crashing since the update","Can't log in at all","Password reset never works"]: review(mid,1,t)
review(mid,5,"Love it, never crashes, no ads"); review(mid,3,"Too many ads and it is slow")

print("== 1. the topics")
st,js,_=topics(mid)
check("200 with an exact sample size (the 1-3 star reviews only)", st==200 and js["sample"]==6, f"{st} {str(js)[:200]}")
by={t["key"]:t for t in js["topics"]}
check("crash counted exactly (3), login (2); praise isn't a complaint", by["crash"]["count"]==3 and by["login"]["count"]==2 and by["ads"]["count"]==1, {k:v["count"] for k,v in by.items()})
check("canAdd needs 3+ mentions", by["crash"]["canAdd"] is True and by["login"]["canAdd"] is False)
check("most-mentioned first, with examples and a fix hint", js["topics"][0]["key"]=="crash" and js["topics"][0]["examples"] and len(js["topics"][0]["suggestion"])>10)
check("no report of this app yet", js["hasReports"] is False and all(t["added"] is False for t in js["topics"]))

print("== 2. making it a task")
st,js,_=addt(mid,"crash")
check("without a report of the app there's no project to put it in (409 NO_REPORT)", st==409 and js.get("code")=="NO_REPORT", f"{st} {js}")
scan("alice@x.com","11111")
st,js,_=addt(mid,"crash")
check("with a report, it is added", st==200 and js["added"] is True and js["projectKey"]=="app:11111", f"{st} {js}")
st,js,_=addt(mid,"crash")
check("adding twice is harmless (added: false)", st==200 and js["added"] is False)
check("a topic with under 3 mentions is refused (400)", addt(mid,"login")[0]==400)
check("an unknown topic is refused (400)", addt(mid,"nope")[0]==400 and addt(mid,"__proto__")[0]==400 and req("POST",f"/api/pulse/monitors/{mid}/topics",cookie=ALICE,body={})[0]==400)
check("a topic nobody mentioned is refused (400)", addt(mid,"battery")[0]==400)
st,js,_=topics(mid)
check("the topic now shows as added", {t["key"]:t["added"] for t in js["topics"]}["crash"] is True and js["hasReports"] is True)

print("== 3. it lives in Tasks like any other task")
st,js,_=req("GET","/api/tasks?project=app:11111",cookie=ALICE)
tk={t["key"]:t for t in js["tasks"]} if st==200 else {}
x=tk.get("rev:crash",{})
check("the project lists it next to the report's own issue", st==200 and "contrast" in tk and x, f"{st} {list(tk)}")
check("built server-side from the real counts, marked as from reviews", x.get("title")=="Reviews: Crashes / won't open" and "3 of the 6" in x.get("finding","") and x.get("source")=="review" and x.get("status")=="todo" and x.get("severity")=="bad", x)
check("counted in the project's to-do total", js["counts"]["todo"]==2, js["counts"])
st,js,_=req("GET","/api/tasks",cookie=ALICE)
check("and in the projects overview", js["projects"][0]["counts"]["todo"]==2, js["projects"][0]["counts"])
st,js,_=req("PATCH","/api/tasks",cookie=ALICE,body={"project":"app:11111","key":"rev:crash","status":"done"})
check("it can be marked done", st==200 and js["counts"]["done"]==1, f"{st} {js}")
check("a made-up key still can't be tracked (400)", req("PATCH","/api/tasks",cookie=ALICE,body={"project":"app:11111","key":"rev:made-up","status":"done"})[0]==400)
st,js,_=req("GET","/api/tasks?project=app:11111",cookie=ALICE)
check("done sticks (there's no scan to say it 'came back')", {t["key"]:t for t in js["tasks"]}["rev:crash"]["status"]=="done" and not {t["key"]:t for t in js["tasks"]}["rev:crash"]["reappeared"])
st,_,md=req("GET","/api/tasks/export?project=app:11111&format=md",cookie=ALICE)
st2,_,csv=req("GET","/api/tasks/export?project=app:11111&format=csv",cookie=ALICE)
check("exports say it came from reviews", "from reviews" in md and "From user reviews" in csv and "Reviews: Crashes" in md, md[:300])

print("== 4. scope and ownership")
oth=monitor("alice@x.com","33333","other")
check("an 'other' app has no topics (404)", topics(oth)[0]==404 and addt(oth,"crash")[0]==404)
check("bob can't read or add on alice's app (404)", topics(mid,BOB)[0]==404 and addt(mid,"crash",BOB)[0]==404)
check("anonymous -> 401", req("GET",f"/api/pulse/monitors/{mid}/topics")[0]==401 and req("POST",f"/api/pulse/monitors/{mid}/topics",body={"topic":"crash"})[0]==401)
check("bad id -> 404", req("GET","/api/pulse/monitors/abc/topics",cookie=ALICE)[0]==404)
bm=monitor("bob@x.com","11111"); scan("bob@x.com","11111")
for t in ["crash one","crash two","crash three"]: review(bm,1,t)
check("bob (same app id) adds his own", addt(bm,"crash",BOB)[1]["added"] is True)
st,js,_=req("GET","/api/tasks?project=app:11111",cookie=BOB)
check("bob's project has only his task, with his counts", [t["key"] for t in js["tasks"] if t["key"].startswith("rev:")]==["rev:crash"] and "3 of the 3" in [t for t in js["tasks"] if t["key"]=="rev:crash"][0]["finding"], str(js)[:300])
st,js,_=req("GET","/api/tasks?project=app:11111",cookie=ALICE)
check("and alice's is untouched", "3 of the 6" in [t for t in js["tasks"] if t["key"]=="rev:crash"][0]["finding"])
check("bob can't mark alice's task (his project has none of hers, and keys are per user)", psql("select count(*) from task_status where user_email='bob@x.com'")=="0")

print("== 5. cleanup")
req("DELETE","/api/account/delete",cookie=BOB)
check("deleting an account removes its custom tasks too", psql("select count(*) from custom_tasks where user_email='bob@x.com'")=="0")
psql("delete from custom_tasks where user_email='alice@x.com'"); psql("delete from pulse_monitors where user_email='alice@x.com'"); psql("delete from scans where user_email='alice@x.com'"); psql("delete from task_status where user_email='alice@x.com'")
print(f"\nRESULT: {P} passed, {F} failed"); sys.exit(1 if F else 0)
