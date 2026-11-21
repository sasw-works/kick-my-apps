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

for t in ["scans","comparisons","rate_limits","email_codes","users","accounts","sessions","task_status","hidden_task_projects"]:
    try: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    except Exception: pass

def Fd(key,status): return {"key":key,"title":key.title(),"status":status,"finding":"f","suggestion":"s"}
def rj(*fs): return {"healthScore":60,"aiSummary":"x","findings":list(fs),"lensScores":{}}
def save(ck,app,res,store=""): return req("POST","/api/history",cookie=ck,body={"appName":app,"healthScore":60,"resultJson":res,"storeUrl":store})[1]["id"]
def proj(ck,key): return req("GET","/api/tasks?project="+urllib.parse.quote(key),cookie=ck)
def setst(ck,key,k,s): return req("PATCH","/api/tasks",cookie=ck,body={"project":key,"key":k,"status":s})

# admin@x.com is exempt from the Free plan report limit, so the test can save several reports
ALICE=signin("admin@x.com"); BOB=signin("bob@x.com")
URL="https://apps.apple.com/us/app/demo/id555555"
PK="app:555555"
a1=save(ALICE,"Demo",rj(Fd("contrast","bad"),Fd("cta","warn"),Fd("copy","bad")),URL)

print("== 1. projects and tasks")
st,js,_=req("GET","/api/tasks",cookie=ALICE)
check("one project, grouped by the store id", st==200 and len(js["projects"])==1 and js["projects"][0]["key"]==PK, js)
check("counts: 3 to do", js["projects"][0]["counts"]["todo"]==3, js["projects"][0]["counts"])
st,js,_=proj(ALICE,PK)
check("project view lists the 3 issues, critical first", [t["key"] for t in js["tasks"]][:2]==["contrast","copy"] or js["tasks"][0]["severity"]=="bad", js["tasks"])

print("== 2. setting status")
st,js,_=setst(ALICE,PK,"contrast","done")
check("mark done", st==200 and js["counts"]["done"]==1 and js["counts"]["todo"]==2, js)
st,js,_=setst(ALICE,PK,"cta","wontdo")
check("mark won't do", js["counts"]["wontdo"]==1, js)
st,js,_=proj(ALICE,PK)
check("statuses persist", {t["key"]:t["status"] for t in js["tasks"]}=={"contrast":"done","cta":"wontdo","copy":"todo"}, js["tasks"])
st,js,_=setst(ALICE,PK,"contrast","todo")
check("back to to-do removes it", js["counts"]["done"]==0 and js["counts"]["todo"]==2, js)
setst(ALICE,PK,"contrast","done")

print("== 3. input and ownership")
check("unknown category refused", setst(ALICE,PK,"__proto__","done")[0]==400)
check("invalid status refused", setst(ALICE,PK,"copy","hacked")[0]==400)
check("unknown project -> 404", setst(ALICE,"app:999999","copy","done")[0]==404)
check("another user can't see the project (404)", proj(BOB,PK)[0]==404)
check("...or change it (404)", setst(BOB,PK,"copy","done")[0]==404)
check("anonymous -> 401", req("GET","/api/tasks")[0]==401 and req("PATCH","/api/tasks",body={"project":PK,"key":"copy","status":"done"})[0]==401)
check("Bob's project list is empty, not Alice's", req("GET","/api/tasks",cookie=BOB)[1]["projects"]==[])
st,js,_=proj(ALICE,PK)
check("...and nothing changed after those attempts", {t["key"]:t["status"] for t in js["tasks"]}=={"contrast":"done","cta":"wontdo","copy":"todo"})

