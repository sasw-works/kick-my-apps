import http.client, json, subprocess, urllib.parse, sys, threading, time, os, signal
from http.server import BaseHTTPRequestHandler, HTTPServer

# Weekly product brief: settings, preview, send-now, one-click opt-out and the cron, against a fake
# Resend and a local chat receiver. Starts its own app server on port 3112.
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



RECV=3998; RESEND=3997
chat=[]; mails=[]; resend_status={"v":200}
class H(BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def do_POST(self):
        b=json.loads(self.rfile.read(int(self.headers.get("content-length",0))) or b"{}")
        if self.path=="/emails": mails.append({"body":b,"auth":self.headers.get("authorization")}); self.send_response(resend_status["v"]); self.end_headers(); self.wfile.write(b'{"id":"x"}'); return
        chat.append({"path":self.path,"body":b}); self.send_response(200); self.end_headers()
for port in (RECV,RESEND):
    threading.Thread(target=HTTPServer(("127.0.0.1",port),H).serve_forever,daemon=True).start()
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



for t in ["brief_settings","notification_channels","pulse_changes","pulse_reviews","pulse_snapshots","pulse_monitors","scans","task_status","rate_limits","email_codes","users","accounts","sessions"]:
    try: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    except Exception: pass
ENV={"WEBHOOK_ALLOW_PRIVATE":"1","RESEND_API_KEY":"re_FAKE_KEY","RESEND_API_BASE":f"http://127.0.0.1:{RESEND}","CRON_SECRET":"test-cron-secret"}
proc=start_server(ENV)
try:
    ALICE=signin("alice@x.com"); BOB=signin("bob@x.com"); CAROL=signin("carol@x.com")
    req("GET","/api/pulse/monitors",cookie=ALICE); req("GET","/api/account/notifications",cookie=ALICE); req("GET","/api/account/brief",cookie=ALICE); req("GET","/api/tasks",cookie=ALICE)
    mid=psql("INSERT INTO pulse_monitors (user_email,app_id,country,app_name,developer,kind,alerts_enabled) VALUES ('alice@x.com','11111','us',$n$Alice <b>App</b>$n$,'D','mine',true) RETURNING id")
    psql(f"INSERT INTO pulse_snapshots (monitor_id,version,avg_rating,rating_count,new_review_count,new_negative_count,is_baseline,taken_at) VALUES ({mid},'1.0',4.0,10,2,1,false,now()-interval '1 day')")
    psql("INSERT INTO pulse_monitors (user_email,app_id,country,app_name,developer,kind,alerts_enabled) VALUES ('bob@x.com','22222','us','BobApp','D','mine',true)")
    brief=lambda ck=ALICE: req("GET","/api/account/brief",cookie=ck)
    put=lambda ck=ALICE,**b: req("PUT","/api/account/brief",cookie=ck,body=b)
    send=lambda ch,ck=ALICE: req("POST","/api/account/brief",cookie=ck,body={"channel":ch})

    print("== 1. settings (opt-in, off by default)")
    st,js,_=brief(); s=js["settings"]
    check("everything is off by default; email available, no chat channel yet",st==200 and s["emailOn"] is False and s["chatOn"] is False and s["emailAvailable"] is True and s["hasChannel"] is False,str(js))
    check("anonymous -> 401 on every verb",all(req(m,"/api/account/brief",body={"emailOn":True} if m=="PUT" else ({"channel":"email"} if m=="POST" else None))[0]==401 for m in ("GET","PUT","POST")))
    check("bad types and empty updates -> 400",put(emailOn="yes")[0]==400 and put()[0]==400 and req("PUT","/api/account/brief",cookie=ALICE,body=None)[0]==400)
    st,js,_=put(chatOn=True); check("chat can't be turned on without a channel",st==400 and js["code"]=="NO_CHANNEL")
    st,js,_=put(emailOn=True); check("email on",st==200 and js["settings"]["emailOn"] is True and js["settings"]["chatOn"] is False)
    check("a second change keeps the first",put(emailOn=False)[1]["settings"]["emailOn"] is False and put(emailOn=True)[1]["settings"]["emailOn"] is True)
    check("bob's settings are his own",brief(BOB)[1]["settings"]["emailOn"] is False)

    print("== 2. preview")
    st,js,_=req("GET","/api/account/brief?preview=1",cookie=ALICE)
    check("preview has this week's numbers",st==200 and js["preview"]["empty"] is False and "Alice <b>App</b>: 4.00 ★, 2 new reviews (1 negative)" in js["preview"]["text"],str(js)[:300])
    check("a user with nothing gets an empty preview",req("GET","/api/account/brief?preview=1",cookie=CAROL)[1]["preview"]["empty"] is True)

    print("== 3. send now")
    st,js,_=send("email"); check("email goes out",st==200 and len(mails)==1,f"{st} {js}")
    m=mails[0]["body"]
    check("only to the signed-in address, with the fake key, a subject and the app name escaped",m["to"]=="alice@x.com" and mails[0]["auth"]=="Bearer re_FAKE_KEY" and m["subject"]=="Your week in apps" and "Alice &lt;b&gt;App&lt;/b&gt;" in m["html"] and "<b>App</b>" not in m["html"],str(m)[:300])
    tok=psql("SELECT unsub_token FROM brief_settings WHERE user_email='alice@x.com'")
    check("one-click opt-out link and header carry her token",f"type=brief&amp;token={tok}" in m["html"] and tok in m["headers"]["List-Unsubscribe"])
    st,js,_=send("chat"); check("chat without a channel -> 404 NO_CHANNEL",st==404 and js["code"]=="NO_CHANNEL")
    req("PUT","/api/account/notifications",cookie=ALICE,body={"url":f"http://127.0.0.1:{RECV}/hook","kind":"slack"})
    st,js,_=send("chat"); check("chat goes to her channel in slack shape",st==200 and len(chat)==1 and chat[0]["body"]["text"].startswith("*Your week in apps*") and "4.00 ★" in chat[0]["body"]["text"],f"{st} {js} {chat}")
    check("chat can be turned on once there is a channel",put(chatOn=True)[1]["settings"]["chatOn"] is True and brief()[1]["settings"]["hasChannel"] is True)
    st,js,_=send("email",CAROL); check("nothing to report -> 409 EMPTY, nothing sent",st==409 and js["code"]=="EMPTY" and len(mails)==1)
    check("unknown channel -> 400",req("POST","/api/account/brief",cookie=ALICE,body={"channel":"sms"})[0]==400)
    resend_status["v"]=500; st,js,body=send("email"); check("provider trouble -> 502, no provider detail",st==502 and "500" not in js["error"] and "re_FAKE" not in body,f"{st} {js}"); resend_status["v"]=200
    codes=[send("email",BOB)[0] for _ in range(6)]; check("limited to 5 sends per hour",429 in codes,str(codes))

    print("== 4. one-click opt-out (public)")
    pub=lambda m,t: req(m,"/api/brief/unsubscribe?token="+urllib.parse.quote(t))
    st,js,_=pub("GET",tok); check("lookup finds it and changes nothing",st==200 and js["found"] is True and js["active"] is True and brief()[1]["settings"]["emailOn"] is True)
    check("unknown token: not found",pub("GET","nope")[1]["found"] is False)
    check("missing token -> 400",req("GET","/api/brief/unsubscribe")[0]==400 and req("DELETE","/api/brief/unsubscribe")[0]==400)
    st,js,_=pub("DELETE",tok); check("DELETE turns email off, keeps chat",st==200 and js["changed"] is True and brief()[1]["settings"]["emailOn"] is False and brief()[1]["settings"]["chatOn"] is True)
    check("an unknown token on DELETE changes nothing and is still fine",pub("DELETE","nope")[1]["changed"] is False)

    print("== 5. the weekly cron")
    cron=lambda ck="Bearer test-cron-secret": (lambda c: (c.request("GET","/api/cron/weekly-brief",headers={"authorization":ck} if ck else {}),(lambda r:(r.status,json.loads(r.read().decode() or "{}")))(c.getresponse()))[1])(http.client.HTTPConnection("localhost",PORT,timeout=60))
    check("no secret / wrong secret -> 401",cron(None)[0]==401 and cron("Bearer wrong")[0]==401)
    mails.clear(); chat.clear()
    put(emailOn=True,chatOn=True); put(BOB,emailOn=True) if False else req("PUT","/api/account/brief",cookie=BOB,body={"emailOn":True}); req("PUT","/api/account/brief",cookie=CAROL,body={"emailOn":True})
    psql("UPDATE brief_settings SET last_sent_at=NULL")
    st,js=cron(); check("runs for everyone who opted in; an empty brief (carol) isn't sent",st==200 and js["due"]==3 and js["sent"]==2 and js["empty"]==1,str(js))
    check("alice got both email and chat, bob an email only, carol nothing",sorted(m["body"]["to"] for m in mails)==["alice@x.com","bob@x.com"] and len(chat)==1)
    check("everyone due is stamped as sent",psql("SELECT count(*) FROM brief_settings WHERE last_sent_at IS NOT NULL AND (email_on OR chat_on)")=="3")
    mails.clear(); chat.clear(); st,js=cron(); check("a second run the same week sends nothing",js["due"]==0 and not mails and not chat,str(js))
    psql("UPDATE brief_settings SET last_sent_at=now()-interval '8 days' WHERE user_email='bob@x.com'")
    resend_status["v"]=500; st,js=cron()
    check("when every channel fails the claim is given back, so it is retried",js["failed"]==1 and psql("SELECT (now()-last_sent_at) > interval '7 days' FROM brief_settings WHERE user_email='bob@x.com'")=="t",str(js))
    resend_status["v"]=200; st,js=cron(); check("and the retry succeeds",js["sent"]==1 and [m["body"]["to"] for m in mails][-1]=="bob@x.com",str(js))
    psql("UPDATE brief_settings SET email_on=false, chat_on=false")
    psql("UPDATE brief_settings SET last_sent_at=NULL"); mails.clear(); chat.clear()
    check("people with everything off are never picked",cron()[1]["due"]==0 and not mails)

    print("== 6. account deletion")
    st,_,_=req("DELETE","/api/account/delete",cookie=BOB)
    check("deleting the account removes its brief settings",st==200 and psql("SELECT count(*) FROM brief_settings WHERE user_email='bob@x.com'")=="0")
finally: stop(proc)
print(f"\n{P} passed, {F} failed"); sys.exit(1 if F else 0)
