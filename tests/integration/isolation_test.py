import http.client, json, subprocess, urllib.parse, sys

PG = ["psql","-h","127.0.0.1","-U","kma","-d","kma_test","-tA","-v","ON_ERROR_STOP=1"]
def psql(q):
    r = subprocess.run(PG+["-c",q], capture_output=True, text=True, env={"PGPASSWORD":"kma","PATH":"/usr/bin:/bin"})
    if r.returncode: raise RuntimeError(r.stderr)
    return r.stdout.strip()

def req(method, path, cookie=None, body=None, form=None, headers=None):
    c = http.client.HTTPConnection("localhost", 3111, timeout=30)
    h = dict(headers or {}); data = None
    if cookie: h["Cookie"] = cookie
    if body is not None: data = json.dumps(body); h["content-type"] = "application/json"
    if form is not None: data = urllib.parse.urlencode(form); h["content-type"] = "application/x-www-form-urlencoded"
    c.request(method, path, body=data, headers=h); r = c.getresponse(); txt = r.read().decode("utf-8","ignore")
    cookies = r.msg.get_all("Set-Cookie") or []; c.close()
    try: js = json.loads(txt)
    except Exception: js = None
    return r.status, js, txt, cookies

passed = failed = 0
def check(name, cond, detail=""):
    global passed, failed
    if cond: passed += 1; print(f"  ok   {name}")
    else:    failed += 1; print(f"  FAIL {name}   {detail}")

def signin(email, code="123456"):
    """The real credentials flow: CSRF token -> callback/email-code with a known one-time code."""
    psql("""CREATE TABLE IF NOT EXISTS email_codes (email TEXT PRIMARY KEY, code TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, attempts INTEGER NOT NULL DEFAULT 0)""")
    psql(f"INSERT INTO email_codes (email, code, expires_at, attempts) VALUES ('{email}','123456', now()+interval '10 min', 0) ON CONFLICT (email) DO UPDATE SET code='123456', expires_at=now()+interval '10 min', attempts=0")
    st, js, _, ck = req("GET", "/api/auth/csrf")
    csrf_cookie = next(x.split(";")[0] for x in ck if x.startswith("authjs.csrf-token"))
    st, js2, txt, ck2 = req("POST", "/api/auth/callback/email-code", cookie=csrf_cookie,
        form={"csrfToken": js["csrfToken"], "email": email, "code": code, "callbackUrl": "http://localhost:3111/console", "json": "true"})
    tok = next((x.split(";")[0] for x in ck2 if x.startswith("authjs.session-token")), None)
    return tok

for t in ["users","accounts","sessions","verification_token","scans","comparisons","subscriptions","email_codes"]:
    try: psql(f"TRUNCATE {t} RESTART IDENTITY CASCADE")
    except Exception: pass
print("== S0  real sign-in flow (email code -> session) ==")
bad = signin("mallory@x.com", code="000000")
check("wrong code is rejected (no session cookie)", bad is None)
check("...and the attempt was counted", psql("select attempts from email_codes where email='mallory@x.com'") == "1")
A = signin("alice@x.com"); B = signin("bob@x.com"); ADM = signin("admin@x.com")
check("alice, bob, admin each get a session cookie", all([A, B, ADM]))
check("users were created in the DB", psql("select count(*) from users where email in ('alice@x.com','bob@x.com','admin@x.com')") == "3")
check("one-time code was consumed", psql("select count(*) from email_codes where email='alice@x.com'") == "0")
check("last_login recorded on sign-in", psql("select count(*) from users where last_login is not null") == "3")
st, js, _, _ = req("GET", "/api/auth/session", cookie=A)
check("session endpoint returns alice (id + email)", st == 200 and js and js["user"]["email"] == "alice@x.com" and js["user"]["id"], str(js))
check("admin flag only for the admin", req("GET","/api/auth/session",cookie=ADM)[1]["user"]["isAdmin"] is True and js["user"]["isAdmin"] is False)

