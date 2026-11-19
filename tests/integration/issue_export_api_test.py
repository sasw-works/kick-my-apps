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

# Issue-tracker exports and the App Health badge, with seeded data (no network).
for t in ["scans","task_status","custom_tasks","rate_limits","email_codes","users","accounts","sessions"]:
    try: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    except Exception: pass
ALICE=signin("alice@x.com"); BOB=signin("bob@x.com")
req("GET","/api/history",cookie=ALICE); req("GET","/api/tasks",cookie=ALICE)
def scan(email,app,score):
    f=json.dumps([{"key":"contrast","title":"Fix low contrast","status":"bad","finding":"Hard to read","suggestion":"Darken it"},{"key":"cta","title":"Weak button","status":"warn","finding":"f","suggestion":"s"}])
    return psql(f"INSERT INTO scans (app_name,health_score,result_json,store_url,user_email) VALUES ('App {app}',{score},$j${{\"healthScore\":{score},\"aiSummary\":\"x\",\"findings\":{f},\"lensScores\":{{}}}}$j$::jsonb,'https://apps.apple.com/us/app/x/id{app}','{email}') RETURNING id")
sid=scan("alice@x.com","11111",82); scan("bob@x.com","22222",40)
psql("INSERT INTO task_status (user_email,project_key,finding_key,status) VALUES ('alice@x.com','app:11111','cta','done')")
exp=lambda fmt,ck=ALICE,pk="app:11111": req("GET",f"/api/tasks/export?project={urllib.parse.quote(pk)}&format={fmt}",cookie=ck)

print("== 1. exports")
for fmt,ctype,fname in [("linear","text/csv","linear-import.csv"),("jira","text/csv","jira-import.csv"),("github","text/x-shellscript","github-issues.sh")]:
    c=http.client.HTTPConnection("localhost",3111,timeout=20); c.request("GET",f"/api/tasks/export?project=app%3A11111&format={fmt}",headers={"Cookie":ALICE}); r=c.getresponse(); body=r.read().decode(); c.close()
    check(f"{fmt}: 200, right type, download name", r.status==200 and r.getheader("content-type","").startswith(ctype) and fname in (r.getheader("content-disposition") or "") and r.getheader("cache-control")=="no-store", f"{r.status} {r.getheader('content-type')} {r.getheader('content-disposition')}")
    check(f"{fmt}: only the open task (the one marked done is left out)", "Fix low contrast" in body and "Weak button" not in body, body[:200])
check("md and csv still work", exp("md")[0]==200 and exp("csv")[0]==200)
check("unknown format -> 400", exp("xml")[0]==400 and exp("")[0]==400)
check("another user's project -> 404 for every format", all(exp(f,BOB)[0]==404 for f in ["linear","jira","github","md"]))
check("anonymous -> 401", req("GET","/api/tasks/export?project=app%3A11111&format=jira")[0]==401)

print("== 2. the badge")
def raw(path,method="GET"):
    c=http.client.HTTPConnection("localhost",3111,timeout=20); c.request(method,path); r=c.getresponse(); b=r.read().decode("utf-8","ignore"); h=dict(r.getheaders()); c.close(); return r.status,h,b
st,js,_=req("POST",f"/api/history/share?id={sid}",cookie=ALICE); tok=js["token"] if js else None
check("(setup) the report is shared", st==200 and tok)
st,h,b=raw(f"/api/badge/{tok}")
check("a shared report's badge is an svg with its score", st==200 and h["content-type"].startswith("image/svg+xml") and "82/100" in b and "app health" in b, f"{st} {h.get('content-type')} {b[:120]}")
check("safe headers: nosniff, restrictive CSP, short public cache", h.get("x-content-type-options")=="nosniff" and "default-src 'none'" in h.get("content-security-policy","") and "max-age=300" in h.get("cache-control",""))
check("the badge carries nothing but the score (no app name, owner or token)", "App 11111" not in b and "alice" not in b and tok not in b)
for bad in ["short","a"*31,"a"*33,"../../etc/passwd","<script>"]:
    st,h,b=raw("/api/badge/"+urllib.parse.quote(bad,safe="")); check(f"not a token -> 404 'unavailable' badge: {bad[:20]}", st==404 and "unavailable" in b and h.get("cache-control")=="no-store", f"{st}")
st,h,b=raw("/api/badge/"+"A"*32); check("an unknown valid-looking token -> 404 'unavailable'", st==404 and "unavailable" in b)
req("DELETE",f"/api/history/share?id={sid}",cookie=ALICE)
st,h,b=raw(f"/api/badge/{tok}"); check("after 'Stop sharing' the badge stops working at once", st==404 and "unavailable" in b and "82/100" not in b)
st,js,_=req("POST",f"/api/history/share?id={sid}",cookie=ALICE); tok2=js["token"]
check("a new share link gives a new token (the old badge stays dead)", tok2!=tok and raw(f"/api/badge/{tok}")[0]==404 and raw(f"/api/badge/{tok2}")[0]==200)
print(f"\n{P} passed, {F} failed"); sys.exit(1 if F else 0)
