import http.client, json, subprocess, urllib.parse, sys, os, time

PG=["psql","-h","127.0.0.1","-U","kma","-d","kma_test","-tA","-v","ON_ERROR_STOP=1"]
def psql(q):
    r=subprocess.run(PG+["-c",q],capture_output=True,text=True,env={"PGPASSWORD":"kma","PATH":"/usr/bin:/bin"})
    if r.returncode: raise RuntimeError(r.stderr)
    return r.stdout.strip()

# the server inherits our environment (proxy/network settings included) minus any real AI keys
BASE_ENV={k:v for k,v in os.environ.items() if k not in ("GEMINI_API_KEY","OPENROUTER_API_KEY","RESEND_API_KEY")}
BASE_ENV.update({"POSTGRES_URL":"postgres://kma:kma@127.0.0.1:5432/kma_test","AUTH_SECRET":"test-secret-for-sandbox",
                 "AUTH_TRUST_HOST":"true","ADMIN_EMAILS":"admin@x.com"})
FAKE="sk-or-v1-FAKEFAKEFAKE0123456789abcdef"      # obviously fake; the real (leaked) key is never used here
GFAKE="AIzaFAKEFAKEFAKEFAKEFAKEFAKEFAKE01234567"
GENERIC="We couldn't complete the analysis right now. Please try again in a few minutes."

def start(extra):
    subprocess.run("pkill -f '[n]ext-server'; pkill -f '[n]ext start'; true", shell=True); time.sleep(1)
    env=dict(BASE_ENV); env.update(extra)
    subprocess.Popen(["npx","next","start","-p","3111"],cwd="/home/claude/kick-my-apps",env=env,
                     stdout=open("/tmp/next_leak.log","w"),stderr=subprocess.STDOUT,start_new_session=True)
    for _ in range(60):
        try:
            c=http.client.HTTPConnection("localhost",3111,timeout=2); c.request("GET","/"); c.getresponse().read(); return
        except Exception: time.sleep(0.5)
    raise RuntimeError("server did not start")

def req(m,p,cookie=None,form=None,multipart=None):
    c=http.client.HTTPConnection("localhost",3111,timeout=120); h={}; d=None
    if cookie:h["Cookie"]=cookie
    if form is not None: d=urllib.parse.urlencode(form); h["content-type"]="application/x-www-form-urlencoded"
    if multipart is not None:
        b="----kmaboundary"; parts=[]
        for k,v in multipart["fields"].items(): parts.append(f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
        parts.append(f'--{b}\r\nContent-Disposition: form-data; name="files"; filename="shot.png"\r\nContent-Type: image/png\r\n\r\n'.encode()+multipart["file"]+b"\r\n")
        parts.append(f'--{b}--\r\n'.encode()); d=b"".join(parts); h["content-type"]=f"multipart/form-data; boundary={b}"
    c.request(m,p,body=d,headers=h); r=c.getresponse(); t=r.read().decode("utf-8","ignore"); ck=r.msg.get_all("Set-Cookie") or []; c.close()
    try: js=json.loads(t)
    except Exception: js=None
    return r.status,js,t,ck

def signin(email):
    psql("""CREATE TABLE IF NOT EXISTS email_codes (email TEXT PRIMARY KEY, code TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, attempts INTEGER NOT NULL DEFAULT 0)""")
    psql(f"INSERT INTO email_codes VALUES ('{email}','123456',now()+interval '10 min',0) ON CONFLICT (email) DO UPDATE SET code='123456',expires_at=now()+interval '10 min',attempts=0")
    st,js,_,ck=req("GET","/api/auth/csrf"); cc=next(x.split(";")[0] for x in ck if x.startswith("authjs.csrf-token"))
    st,_,_,ck2=req("POST","/api/auth/callback/email-code",cookie=cc,form={"csrfToken":js["csrfToken"],"email":email,"code":"123456","callbackUrl":"http://localhost:3111/console","json":"true"})
    return next((x.split(";")[0] for x in ck2 if x.startswith("authjs.session-token")),None)

PNG=open("/tmp/shot.png","rb").read()
def analyze(cookie): return req("POST","/api/analyze",cookie=cookie,multipart={"fields":{"appName":"TestApp"},"file":PNG})

P=F=0
def check(n,c,d=""):
    global P,F
    if c: P+=1; print(f"  ok   {n}")
    else: F+=1; print(f"  FAIL {n}   {d}")
def leaked(text): return any(s in text for s in (FAKE,GFAKE,"sk-or-v1-FAKE","AIzaFAKE"))

for t in ["rate_limits","email_codes","users","accounts","sessions","scans"]:
    try: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    except Exception: pass

scenarios=[
 ("A. OpenRouter key pasted 3x with spaces; no Gemini",        {"OPENROUTER_API_KEY":f"{FAKE} {FAKE} {FAKE}"}, True),
 ("B. same, separated by NEWLINES (the production error)",     {"OPENROUTER_API_KEY":f"{FAKE}\n{FAKE}\n{FAKE}"}, True),
 ("C. Gemini key malformed too, falls back to OpenRouter",     {"GEMINI_API_KEY":f"{GFAKE}\n{GFAKE}","OPENROUTER_API_KEY":FAKE}, True),
 ("D. no AI keys configured at all",                           {}, False),
]
for title,extra,expects_provider_call in scenarios:
    print(f"\n== {title}")
    start(extra)
    user=signin("member@x.com"); admin=signin("admin@x.com")
    psql("TRUNCATE rate_limits")
    st,js,txt,_=analyze(user)
    print(f"   member -> {st}: {(js or {}).get('error','')[:120]!r}")
    check("member sees only the generic message", (js or {}).get("error")==GENERIC, txt[:160])
    check("member's response has no key material", not leaked(txt))
    st2,js2,txt2,_=analyze(admin)
    print(f"   admin  -> {st2}: {(js2 or {}).get('error','')[:260]!r}")
    check("admin's response has no key material either", not leaked(txt2))
    check("admin gets the generic message plus a diagnostic detail", (js2 or {}).get("error","").startswith(GENERIC) and "[admin detail:" in (js2 or {}).get("error",""), txt2[:160])
    if expects_provider_call:
        check("the sloppy key was still usable: no header crash, the request reached the provider", "Headers.append" not in txt2 and "invalid header" not in txt2 and "Bearer" not in txt2, txt2[:200])
    else:
        check("...and the detail says what's actually wrong", "No AI provider key is configured" in txt2, txt2[:200])
    log=open("/tmp/next_leak.log",errors="ignore").read()
    check("server log has no key material", not leaked(log), [l[:120] for l in log.splitlines() if "FAKE" in l][:1])
    if expects_provider_call:
        check("server log flags the malformed variable (without printing it)", "whitespace-separated values" in log, log[-300:])
subprocess.run("pkill -f '[n]ext-server'; pkill -f '[n]ext start'; true", shell=True)
print(f"\nRESULT: {P} passed, {F} failed"); sys.exit(1 if F else 0)