print("== S1  scans: create + list scoping ==")
def mk(cookie, name, score=70, reviews=None):
    rj = {"healthScore": score, "findings": [], **({"reviewSummary": {"totalReviews": reviews}} if reviews else {})}
    st, js, _, _ = req("POST", "/api/history", cookie=cookie, body={"appName": name, "healthScore": score, "badCount": 1, "warnCount": 2, "goodCount": 3, "resultJson": rj, "storeUrl": ""})
    return js["id"] if st == 200 and js else None
a1 = mk(A, "AliceApp", 70, 12); a2 = mk(A, "AliceApp2", 55); b1 = mk(B, "BobApp", 90)
check("all three creates succeeded", all([a1, a2, b1]), f"{a1},{a2},{b1}")
check("scans stored with the creator's email", psql(f"select user_email from scans where id={a1}") == "alice@x.com" and psql(f"select user_email from scans where id={b1}") == "bob@x.com")
la = req("GET", "/api/history?all=1", cookie=A)[1]; lb = req("GET", "/api/history?all=1", cookie=B)[1]
check("alice's list has exactly her 2 scans", sorted(s["id"] for s in la["scans"]) == sorted([a1, a2]), str(la))
check("bob's list has exactly his 1 scan", [s["id"] for s in lb["scans"]] == [b1])
check("review_count cast works (12) and missing summary is null", {s["id"]: s["review_count"] for s in la["scans"]} == {a1: 12, a2: None})
check("portfolio (?apps=1) scoped", sorted(x["app_name"] for x in req("GET","/api/history?apps=1",cookie=A)[1]["apps"]) == ["AliceApp","AliceApp2"]
      and [x["app_name"] for x in req("GET","/api/history?apps=1",cookie=B)[1]["apps"]] == ["BobApp"])
check("per-app history (?appName=) scoped: bob can't see alice's app", req("GET","/api/history?appName=AliceApp",cookie=B)[1]["scans"] == []
      and len(req("GET","/api/history?appName=AliceApp",cookie=A)[1]["scans"]) == 1)

print("== S2  reading one report by id ==")
st, js, _, _ = req("GET", f"/api/history?id={a1}", cookie=A)
check("owner can open own report", st == 200 and js["scan"]["id"] == a1)
check("...and the owner column is not leaked in the payload", "user_email" not in js["scan"])
check("other user gets 404 (not 403) for alice's report", req("GET", f"/api/history?id={a1}", cookie=B)[0] == 404)
check("404 body is identical to a missing id (no existence oracle)", req("GET", f"/api/history?id={a1}", cookie=B)[1] == req("GET", "/api/history?id=999999", cookie=B)[1])
check("admin can open any user's report", req("GET", f"/api/history?id={a1}", cookie=ADM)[0] == 200)
check("signed-out gets 401", req("GET", f"/api/history?id={a1}")[0] == 401)
check("non-numeric id -> 404, not a SQL error", req("GET", "/api/history?id=" + urllib.parse.quote("1;drop table scans"), cookie=A)[0] == 404)

print("== S3  deleting ==")
check("bob cannot delete alice's report (404)", req("DELETE", f"/api/history?id={a2}", cookie=B)[0] == 404)
check("...and it still exists", psql(f"select count(*) from scans where id={a2}") == "1")
check("alice can delete her own", req("DELETE", f"/api/history?id={a2}", cookie=A)[0] == 200 and psql(f"select count(*) from scans where id={a2}") == "0")
a2 = mk(A, "AliceApp2", 55)

