import http.client, json, subprocess, urllib.parse, sys, time
from concurrent.futures import ThreadPoolExecutor

PG=["psql","-h","127.0.0.1","-U","kma","-d","kma_test","-tA","-v","ON_ERROR_STOP=1"]
def psql(q):
    r=subprocess.run(PG+["-c",q],capture_output=True,text=True,env={"PGPASSWORD":"kma","PATH":"/usr/bin:/bin"})
    if r.returncode: raise RuntimeError(r.stderr)
    out=r.stdout.strip().splitlines(); return out[0] if out else ""
def req(m,p,cookie=None,body=None,form=None,headers=None):
    c=http.client.HTTPConnection("localhost",3111,timeout=60); h=dict(headers or {}); d=None
    if cookie:h["Cookie"]=cookie
    if body is not None: d=json.dumps(body); h["content-type"]="application/json"
    if form is not None: d=urllib.parse.urlencode(form); h["content-type"]="application/x-www-form-urlencoded"
    c.request(m,p,body=d,headers=h); r=c.getresponse(); t=r.read().decode("utf-8","ignore")
    ck=r.msg.get_all("Set-Cookie") or []; ra=r.getheader("Retry-After"); c.close()
    try: js=json.loads(t)
    except Exception: js=None
    return r.status,js,ck,ra
P=F=0
def check(n,c,d=""):
    global P,F
    if c: P+=1; print(f"  ok   {n}")
    else: F+=1; print(f"  FAIL {n}   {d}")
def seed(email,code="123456"):
    psql("""CREATE TABLE IF NOT EXISTS email_codes (email TEXT PRIMARY KEY, code TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, attempts INTEGER NOT NULL DEFAULT 0)""")
    psql(f"INSERT INTO email_codes (email,code,expires_at,attempts) VALUES ('{email}','{code}',now()+interval '10 min',0) ON CONFLICT (email) DO UPDATE SET code='{code}',expires_at=now()+interval '10 min',attempts=0")
def csrf():
    st,js,ck,_=req("GET","/api/auth/csrf"); return js["csrfToken"], next(x.split(";")[0] for x in ck if x.startswith("authjs.csrf-token"))
def attempt(email,code,tok,cc):
    st,js,ck,_=req("POST","/api/auth/callback/email-code",cookie=cc,form={"csrfToken":tok,"email":email,"code":code,"callbackUrl":"http://localhost:3111/console","json":"true"})
    return next((x.split(";")[0] for x in ck if x.startswith("authjs.session-token")),None)
def signin(email):
    seed(email); tok,cc=csrf(); return attempt(email,"123456",tok,cc)
for t in ["rate_limits","email_codes","users","accounts","sessions","scans","comparisons","subscriptions"]:
    try: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    except Exception: pass

print("== H1  the attempt limit holds under a burst of parallel guesses ==")
seed("race@x.com"); tok,cc=csrf()
with ThreadPoolExecutor(max_workers=40) as ex: list(ex.map(lambda _: attempt("race@x.com","000000",tok,cc), range(40)))
att=int(psql("select attempts from email_codes where email='race@x.com'"))
check(f"40 parallel wrong guesses -> exactly 5 attempts counted (was 10 before the fix)", att==5, f"attempts={att}")
check("after the burst the CORRECT code is refused (locked out)", attempt("race@x.com","123456",tok,cc) is None)

print("== H2  a code works once, even if two correct submissions race ==")
seed("once@x.com"); tok,cc=csrf()
with ThreadPoolExecutor(max_workers=2) as ex: res=list(ex.map(lambda _: attempt("once@x.com","123456",tok,cc), range(2)))
check("two simultaneous correct submissions -> exactly one session", sum(1 for r in res if r)==1, str(res))
check("...and the code is gone afterwards", psql("select count(*) from email_codes where email='once@x.com'")=="0")
seed("late@x.com"); psql("update email_codes set expires_at = now() - interval '1 second' where email='late@x.com'"); tok,cc=csrf()
check("an expired code is refused", attempt("late@x.com","123456",tok,cc) is None)

print("== H3  sign-in codes look like real 6-digit secrets ==")
codes=[]
for i in range(30):
    st,js,_,_=req("POST","/api/auth/send-code",body={"email":f"gen{i}@x.com"},headers={"x-forwarded-for":f"10.0.{i}.1"})
    codes.append(psql(f"select code from email_codes where email='gen{i}@x.com'"))
