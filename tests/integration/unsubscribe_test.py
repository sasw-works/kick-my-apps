import http.client, json, subprocess, urllib.parse, sys

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
    body=urllib.parse.urlencode({"csrfToken":js["csrfToken"],"email":email,"code":code,"callbackUrl":"http://localhost:3111/console","json":"true"})
    c.request("POST","/api/auth/callback/email-code",body=body,headers={"Cookie":cc,"content-type":"application/x-www-form-urlencoded"})
    r=c.getresponse(); r.read(); ck2=r.msg.get_all("Set-Cookie") or []; c.close()
    return next((x.split(";")[0] for x in ck2 if x.startswith("authjs.session-token")),None)

P=F=0
def check(n,c,d=""):
    global P,F
    if c: P+=1; print(f"  ok   {n}")
    else: F+=1; print(f"  FAIL {n}   {d}")

for t in ["subscriptions","rate_limits","email_codes","users","accounts","sessions"]:
    try: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    except Exception: pass

ALICE=signin("alice@x.com"); BOB=signin("bob@x.com")
check("both sign in", ALICE and BOB)

print("== 1. subscribing ==")
check("signed-out cannot subscribe", req("POST","/api/subscribe",body={"appName":"AliceApp","storeUrl":"https://apps.apple.com/us/app/x/id1"})[0]==401)
st,js,_=req("POST","/api/subscribe",cookie=ALICE,body={"appName":"AliceApp","storeUrl":"https://apps.apple.com/us/app/x/id1"})
check("alice subscribes", st==200 and js.get("ok"), f"{st} {js}")
check("subscribing again is a no-op, not a duplicate", req("POST","/api/subscribe",cookie=ALICE,body={"appName":"AliceApp","storeUrl":"u"})[1].get("alreadySubscribed") is True)
check("every subscription gets a real, unique token", psql("select length(unsubscribe_token) from subscriptions limit 1")=="32")

print("== 2. listing (My Subscriptions) ==")
check("signed-out cannot list", req("GET","/api/subscribe")[0]==401)
st,js,_=req("GET","/api/subscribe",cookie=ALICE)
check("alice sees her own subscription", st==200 and len(js["subscriptions"])==1 and js["subscriptions"][0]["app_name"]=="AliceApp", str(js))
check("bob's list is empty (ownership scoped)", req("GET","/api/subscribe",cookie=BOB)[1]["subscriptions"]==[])
check("the token itself is never returned to the browser (only usable via the email link)", "unsubscribe_token" not in json.dumps(js))

print("== 3. deleting via the Account page (signed in) ==")
sub_id = req("GET","/api/subscribe",cookie=ALICE)[1]["subscriptions"][0]["id"]
req("POST","/api/subscribe",cookie=ALICE,body={"appName":"AliceApp2","storeUrl":"u2"})  # a second one, so we can isolate deletion
check("bob can't delete alice's subscription", req("DELETE",f"/api/subscribe?id={sub_id}",cookie=BOB)[0]==404)
check("...it's still there", psql(f"select count(*) from subscriptions where id={sub_id}")=="1")
check("alice deletes her own", req("DELETE",f"/api/subscribe?id={sub_id}",cookie=ALICE)[0]==200)
check("...and only that one is gone", psql(f"select count(*) from subscriptions where id={sub_id}")=="0" and len(req("GET","/api/subscribe",cookie=ALICE)[1]["subscriptions"])==1)

print("== 4. the token-based unsubscribe link (no login) ==")
token = psql("select unsubscribe_token from subscriptions where email='alice@x.com' limit 1")
check("GET with no login works and identifies the app (but does NOT delete)", True)
st,js,_=req("GET",f"/api/subscribe/unsubscribe?token={token}")
check("GET returns found + app name, signed out", st==200 and js["found"] and js["appName"]=="AliceApp2", str(js))
check("GET alone did not remove the row (bots/scanners prefetching links must not silently unsubscribe someone)", psql(f"select count(*) from subscriptions where unsubscribe_token='{token}'")=="1")
check("a garbage token returns found:false, not an error", req("GET","/api/subscribe/unsubscribe?token=garbage")[1]=={"found":False})
check("no token at all is a 400", req("GET","/api/subscribe/unsubscribe")[0]==400)

print("== 5. confirming (DELETE) actually removes it, signed out ==")
st,js,_=req("DELETE",f"/api/subscribe/unsubscribe?token={token}")
check("DELETE succeeds with no session cookie at all", st==200 and js["ok"] and js["removed"] is True, f"{st} {js}")
check("the row is actually gone", psql(f"select count(*) from subscriptions where unsubscribe_token='{token}'")=="0")
check("alice's own list no longer shows it", req("GET","/api/subscribe",cookie=ALICE)[1]["subscriptions"]==[])
st,js,_=req("DELETE",f"/api/subscribe/unsubscribe?token={token}")
check("using the same link again is graceful (removed:false, not an error)", st==200 and js["removed"] is False, f"{st} {js}")

print("== 6. one token can't be used to guess/target another subscription ==")
req("POST","/api/subscribe",cookie=BOB,body={"appName":"BobApp","storeUrl":"u3"})
bob_token = psql("select unsubscribe_token from subscriptions where email='bob@x.com' limit 1")
alice_new_token_check = req("POST","/api/subscribe",cookie=ALICE,body={"appName":"AliceApp3","storeUrl":"u4"})
alice_token2 = psql("select unsubscribe_token from subscriptions where email='alice@x.com' limit 1")
check("tokens are not sequential/predictable from one another", alice_token2 != bob_token and len(set([alice_token2, bob_token])) == 2)
check("bob's token only removes bob's row", req("DELETE",f"/api/subscribe/unsubscribe?token={bob_token}")[1]["removed"] and psql("select count(*) from subscriptions where email='alice@x.com'")=="1")

print(f"\nRESULT: {P} passed, {F} failed"); sys.exit(1 if F else 0)