print("== S4  comparisons ==")
st, js, _, _ = req("POST", "/api/history/compare", cookie=B, body={"scanIdA": a1, "scanIdB": b1, "appNameA": "x", "appNameB": "y"})
check("bob can't build a comparison from alice's scan (404)", st == 404, f"{st} {js}")
check("...and nothing was inserted", psql("select count(*) from comparisons") == "0")
st, js, _, _ = req("POST", "/api/history/compare", cookie=A, body={"scanIdA": a1, "scanIdB": a2, "appNameA": "AliceApp", "appNameB": "AliceApp2"})
cid = js["id"] if st == 200 else None
check("alice can compare her own two scans", st == 200 and cid, f"{st} {js}")
check("comparison stored with alice as owner", psql(f"select user_email from comparisons where id={cid}") == "alice@x.com")
check("non-integer scan ids rejected (400)", req("POST","/api/history/compare",cookie=A,body={"scanIdA":"1 or 1=1","scanIdB":a2})[0] == 400)
check("bob's comparison list is empty (was global before)", req("GET","/api/history/compare?all=true",cookie=B)[1]["comparisons"] == [])
check("alice sees her comparison", [c["id"] for c in req("GET","/api/history/compare?all=true",cookie=A)[1]["comparisons"]] == [cid])
check("/api/history?all=1 also scopes comparisons", req("GET","/api/history?all=1",cookie=B)[1]["comparisons"] == [] and len(req("GET","/api/history?all=1",cookie=A)[1]["comparisons"]) == 1)
check("bob can't load alice's comparison (404)", req("GET",f"/api/history/compare?comparisonId={cid}",cookie=B)[0] == 404)
st, js, _, _ = req("GET", f"/api/history/compare?comparisonId={cid}", cookie=A)
check("alice loads it with both scans + full result_json", st == 200 and len(js["scans"]) == 2 and "result_json" in js["scans"][0])
check("admin can load it too", req("GET",f"/api/history/compare?comparisonId={cid}",cookie=ADM)[0] == 200)
check("THE LEAK: ?ids= with alice's scan ids returns nothing for bob", req("GET",f"/api/history/compare?ids={a1},{a2}",cookie=B)[1]["scans"] == [])
check("...but returns both for alice", len(req("GET",f"/api/history/compare?ids={a1},{a2}",cookie=A)[1]["scans"]) == 2)
check("mixed ids: bob asks for {alice's, his own} -> only his own", [s["id"] for s in req("GET",f"/api/history/compare?ids={a1},{b1}",cookie=B)[1]["scans"]] == [b1])
check("bob can't delete alice's comparison", req("DELETE",f"/api/history/compare?id={cid}",cookie=B)[0] == 404 and psql(f"select count(*) from comparisons where id={cid}") == "1")

print("== S5  legacy rows with no owner (everything created before accounts existed) ==")
legacy = psql("insert into scans (app_name,health_score,result_json) values ('LegacyApp',50,'{}') returning id").splitlines()[0]
psql(f"insert into comparisons (scan_id_a,scan_id_b,app_name_a,app_name_b) values ({legacy},{legacy},'L','L')")
check("not in anyone's list", all(s["app_name"] != "LegacyApp" for u in (A,B) for s in req("GET","/api/history?all=1",cookie=u)[1]["scans"]))
check("not in anyone's portfolio", all(x["app_name"] != "LegacyApp" for u in (A,B) for x in req("GET","/api/history?apps=1",cookie=u)[1]["apps"]))
check("ordinary users get 404 by id", req("GET",f"/api/history?id={legacy}",cookie=B)[0] == 404)
check("...and via ?ids=", req("GET",f"/api/history/compare?ids={legacy}",cookie=B)[1]["scans"] == [])
check("orphaned comparisons never listed", all(True for _ in [0]) and len(req("GET","/api/history/compare?all=true",cookie=B)[1]["comparisons"]) == 0)
check("admin can still reach a legacy report by id", req("GET",f"/api/history?id={legacy}",cookie=ADM)[0] == 200)