print("== 4. a new scan of the same app keeps the project's progress")
time.sleep(1.1)
a2=save(ALICE,"Demo (renamed)",rj(Fd("contrast","bad"),Fd("cta","warn"),Fd("copy","good"),Fd("trust","bad")),URL)
st,js,_=req("GET","/api/tasks",cookie=ALICE)
check("still ONE project (same store id, even though the name changed)", len(js["projects"])==1 and js["projects"][0]["reportCount"]==2, js)
st,js,_=proj(ALICE,PK)
by={t["key"]:t for t in js["tasks"]}
check("'won't do' survives the re-scan", by["cta"]["status"]=="wontdo")
check("'done' but flagged again by the newer scan -> back to to-do and 'came back'", by["contrast"]["status"]=="todo" and by["contrast"]["reappeared"] is True, by.get("contrast"))
check("a brand-new issue is marked new", by["trust"]["isNew"] is True and by["trust"]["status"]=="todo")
check("an issue the scan now reports as fine is 'verified fixed', not a task", "copy" not in by and [v["key"] for v in js["verified"]]==["copy"], js["verified"])
setst(ALICE,PK,"contrast","done")
check("marking it done again sticks (the tick is newer than the scan)", {t["key"]:t["status"] for t in proj(ALICE,PK)[1]["tasks"]}["contrast"]=="done")

print("== 5. the report page shows the statuses read-only")
st,js,_=req("GET",f"/api/history?id={a2}",cookie=ALICE)
check("latest report carries the task statuses", js.get("taskStatus")=={"contrast":"done","cta":"wontdo"}, js.get("taskStatus"))
st,js,_=req("GET",f"/api/history?id={a1}",cookie=ALICE)
check("the older report shows them too (both ticks were made after it existed)", set(js.get("taskStatus",{}).keys())=={"contrast","cta"}, js.get("taskStatus"))
check("the report API no longer exposes the legacy per-report field", "finding_status" not in json.dumps(js))

print("== 5b. score history for the trend chart")
st,js,_=req("GET",f"/api/history?id={a2}",cookie=ALICE)
h=js.get("history",[])
check("history has both scans of the app (same store id, despite the rename), oldest first", [x["id"] for x in h]==[a1,a2], h)
check("each point carries its score and per-lens scores", all("health_score" in x and "lens" in x for x in h) and h[0]["lens"]["UI"] is not None, h)
check("another app / name-only projects aren't mixed in", all(x["id"] in (a1,a2) for x in h))
st,js,_=req("GET",f"/api/history?id={a1}",cookie=ALICE)
check("an older report gets the whole series too (so it can show where it sits)", [x["id"] for x in js["history"]]==[a1,a2])
check("another user's history never includes Alice's reports", all(x["id"] not in (a1,a2) for x in req("GET",f"/api/history?id={save(BOB,'Demo',rj(Fd('cta','bad')),URL)}",cookie=BOB)[1]["history"]))

print("== 6. earlier per-report ticks are migrated")
b1=save(BOB,"Old",rj(Fd("contrast","bad"),Fd("cta","warn")),"")
psql(f"UPDATE scans SET finding_status = '{{\"contrast\":\"done\",\"cta\":\"wontfix\"}}'::jsonb WHERE id={b1}")
st,js,_=proj(BOB,"name:old")
check("legacy done / wontfix show up as done / won't do", {t["key"]:t["status"] for t in js["tasks"]}=={"contrast":"done","cta":"wontdo"}, js)
check("...and the legacy column is cleared (migrated once)", psql(f"select finding_status is null from scans where id={b1}")=="t")

print("== 6b. export")
def raw(m,p,cookie=None):
    c=http.client.HTTPConnection("localhost",3111,timeout=30); h={"Cookie":cookie} if cookie else {}
    c.request(m,p,headers=h); r=c.getresponse(); t=r.read().decode("utf-8","ignore"); hd={k.lower():v for k,v in r.getheaders()}; c.close(); return r.status,hd,t
q=urllib.parse.quote(PK)
st,hd,body=raw("GET",f"/api/tasks/export?project={q}&format=csv",ALICE)
check("CSV downloads as an attachment", st==200 and "text/csv" in hd["content-type"] and "attachment" in hd["content-disposition"] and ".csv" in hd["content-disposition"], (st,hd))
check("...with her real tasks in it, statuses included", "Contrast" in body and '"Done"' in body and '"Won\'t do"' in body.replace("'","\\'") or ("Won't do" in body), body[:300])
st,hd,body=raw("GET",f"/api/tasks/export?project={q}&format=md",ALICE)
check("Markdown downloads with a checklist", st==200 and "markdown" in hd["content-type"] and "- [x]" in body and "## Won't do" in body, body[:300])
check("export is never cached", hd.get("cache-control")=="no-store")
# (Bob has his own 'Demo' with the same store id from section 5b, so his export is 200 -- but it
# must contain only HIS data, never Alice's.)
st,_,bobcsv=raw("GET",f"/api/tasks/export?project={q}&format=csv",BOB)
check("another user's export of the same app contains only his own data", st==200 and "Cta" in bobcsv and "Contrast" not in bobcsv and "Trust" not in bobcsv, bobcsv[:200])
check("an app another user doesn't have -> 404", raw("GET","/api/tasks/export?project=app%3A424242&format=csv",BOB)[0]==404)
check("anonymous -> 401", raw("GET",f"/api/tasks/export?project={q}&format=csv")[0]==401)
check("unknown format -> 400", raw("GET",f"/api/tasks/export?project={q}&format=exe",ALICE)[0]==400)

