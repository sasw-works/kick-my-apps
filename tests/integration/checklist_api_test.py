import http.client, json, subprocess, urllib.parse, sys, time, os, signal

# The Checklist's per-app part: /api/checklist (open critical tasks read live from Tasks, findings pinned from a
# report, the person's own items). Starts its own app server on port 3113.
PORT=3113
PG=["psql","-h","127.0.0.1","-U","kma","-d","kma_test","-tA","-v","ON_ERROR_STOP=1"]
def psql(q):
    r=subprocess.run(PG+["-c",q],capture_output=True,text=True,env={"PGPASSWORD":"kma","PATH":"/usr/bin:/bin"})
    if r.returncode: raise RuntimeError(r.stderr)
    out=r.stdout.strip().splitlines(); return out[0] if out else ""
def req(m,p,cookie=None,body=None):
    c=http.client.HTTPConnection("localhost",PORT,timeout=40); h={}; d=None
    if cookie:h["Cookie"]=cookie
    if body is not None: d=json.dumps(body); h["content-type"]="application/json"
    c.request(m,p,body=d,headers=h); r=c.getresponse(); t=r.read().decode("utf-8","ignore"); c.close()
    try: js=json.loads(t)
    except Exception: js=None
    return r.status,js,t
def signin(email,code="123456"):
    psql("""CREATE TABLE IF NOT EXISTS email_codes (email TEXT PRIMARY KEY, code TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, attempts INTEGER NOT NULL DEFAULT 0)""")
    psql(f"INSERT INTO email_codes VALUES ('{email}','123456',now()+interval '10 min',0) ON CONFLICT (email) DO UPDATE SET code='123456',expires_at=now()+interval '10 min',attempts=0")
    c=http.client.HTTPConnection("localhost",PORT,timeout=20); c.request("GET","/api/auth/csrf"); r=c.getresponse()
    js=json.loads(r.read().decode()); ck=r.msg.get_all("Set-Cookie") or []; c.close()
    cc=next(x.split(";")[0] for x in ck if x.startswith("authjs.csrf-token"))
    c=http.client.HTTPConnection("localhost",PORT,timeout=20)
    b=urllib.parse.urlencode({"csrfToken":js["csrfToken"],"email":email,"code":code,"callbackUrl":f"http://localhost:{PORT}/console","json":"true"})
    c.request("POST","/api/auth/callback/email-code",body=b,headers={"Cookie":cc,"content-type":"application/x-www-form-urlencoded"})
    r=c.getresponse(); r.read(); ck2=r.msg.get_all("Set-Cookie") or []; c.close()
    return next((x.split(";")[0] for x in ck2 if x.startswith("authjs.session-token")),None)
P=F=0
def check(n,c,d=""):
    global P,F
    if c: P+=1; print(f"  ok   {n}")
    else: F+=1; print(f"  FAIL {n}   {d}")
def start_server():
    env=dict(os.environ); env.update({"POSTGRES_URL":"postgres://kma:kma@127.0.0.1:5432/kma_test","AUTH_SECRET":"test-secret-for-sandbox","AUTH_TRUST_HOST":"true","ADMIN_EMAILS":"admin@x.com","CRON_SECRET":"test-cron-secret"})
    for k in ("GEMINI_API_KEY","OPENROUTER_API_KEY","GEMINI_API_BASE"): env.pop(k,None)
    proc=subprocess.Popen(["npx","next","start","-p",str(PORT)],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,preexec_fn=os.setsid)
    for _ in range(60):
        try:
            c=http.client.HTTPConnection("localhost",PORT,timeout=2); c.request("GET","/api/auth/csrf"); c.getresponse().read(); c.close(); return proc
        except Exception: time.sleep(1)
    raise RuntimeError("server didn't start")
def stop(proc):
    try: os.killpg(os.getpgid(proc.pid),signal.SIGTERM)
    except Exception: pass
    time.sleep(1)

for t in ["checklist_items","task_status","custom_tasks","hidden_task_projects","scans","rate_limits","email_codes","users","accounts","sessions"]:
    try: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    except Exception: pass

FIND=[{"key":"contrast","title":"Low contrast","status":"bad","finding":"f","suggestion":"Raise it"},
      {"key":"cta","title":"Weak call to action","status":"warn","finding":"f","suggestion":"Say it"},
      {"key":"icon","title":"Icon is fine","status":"good","finding":"f","suggestion":""}]