check("all 30 are exactly 6 digits with no leading zero", all(len(c)==6 and c.isdigit() and c[0]!="0" for c in codes), str(codes[:5]))
check("and they're not repeating (>= 29 distinct of 30)", len(set(codes))>=29, f"{len(set(codes))} distinct")

print("== H4  'Email me a code' can't be used to spam someone or grind guesses ==")
for t in ["rate_limits"]: psql("TRUNCATE rate_limits")
H={"x-forwarded-for":"203.0.113.9"}
a=req("POST","/api/auth/send-code",body={"email":"victim@x.com"},headers=H)
b=req("POST","/api/auth/send-code",body={"email":"victim@x.com"},headers=H)
check("first request is allowed through (it then fails only at the email provider, no key here)", a[0]!=429, str(a[0]))
check("a second request within a minute is refused with 429", b[0]==429, str(b[0]))
check("...with a Retry-After header and a human message", b[3] is not None and 0 < int(b[3]) <= 60 and "Too many requests" in b[1]["error"], f"{b[3]} {b[1]}")
check("a different address from the same IP is still fine", req("POST","/api/auth/send-code",body={"email":"other@x.com"},headers=H)[0]!=429)
# hourly cap per address: reset the 60s cooldown between sends, expect the 6th within the hour to be refused
res=[]
for i in range(6):
    psql("delete from rate_limits where key like 'sendcode:cooldown:cap@x.com'")
    res.append(req("POST","/api/auth/send-code",body={"email":"cap@x.com"},headers={"x-forwarded-for":"198.51.100.7"})[0])
check("per-address hourly cap: sends 1-5 pass, the 6th is refused", [s==429 for s in res]==[False]*5+[True], str(res))
# per-IP cap
res=[req("POST","/api/auth/send-code",body={"email":f"ip{i}@x.com"},headers={"x-forwarded-for":"192.0.2.55"})[0] for i in range(22)]
check("per-IP cap: one IP can't start more than 20 codes an hour", [s==429 for s in res]==[False]*20+[True]*2, str(res))
check("malformed address is a 400, and doesn't burn the limiter", req("POST","/api/auth/send-code",body={"email":"nope"},headers={"x-forwarded-for":"192.0.2.60"})[0]==400)

print("== H5  analysis abuse guard (per signed-in user) ==")
U=signin("carol@x.com"); V=signin("dave@x.com")
uid=psql("select id from users where email='carol@x.com'")
statuses=[req("POST","/api/analyze",cookie=U,form={"appName":"x"})[0] for _ in range(16)]
check("carol: first 15 analyses in an hour are allowed through", all(s!=429 for s in statuses[:15]), str(statuses))
r16=req("POST","/api/analyze",cookie=U,form={"appName":"x"})
check("the 16th is refused with 429 + Retry-After", statuses[15]==429 and r16[0]==429 and r16[3] and int(r16[3])>0, f"{statuses[15]} {r16[0]} {r16[3]}")
check("the message tells her how long to wait", "try again in" in r16[1]["error"].lower(), str(r16[1]))
check("dave is unaffected by carol's limit", req("POST","/api/analyze",cookie=V,form={"appName":"x"})[0]!=429)
check("signed-out callers still get 401, not 429 (auth is checked first)", req("POST","/api/analyze",form={"appName":"x"})[0]==401)

print("== H6  the limiter is atomic: a burst can't slip past the limit ==")
W=signin("erin@x.com")
with ThreadPoolExecutor(max_workers=30) as ex: sts=list(ex.map(lambda _: req("POST","/api/analyze",cookie=W,form={"appName":"x"})[0], range(30)))
check("30 parallel requests against a limit of 15 -> exactly 15 allowed, 15 refused", sts.count(429)==15 and len([s for s in sts if s!=429])==15, f"429s={sts.count(429)} allowed={len([s for s in sts if s!=429])}")

print("== H7  windows expire ==")
psql(f"update rate_limits set window_start = now() - interval '2 hours' where key = 'analyze:hour:{uid}'")
check("after the hour is up carol can analyze again", req("POST","/api/analyze",cookie=U,form={"appName":"x"})[0]!=429)
check("and the counter restarted from 1", psql(f"select count from rate_limits where key='analyze:hour:{uid}'")=="1")

print(f"\nRESULT: {P} passed, {F} failed"); sys.exit(1 if F else 0)
