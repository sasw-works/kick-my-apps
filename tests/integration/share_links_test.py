import http.client, json, subprocess, urllib.parse, sys

PG=["psql","-h","127.0.0.1","-U","kma","-d","kma_test","-tA","-v","ON_ERROR_STOP=1"]
def psql(q):
    r=subprocess.run(PG+["-c",q],capture_output=True,text=True,env={"PGPASSWORD":"kma","PATH":"/usr/bin:/bin"})
    if r.returncode: raise RuntimeError(r.stderr)
    out=r.stdout.strip().splitlines(); return out[0] if out else ""

def req(m,p,cookie=None,body=None,headers=None):
    c=http.client.HTTPConnection("localhost",3111,timeout=30); h=dict(headers or {}); d=None
    if cookie:h["Cookie"]=cookie
    if body is not None: d=json.dumps(body); h["content-type"]="application/json"
    c.request(m,p,body=d,headers=h); r=c.getresponse(); t=r.read().decode("utf-8","ignore"); hd=dict(r.getheaders()); c.close()
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

for t in ["scans","comparisons","rate_limits","email_codes","users","accounts","sessions"]:
    try: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    except Exception: pass

RJ={"healthScore":70,"aiSummary":"Shared-report marker SUMMARY_XYZ","findings":[{"key":"cta","title":"Button","status":"good","finding":"f","suggestion":"s"}],"lensScores":{}}
ALICE=signin("alice@x.com"); BOB=signin("bob@x.com")
st,js,_=req("POST","/api/history",cookie=ALICE,body={"appName":"AliceApp","healthScore":70,"resultJson":RJ,"storeUrl":""})
sid=js["id"]

print("== 1. creating a link")
st,js,_=req("GET",f"/api/history/share?id={sid}",cookie=ALICE)
check("a new report is not shared by default", st==200 and js["shared"] is False, f"{st} {js}")
st,js,_=req("POST",f"/api/history/share?id={sid}",cookie=ALICE)
tok=js.get("token") if js else None
check("owner can create a link (32-char unguessable token)", st==200 and tok and len(tok)==32, f"{st} {js}")
st,js2,_=req("POST",f"/api/history/share?id={sid}",cookie=ALICE)
check("creating again returns the same link (not rotated)", js2 and js2.get("token")==tok)

print("== 2. the public page")
st,_,html=req("GET",f"/r/{tok}")
check("opens with NO sign-in and shows the report", st==200 and "SUMMARY_XYZ" in html, f"{st}")
check("the owner's email is nowhere in the page", "alice@x.com" not in html)
check("page is marked noindex", "noindex" in html)
check("owner-only controls aren't there (no Share / Compare)", "Create link" not in html and "/history?preselect" not in html)
st,_,_=req("GET",f"/r/{'A'*32}")
check("a well-formed but unknown token is 404", st==404, st)
st,_,_=req("GET","/r/short")
check("a malformed token is 404", st==404, st)
st,_,_=req("GET","/robots.txt")
_,_,robots=req("GET","/robots.txt")
check("robots.txt disallows /r/", "/r/" in robots)

print("== 3. only the owner can manage it")
for label,fn in [("read",lambda:req("GET",f"/api/history/share?id={sid}",cookie=BOB)),
                 ("create",lambda:req("POST",f"/api/history/share?id={sid}",cookie=BOB)),
                 ("revoke",lambda:req("DELETE",f"/api/history/share?id={sid}",cookie=BOB))]:
    st,_,_=fn(); check(f"another user can't {label} it (404)", st==404, st)
st,_,_=req("POST",f"/api/history/share?id={sid}")
check("anonymous can't create (401)", st==401, st)
st,_,_=req("GET",f"/r/{tok}")
check("...and Bob's attempts didn't disturb the link", st==200)
st,js,_=req("GET",f"/api/history?id={sid}",cookie=ALICE)
check("share token isn't leaked through the normal report API", "share_token" not in json.dumps(js))

print("== 4. revoking")
st,js,_=req("DELETE",f"/api/history/share?id={sid}",cookie=ALICE)
check("owner can stop sharing", st==200 and js["shared"] is False, f"{st} {js}")
st,_,_=req("GET",f"/r/{tok}")
check("the old link stops working immediately", st==404, st)
st,js,_=req("POST",f"/api/history/share?id={sid}",cookie=ALICE)
check("sharing again issues a brand-new token", js["token"]!=tok and len(js["token"])==32)
tok2=js["token"]

print("== 5. deleting the report or account")
st,_,_=req("DELETE",f"/api/history?id={sid}",cookie=ALICE)
st,_,_=req("GET",f"/r/{tok2}")
check("deleting the report kills its link", st==404, st)
st,js,_=req("POST","/api/history",cookie=BOB,body={"appName":"BobApp","healthScore":60,"resultJson":RJ,"storeUrl":""})
bsid=js["id"]; btok=req("POST",f"/api/history/share?id={bsid}",cookie=BOB)[1]["token"]
check("(setup) bob's link works", req("GET",f"/r/{btok}")[0]==200)
req("DELETE","/api/account/delete",cookie=BOB)
check("deleting the account kills its links", req("GET",f"/r/{btok}")[0]==404)

print("== 6. input checks and rate limit")
check("bad id is 400", req("POST","/api/history/share?id=abc",cookie=ALICE)[0]==400)
psql("truncate rate_limits")
sts=[req("GET",f"/api/history/share?id=99999",cookie=ALICE)[0] for _ in range(61)]
check("60/hour allowed, the 61st is refused", sts[:60]==[404]*60 and sts[60]==429, f"last: {sts[-2:]}")

print(f"\nRESULT: {P} passed, {F} failed"); sys.exit(1 if F else 0)