print("== 7b. removing projects from the Tasks list")
save(ALICE,"Doomed",rj(Fd("cta","bad"),Fd("copy","warn")),"https://apps.apple.com/us/app/doomed/id909090")
psql("INSERT INTO scans (app_name,health_score,result_json,store_url,user_email) VALUES ('Doomed',60,$j$"+json.dumps(rj(Fd("cta","bad")))+"$j$::jsonb,'https://apps.apple.com/us/app/doomed/id909090','bob@x.com')")
DK="app:909090"
setst(ALICE,DK,"cta","done")
sid=lambda ck:[p["key"] for p in req("GET","/api/tasks",cookie=ck)[1]["projects"]]
check("signed-out delete is 401", req("DELETE","/api/tasks",body={"projects":[DK]})[0]==401)
check("a missing list is 400", req("DELETE","/api/tasks",cookie=ALICE,body={})[0]==400 and req("DELETE","/api/tasks",cookie=ALICE,body={"projects":[]})[0]==400)
st,js,_=req("DELETE","/api/tasks",cookie=ALICE,body={"projects":["app:777777","name:nobody"]})
check("keys she doesn't have are ignored (nothing removed)", st==200 and js["removed"]==0 and DK in sid(ALICE))
reports_before=psql("select count(*) from scans where user_email='admin@x.com'")
st,js,_=req("DELETE","/api/tasks",cookie=ALICE,body={"projects":[DK]})
check("removing a project works", st==200 and js["removed"]==1 and DK not in sid(ALICE), js)
check("...her progress on it is deleted", psql("select count(*) from task_status where user_email='admin@x.com' and project_key='app:909090'")=="0")
check("...her reports are NOT deleted", psql("select count(*) from scans where user_email='admin@x.com'")==reports_before)
check("...its page is gone too", proj(ALICE,DK)[0]==404)
check("...bob's copy of the same app is untouched", DK in sid(BOB))
time.sleep(1.1)
save(ALICE,"Doomed",rj(Fd("cta","bad"),Fd("copy","warn")),"https://apps.apple.com/us/app/doomed/id909090")
js=proj(ALICE,DK)[1]
check("analysing the app again brings it back, with fresh progress", DK in sid(ALICE) and {t["key"]:t["status"] for t in js["tasks"]}=={"cta":"todo","copy":"todo"}, js)
save(ALICE,"Doomed2",rj(Fd("cta","bad")),"https://apps.apple.com/us/app/doomed2/id808080")
check("several at once", req("DELETE","/api/tasks",cookie=ALICE,body={"projects":[DK,"app:808080"]})[1]["removed"]==2)


print("== 7. report-less projects and cleanup")
save(ALICE,"NoLink",rj(Fd("cta","bad")),"")
check("an app analyzed without a link is its own project, keyed by name", any(p["key"]=="name:nolink" for p in req("GET","/api/tasks",cookie=ALICE)[1]["projects"]))
req("DELETE","/api/account/delete",cookie=BOB)
check("deleting an account removes its task rows", psql("select count(*) from task_status where user_email='bob@x.com'")=="0")

print("== 8. rate limit")
psql("truncate rate_limits")
sts=[setst(ALICE,PK,"trust","done")[0] for _ in range(601)]
check("600/hour allowed, the 601st is refused", sts[:600]==[200]*600 and sts[600]==429, f"{set(sts[:600])} {sts[-1]}")

print(f"\nRESULT: {P} passed, {F} failed"); sys.exit(1 if F else 0)