URL="https://apps.apple.com/us/app/spotify/id324684580"
proc=start_server()
try:
    A=signin("alice@x.com"); B=signin("bob@x.com")
    for m in ("GET","POST","PATCH","DELETE"):
        check(f"signed-out {m} is 401",req(m,"/api/checklist",None,{} if m!="GET" else None)[0]==401)
    s,js,_=req("GET","/api/checklist",A); check("no reports: no apps",s==200 and js["projects"]==[],str(js))
    s,js,_=req("POST","/api/history",A,{"appName":"Spotify","storeUrl":URL,"healthScore":60,"badCount":1,"warnCount":1,"goodCount":1,"resultJson":{"healthScore":60,"findings":FIND}})
    check("report saved",s==200,str(js))
    s,js,_=req("GET","/api/checklist",A); pk=js["projects"][0]["key"] if js["projects"] else ""
    check("the app is listed with its open critical count",pk=="app:324684580" and js["projects"][0]["openCritical"]==1,str(js))
    check("another user sees none of it",req("GET","/api/checklist",B)[1]["projects"]==[])
    s,js,_=req("GET",f"/api/checklist?project={pk}",A)
    check("critical issues come from Tasks (only the critical one)",s==200 and [c["key"] for c in js["critical"]]==["contrast"] and js["pinned"]==[] and js["custom"]==[],str(js))
    check("someone else's app is 404",req("GET",f"/api/checklist?project={pk}",B)[0]==404)
    # pin
    s,js,_=req("POST","/api/checklist",A,{"projectKey":pk,"findingKey":"cta"}); check("pin a finding",s==200 and js["added"] is True,str(js))
    s,js,_=req("POST","/api/checklist",A,{"projectKey":pk,"findingKey":"cta"}); check("pinning twice adds nothing",s==200 and js["added"] is False,str(js))
    check("a finding that is not in the report is 404",req("POST","/api/checklist",A,{"projectKey":pk,"findingKey":"nope"})[0]==404)
    check("someone else cannot pin to my app",req("POST","/api/checklist",B,{"projectKey":pk,"findingKey":"cta"})[0]==404)
    s,js,_=req("GET",f"/api/checklist?project={pk}",A)
    check("pinned shows with its state from Tasks (todo)",[ (p["key"],p["status"]) for p in js["pinned"]]==[("cta","todo")],str(js))
    # pin the critical one: it moves from the live list to pinned (no duplicate)
    req("POST","/api/checklist",A,{"projectKey":pk,"findingKey":"contrast"})
    js=req("GET",f"/api/checklist?project={pk}",A)[1]
    check("a pinned critical issue is not listed twice",js["critical"]==[] and sorted(p["key"] for p in js["pinned"])==["contrast","cta"],str(js))
    # tick in Tasks -> Checklist follows
    s,_,_=req("PATCH","/api/tasks",A,{"project":pk,"key":"contrast","status":"done"}); check("tick it in Tasks",s==200)
    js=req("GET",f"/api/checklist?project={pk}",A)[1]
    st={p["key"]:p["status"] for p in js["pinned"]}
    check("Checklist follows Tasks (done)",st["contrast"]=="done" and st["cta"]=="todo",str(js))
    req("PATCH","/api/tasks",A,{"project":pk,"key":"cta","status":"wontdo"})
    js=req("GET",f"/api/checklist?project={pk}",A)[1]
    check("won't do is shown as such",{p["key"]:p["status"] for p in js["pinned"]}["cta"]=="wontdo",str(js))
    # a fix confirmed by a newer report
    req("POST","/api/history",A,{"appName":"Spotify","storeUrl":URL,"healthScore":90,"badCount":0,"warnCount":0,"goodCount":3,"resultJson":{"healthScore":90,"findings":[{**f,"status":"good"} for f in FIND]}})
    js=req("GET",f"/api/checklist?project={pk}",A)[1]
    check("a finding the newest report no longer flags counts as fixed",all(p["status"]=="done" for p in js["pinned"]) and any(p["confirmedByScan"] for p in js["pinned"]),str(js))
    # own items
    check("an empty item is refused",req("POST","/api/checklist",A,{"projectKey":pk,"title":"   "})[0]==400)
    s,js,_=req("POST","/api/checklist",A,{"projectKey":pk,"title":"Re-record the onboarding screenshots"}); cid=js.get("id"); check("add your own item",s==200 and cid)
    js=req("GET",f"/api/checklist?project={pk}",A)[1]
    check("it is listed, unticked",[(c["title"],c["checked"]) for c in js["custom"]]==[("Re-record the onboarding screenshots",False)],str(js))
    check("tick it",req("PATCH","/api/checklist",A,{"id":cid,"checked":True})[0]==200 and req("GET",f"/api/checklist?project={pk}",A)[1]["custom"][0]["checked"] is True)
    check("bad PATCH body is 400",req("PATCH","/api/checklist",A,{"id":cid,"checked":"yes"})[0]==400)
    check("someone else cannot tick it",req("PATCH","/api/checklist",B,{"id":cid,"checked":False})[0]==404)
    check("someone else cannot delete it",req("DELETE","/api/checklist",B,{"id":cid})[0]==404)
    long="x"*300; req("POST","/api/checklist",A,{"projectKey":pk,"title":long})
    js=req("GET",f"/api/checklist?project={pk}",A)[1]; check("titles are cut to 160 characters",max(len(c["title"]) for c in js["custom"])==160)
    for i in range(60): req("POST","/api/checklist",A,{"projectKey":pk,"title":f"item {i}"})
    s,js,_=req("POST","/api/checklist",A,{"projectKey":pk,"title":"one too many"}); check("at most 50 own items per app",s==400,str(js))
    # remove
    pid=req("GET",f"/api/checklist?project={pk}",A)[1]["pinned"][0]["id"]
    check("remove a pinned item",req("DELETE","/api/checklist",A,{"id":pid})[0]==200)
    check("it is gone",all(p["id"]!=pid for p in req("GET",f"/api/checklist?project={pk}",A)[1]["pinned"]))
    check("remove your own item",req("DELETE","/api/checklist",A,{"id":cid})[0]==200)
    # account deletion wipes it
    n=psql("SELECT count(*) FROM checklist_items WHERE user_email='alice@x.com'"); check("rows exist before account deletion",int(n)>0)
    s,_,_=req("DELETE","/api/account/delete",A)
    n=psql("SELECT count(*) FROM checklist_items WHERE user_email='alice@x.com'"); check("deleting the account removes the checklist rows",s==200 and int(n)==0,f"{s} {n}")
finally:
    stop(proc)
print(P,"passed",F,"failed"); sys.exit(1 if F else 0)
