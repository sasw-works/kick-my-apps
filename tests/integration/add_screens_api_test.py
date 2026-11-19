import http.client, json, subprocess, urllib.parse, sys, threading, time, os, signal
from http.server import BaseHTTPRequestHandler, HTTPServer

# Adding screenshots to a report is tested against a local stand-in for Gemini (GEMINI_API_BASE), so it needs no real
# AI key and can check exactly what would be sent to the model. It starts its own app server on
# port 3112 (once without any AI key, once with a fake one) and leaves the others alone.
PORT=3112; FAKE_PORT=3999
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

# --- fake Gemini ---
seen=[]; behaviour={"mode":"ok","text":"{}","fail_next":0}
class H(BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def do_POST(self):
        body=json.loads(self.rfile.read(int(self.headers.get("content-length",0))) or b"{}")
        seen.append({"path":self.path,"key":self.headers.get("x-goog-api-key"),"prompt":body["contents"][0]["parts"][0]["text"],"imgs":sum(1 for p in body["contents"][0]["parts"] if "inline_data" in p)})
        mode=behaviour["mode"]
        if mode=="fail" or behaviour["fail_next"]>0:
            if behaviour["fail_next"]>0: behaviour["fail_next"]-=1
            self.send_response(500); self.end_headers(); self.wfile.write(b'{"error":"boom SECRET-FAKE-KEY"}'); return
        self.send_response(200); self.send_header("content-type","application/json"); self.end_headers()
        self.wfile.write(json.dumps({"candidates":[{"content":{"parts":[{"text":behaviour["text"]}]}}]}).encode())
httpd=HTTPServer(("127.0.0.1",FAKE_PORT),H); threading.Thread(target=httpd.serve_forever,daemon=True).start()

def start_server(extra_env):
    env=dict(os.environ); env.update({"POSTGRES_URL":"postgres://kma:kma@127.0.0.1:5432/kma_test","AUTH_SECRET":"test-secret-for-sandbox","AUTH_TRUST_HOST":"true","ADMIN_EMAILS":"admin@x.com","CRON_SECRET":"test-cron-secret"})
    for k in ("GEMINI_API_KEY","OPENROUTER_API_KEY","GEMINI_API_BASE"): env.pop(k,None)
    env.update(extra_env)
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

for t in ["scans","pulse_alerts","pulse_reviews","pulse_snapshots","pulse_monitors","rate_limits","email_codes","users","accounts","sessions"]:
    try: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    except Exception: pass
def monitor(email,app,name,kind="mine"):
    return psql(f"INSERT INTO pulse_monitors (user_email,app_id,country,app_name,developer,kind,alerts_enabled) VALUES ('{email}','{app}','us','{name}','Acme','{kind}',true) RETURNING id")
def review(mid,rid,rating,text,days_ago=1,how=None):
    h=f"'{how}'" if how else "NULL"; ha="now()-interval '1 hour'" if how else "NULL"
    psql(f"INSERT INTO pulse_reviews (monitor_id,review_id,rating,title,content,version,reviewed_at,handled_how,handled_at) VALUES ({mid},'{rid}',{rating},'',$t${text}$t$,'1.0',now()-interval '{days_ago} days',{h},{ha})")


JPG=b"\xff\xd8\xff\xe0"+b"0"*200
def multipart(files):
    b="----kmaboundary"; out=b""
    for name,data in files:
        out+=(f"--{b}\r\nContent-Disposition: form-data; name=\"files\"; filename=\"{name}\"\r\nContent-Type: image/jpeg\r\n\r\n").encode()+data+b"\r\n"
    out+=f"--{b}--\r\n".encode(); return out,f"multipart/form-data; boundary={b}"
def up(ck,sid,files):
    body,ct=multipart(files)
    c=http.client.HTTPConnection("localhost",PORT,timeout=60); h={"content-type":ct}
    if ck: h["Cookie"]=ck
    c.request("POST",f"/api/history/screens?id={sid}",body=body,headers=h); r=c.getresponse(); t=r.read().decode("utf-8","ignore"); c.close()
    try: js=json.loads(t)
    except Exception: js=None
    return r.status,js,t
def newscan(email,findings):
    return int(psql(f"INSERT INTO scans (app_name,health_score,bad_count,warn_count,good_count,result_json,store_url,user_email) VALUES ('Linked App',80,0,1,2,$j${json.dumps({'healthScore':80,'aiSummary':'sum','findings':findings,'lensScores':{}})}$j$::jsonb,'https://apps.apple.com/us/app/x/id555555','{email}') RETURNING id"))
BASE=[{"key":"copy","title":"Copy ok","status":"good","finding":"f","suggestion":"s"},{"key":"cta","title":"Old CTA","status":"good","finding":"f","suggestion":"s"},{"key":"trust","title":"Trust","status":"warn","finding":"f","suggestion":"s"}]
VIS={"healthScore":50,"findings":[{"key":"cta","title":"Weak button","status":"bad","finding":"Faint on screen 2.","suggestion":"Bolder.","screenshotIndex":2,"boundingBox":{"x":10,"y":20,"width":30,"height":10}},{"key":"contrast","title":"Low contrast","status":"warn","finding":"Grey on white.","suggestion":"Darken.","screenshotIndex":1,"boundingBox":None}],"approvalRisks":[],"compatibility":None,"accessibilityChecks":[{"check":"contrast","status":"warn","note":"Looks low.","standard":"WCAG 1.4.3"}]}

procs=start_server({})
try:
    ALICE=signin("alice@x.com"); sid=newscan("alice@x.com",BASE)
    print("== 1. no AI key")
    check("signed out -> 401",up(None,sid,[("a.jpg",JPG)])[0]==401)
    check("valid request without a key -> 503",up(ALICE,sid,[("a.jpg",JPG)])[0]==503)
finally: stop(procs)

procs=start_server({"GEMINI_API_KEY":"SECRET-FAKE-KEY","GEMINI_API_BASE":f"http://127.0.0.1:{FAKE_PORT}"})
try:
    ALICE=signin("alice@x.com"); BOB=signin("bob@x.com"); ADMIN=signin("admin@x.com")
    print("== 2. input rules")
    check("someone else's and unknown reports are 404",up(BOB,sid,[("a.jpg",JPG)])[0]==404 and up(ALICE,"99999",[("a.jpg",JPG)])[0]==404 and up(ALICE,"abc",[("a.jpg",JPG)])[0]==404)
    check("no files and nine files -> 400",up(ALICE,sid,[])[0]==400 and up(ALICE,sid,[(f"{i}.jpg",JPG) for i in range(9)])[0]==400)
    check("a text file named .jpg is refused by its bytes",up(ALICE,sid,[("a.jpg",b"<html>not an image at all</html>")])[0]==400)
    check("a file over 700 KB -> 413",up(ALICE,sid,[("big.jpg",b"\xff\xd8\xff\xe0"+b"0"*(701*1024))])[0]==413)
    check("nothing was sent to the model for those",len(seen)==0)
    print("== 3. analysis and merge")
    behaviour["text"]="not json"; st,js,_=up(ALICE,sid,[("a.jpg",JPG),("b.jpg",JPG)])
    check("an unusable answer -> 502 and the report is unchanged",st==502 and psql(f"SELECT health_score FROM scans WHERE id={sid}")=="80" and psql(f"SELECT result_json ? 'visualAdded' FROM scans WHERE id={sid}")=="f",str(js))
    behaviour["mode"]="fail"; st,js,body=up(ALICE,sid,[("a.jpg",JPG)])
    check("provider trouble -> 502 without provider detail",st==502 and "SECRET" not in body and "boom" not in body); behaviour["mode"]="ok"
    behaviour["text"]=json.dumps(VIS); n=len(seen); st,js,_=up(ALICE,sid,[("a.jpg",JPG),("b.jpg",JPG)])
    check("success reports what was added and the score change",st==200 and js["added"]==2 and js["scoreBefore"]==80 and js["scoreAfter"]==68 and js["runs"]==1,str(js))
    check("the model got both images and the known findings, key only in the header",len(seen)==n+1 and seen[n]["imgs"]==2 and "Copy ok" in seen[n]["prompt"] and seen[n]["key"]=="SECRET-FAKE-KEY")
    check("row: score, counts and merged findings",psql(f"SELECT health_score||'|'||bad_count||'|'||warn_count||'|'||good_count FROM scans WHERE id={sid}")=="68|1|2|1" and psql(f"SELECT string_agg(f->>'key', ',') FROM scans, jsonb_array_elements(result_json->'findings') f WHERE id={sid}")=="copy,trust,cta,contrast")
    check("both screenshots are stored",psql(f"SELECT jsonb_array_length(screens_json) FROM scans WHERE id={sid}")=="2")
    st,js,_=req("GET",f"/api/history?id={sid}",cookie=ALICE)
    check("the report page data has the new findings, no internal copy, and says the viewer owns it",st==200 and "_base" not in js["scan"]["result_json"] and js["scan"]["result_json"]["visualAdded"]["runs"]==1 and js["isOwner"] is True)
    st,js,_=req("GET",f"/api/history/screens?id={sid}",cookie=ALICE)
    check("owner can read the screenshots; they are data URLs",st==200 and len(js["screens"])==2 and js["screens"][0].startswith("data:image/jpeg;base64,"))
    check("an admin can read them, another user cannot",req("GET",f"/api/history/screens?id={sid}",cookie=ADMIN)[0]==200 and req("GET",f"/api/history/screens?id={sid}",cookie=BOB)[0]==404 and req("GET",f"/api/history/screens?id={sid}")[0]==401)
    print("== 4. replacing")
    behaviour["text"]=json.dumps({"healthScore":90,"findings":[{"key":"navigation","title":"Clear nav","status":"good","finding":"Tabs are clear.","suggestion":"Keep.","screenshotIndex":None,"boundingBox":None}]})
    st,js,_=up(ALICE,sid,[("c.jpg",JPG)])
    check("second upload replaces the first: original findings back, new ones added, no pile-up",st==200 and js["runs"]==2 and psql(f"SELECT string_agg(f->>'key', ',' ORDER BY f->>'key') FROM scans, jsonb_array_elements(result_json->'findings') f WHERE id={sid}")=="copy,cta,navigation,trust" and psql(f"SELECT jsonb_array_length(screens_json) FROM scans WHERE id={sid}")=="1",str(js))
    check("score is blended from the original (80x3 + 90x1)/4 = 83",js["scoreBefore"]==80 and js["scoreAfter"]==83,str(js))
    st,js,_=up(ALICE,sid,[("d.jpg",JPG)]); check("a third upload is refused (2 per report)",st==403 and js["code"]=="SCREENS_LIMIT",str(js))
    check("an admin cannot add screenshots to someone else's report",up(ADMIN,newscan("alice@x.com",BASE),[("a.jpg",JPG)])[0]==404)
finally: stop(procs)
print(f"\n{P} passed, {F} failed"); sys.exit(1 if F else 0)
