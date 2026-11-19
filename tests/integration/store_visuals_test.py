import http.client, json, subprocess, urllib.parse, sys, threading, time, os, signal
from http.server import BaseHTTPRequestHandler, HTTPServer

# The endpoint is tested against a local stand-in for Gemini (GEMINI_API_BASE), so it needs no real
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

# --- fake Gemini: records what it was sent, answers with a messy JSON review ---
seen=[]; behaviour={"mode":"ok"}
REVIEW={"icon":{"rating":"STRONG","notes":["Simple and distinctive.","b","c","d-dropped"]},
 "firstImpression":{"rating":"weak","note":"The first screenshot is mostly a logo."},
 "screenshots":[{"index":2,"issue":"catastrophic","note":"Caption is tiny."},{"index":1,"issue":"high","note":"Cluttered."},{"index":99,"issue":"low","note":"out of range"},{"index":1,"issue":"low","note":"duplicate"}],
 "consistency":"Colours drift after #3.","suggestions":["a","b","c","d","e-dropped"],"extra":"<script>x</script>"}
class H(BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def do_POST(self):
        body=json.loads(self.rfile.read(int(self.headers.get("content-length",0))) or b"{}")
        parts=body["contents"][0]["parts"]
        seen.append({"key":self.headers.get("x-goog-api-key"),"prompt":parts[0]["text"],"images":[p for p in parts if "inline_data" in p],"json":body["generationConfig"].get("responseMimeType")})
        if behaviour["mode"]=="fail":
            self.send_response(500); self.end_headers(); self.wfile.write(b'{"error":"boom SECRET-FAKE-KEY"}'); return
        text=behaviour.get("text") or "Here you go:\n```json\n"+json.dumps(REVIEW)+"\n```"
        self.send_response(200); self.send_header("content-type","application/json"); self.end_headers()
        self.wfile.write(json.dumps({"candidates":[{"content":{"parts":[{"text":text}]}}]}).encode())
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


INSTAGRAM_URL="https://apps.apple.com/us/app/instagram/id389801252"
SPOTIFY_URL="https://play.google.com/store/apps/details?id=com.spotify.music&gl=us"
for t in ["scans","rate_limits","email_codes","users","accounts","sessions"]:
    try: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    except Exception: pass

def scan(email,name,url):
    return psql(f"INSERT INTO scans (app_name,health_score,bad_count,warn_count,good_count,result_json,store_url,user_email) VALUES ('{name}',70,1,1,1,'{{}}'::jsonb,{('$u$'+url+'$u$') if url else 'NULL'},'{email}') RETURNING id")

procs=start_server({})
try:
    ALICE=signin("alice@x.com"); BOB=signin("bob@x.com")
    req("GET","/api/history",cookie=ALICE)  # makes sure the scans table exists
    a1=scan("alice@x.com","Instagram",INSTAGRAM_URL); a2=scan("alice@x.com","Spotify",SPOTIFY_URL); a3=scan("alice@x.com","Shots only",None); b1=scan("bob@x.com","BobApp",INSTAGRAM_URL)
    post=lambda i,ck=ALICE: req("POST",f"/api/history/visuals?id={i}",cookie=ck)
    get=lambda i,ck=ALICE: req("GET",f"/api/history/visuals?id={i}",cookie=ck)

    print("== 1. no AI key configured")
    st,js,body=post(a1)
    check("a clear, generic 503 (no key names)", st==503 and "KEY" not in body and "GEMINI" not in body, f"{st} {body[:200]}")
    stop(procs)

    procs=start_server({"GEMINI_API_KEY":"SECRET-FAKE-KEY","GEMINI_API_BASE":f"http://127.0.0.1:{FAKE_PORT}"})
    ALICE=signin("alice@x.com"); BOB=signin("bob@x.com")

    print("== 2. before anything is generated")
    st,js,_=get(a1)
    check("nothing saved yet, but the report has a store link", st==200 and js["available"] is True and js["visuals"] is None, f"{st} {js}")
    st,js,_=get(a3)
    check("a report with no store link has nothing to review", st==200 and js["available"] is False)
    st,js,_=post(a3)
    check("and generating for it is a 400", st==400, f"{st} {js}")

    print("== 3. an App Store report")
    st,js,_=post(a1); v=js.get("visuals") if js else None
    check("a review comes back", st==200 and v, f"{st} {str(js)[:300]}")
    p=seen[-1]
    check("the model was sent the icon plus real screenshots as images", len(p["images"])>=3 and all(i["inline_data"]["mime_type"].startswith("image/") and len(i["inline_data"]["data"])>1000 for i in p["images"]), len(p["images"]))
    check("asked for JSON, key only in the header", p["json"]=="application/json" and p["key"]=="SECRET-FAKE-KEY")
    check("the prompt tells it to judge only what it sees and not promise downloads", "Judge only what you can see" in p["prompt"] and "Never claim" in p["prompt"])
    check("icon rating normalised, notes capped at 3", v["icon"]["rating"]=="strong" and len(v["icon"]["notes"])==3)
    check("screenshots: out-of-range and duplicate dropped, sorted, bad issue -> low", [s["index"] for s in v["screenshots"]]==[1,2] and v["screenshots"][0]["issue"]=="high" and v["screenshots"][1]["issue"]=="low", v["screenshots"])
    check("suggestions capped at 4, unknown fields dropped", len(v["suggestions"])==4 and "extra" not in v)
    check("records how many screenshots were reviewed", v["screenshotCount"]==len(p["images"])-1 and v["iconReviewed"] is True)
    st,js,_=get(a1)
    check("the review is saved and comes back without another AI call", st==200 and js["visuals"]["consistency"]=="Colours drift after #3." and len(seen)==1, f"{st} {len(seen)}")

    print("== 4. a Google Play report")
    st,js,_=post(a2)
    check("works for Play too, with real images", st==200 and len(seen[-1]["images"])>=3, f"{st} {str(js)[:200]} {len(seen[-1]['images']) if seen else 0}")

    print("== 5. ownership")
    st,js,_=get(a1,BOB); check("bob can't read alice's review", st==404, st)
    st,js,_=post(a1,BOB); check("bob can't generate on alice's report", st==404 and len(seen)==2, f"{st} {len(seen)}")
    st,js,_=req("POST",f"/api/history/visuals?id={a1}"); check("anonymous is 401", st==401, st)
    st,js,_=req("POST",f"/api/history/visuals?id=abc",cookie=ALICE); check("a bad id is a 400", st==400, st)
    ADMIN=signin("admin@x.com"); st,_,_=post(a1,ADMIN); check("even an admin can't generate on someone else's report", st==404, st)

    print("== 6. model failures")
    behaviour["mode"]="fail"
    st,js,body=post(a1)
    check("provider failure -> generic 502, no key or provider detail", st==502 and "SECRET" not in body and "boom" not in body, f"{st} {body[:200]}")
    st,js,_=get(a1); check("a failed run keeps the earlier saved review", st==200 and js["visuals"] is not None)
    behaviour["mode"]="ok"; behaviour["text"]="sorry, I cannot do that"
    st,js,body=post(a1); check("a non-JSON answer -> 502, nothing saved over the old one", st==502, f"{st} {body[:200]}")
    behaviour["text"]='{"icon":null,"screenshots":[],"suggestions":[]}'
    st,js,body=post(a1); check("an empty review -> 502", st==502, f"{st} {body[:200]}")
    behaviour["text"]=None

    print("== 7. rate limit")
    codes=[post(a1)[0] for _ in range(12)]
    check("generating is limited to 10 an hour", 429 in codes and codes.count(200)>=1, codes)
finally:
    stop(procs)
    httpd.shutdown()
print(f"\nRESULT: {P} passed, {F} failed")
sys.exit(1 if F else 0)