print("== S6  weekly-digest subscription ==")
st, js, _, _ = req("POST", "/api/subscribe", cookie=A, body={"email": "victim@x.com", "appName": "AliceApp", "storeUrl": "https://apps.apple.com/x/id1"})
check("subscribe works", st == 200, f"{st} {js}")
check("subscribed address is alice's own, the body's email was ignored", psql("select email from subscriptions") == "alice@x.com")
check("second subscribe is a no-op", req("POST","/api/subscribe",cookie=A,body={"appName":"AliceApp","storeUrl":"u"})[1].get("alreadySubscribed") is True)
check("signed-out cannot subscribe anyone", req("POST","/api/subscribe",body={"email":"victim@x.com","appName":"a","storeUrl":"u"})[0] == 401)

print("== S7  admin routes ==")
st, js, _, _ = req("GET", "/api/admin/users", cookie=ADM)
counts = {u["email"]: u["scan_count"] for u in (js or {}).get("users", [])}
check("admin lists users with correct per-user report counts", st == 200 and counts.get("alice@x.com") == 2 and counts.get("bob@x.com") == 1, str(counts))
check("non-admin gets 403", req("GET","/api/admin/users",cookie=A)[0] == 403)
check("admin can list a user's reports", len(req("GET","/api/admin/user-scans?email=alice@x.com",cookie=ADM)[1]["scans"]) == 2)

print("== S8  account lifecycle ==")
st, js, _, _ = req("GET", "/api/account/me", cookie=B)
check("account/me returns bob (member since set)", st == 200 and js["user"]["email"] == "bob@x.com" and js["user"]["created_at"])
check("bob can rename himself", req("POST","/api/account/update-name",cookie=B,body={"name":"Bob B"})[1]["name"] == "Bob B")
uid_alice = psql("select id from users where email='alice@x.com'")
st, js, _, _ = req("DELETE", "/api/admin/users", cookie=ADM, body={"userId": uid_alice, "email": "alice@x.com"})
check("admin can delete alice", st == 200, f"{st} {js}")
check("her scans are gone with her", psql("select count(*) from scans where user_email='alice@x.com'") == "0")
check("her comparisons are gone with her", psql("select count(*) from comparisons where user_email='alice@x.com'") == "0", "left behind: " + psql("select count(*) from comparisons where user_email='alice@x.com'"))
check("her digest subscription is gone (no more emails to a deleted account)", psql("select count(*) from subscriptions where email='alice@x.com'") == "0", "left behind: " + psql("select count(*) from subscriptions where email='alice@x.com'"))
check("no leftover sign-in code for her", psql("select count(*) from email_codes where email='alice@x.com'") == "0")
check("her still-valid session token is dead immediately (401)", req("GET","/api/history?all=1",cookie=A)[0] == 401)
check("admin can't delete themselves", req("DELETE","/api/admin/users",cookie=ADM,body={"userId":psql("select id from users where email='admin@x.com'"),"email":"admin@x.com"})[0] == 400)
req("POST", "/api/subscribe", cookie=B, body={"appName": "BobApp", "storeUrl": "https://apps.apple.com/x/id2"})
b2 = mk(B, "BobApp2", 60)
req("POST", "/api/history/compare", cookie=B, body={"scanIdA": b1, "scanIdB": b2, "appNameA": "BobApp", "appNameB": "BobApp2"})
check("(setup) bob has a subscription and a comparison", psql("select count(*) from subscriptions where email='bob@x.com'") == "1" and psql("select count(*) from comparisons where user_email='bob@x.com'") == "1")
st, js, _, _ = req("DELETE", "/api/account/delete", cookie=B)
check("bob deletes his own account", st == 200, f"{st} {js}")
check("bob's token is dead too, his scans gone", req("GET","/api/history?all=1",cookie=B)[0] == 401 and psql("select count(*) from scans where user_email='bob@x.com'") == "0")
check("bob's comparisons and subscription gone too", psql("select count(*) from comparisons where user_email='bob@x.com'") == "0" and psql("select count(*) from subscriptions where email='bob@x.com'") == "0",)

print(f"\nRESULT: {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
