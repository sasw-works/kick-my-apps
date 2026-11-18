// Unit tests for the Google Play helpers (no server, no database, no network):
// node tests/integration/play_store_unit_test.mjs
import {
  isPlayId, playIdFromStoreUrl, playCountryFromStoreUrl, playStoreUrl, mapPlayApp, mapPlayReview,
} from "../../app/lib/pulse/playStore.js";
import { isAppId, isAppStoreId, storeOfAppId, storeName, appIdFromStoreUrl, countryFromStoreUrl } from "../../app/lib/pulse/appStore.js";
import { projectKey } from "../../app/lib/projects.js";

let ok = 0, bad = 0;
const check = (n, c, d = "") => { c ? (ok++, console.log("  ok  ", n)) : (bad++, console.log("  FAIL", n, d)); };

console.log("== ids and links");
check("package names are Play ids", isPlayId("com.spotify.music") && isPlayId("fm.anchor.android") && isPlayId("com.a_b.c1"));
check("App Store ids and junk are not Play ids", !isPlayId("389801252") && !isPlayId("spotify") && !isPlayId("") && !isPlayId(null) && !isPlayId("com..x") && !isPlayId("com.1x") && !isPlayId("a.b; DROP TABLE x"));
check("isAppId accepts both stores, rejects the rest", isAppId("389801252") && isAppId("com.x.y") && !isAppId("12") && !isAppId("x"));
check("the id alone says the store", storeOfAppId("389801252") === "appstore" && storeOfAppId("com.x.y") === "play" && storeName("com.x.y") === "Google Play" && storeName("389801252") === "App Store");
check("isAppStoreId is digits only", isAppStoreId("389801252") && !isAppStoreId("com.x.y"));
const url = "https://play.google.com/store/apps/details?id=com.spotify.music&hl=en&gl=TR";
check("package id read from a Play link", playIdFromStoreUrl(url) === "com.spotify.music" && appIdFromStoreUrl(url) === "com.spotify.music");
check("country read from gl=, lowercased", playCountryFromStoreUrl(url) === "tr" && countryFromStoreUrl(url) === "tr");
check("Apple links still work", appIdFromStoreUrl("https://apps.apple.com/us/app/instagram/id389801252") === "389801252" && countryFromStoreUrl("https://apps.apple.com/de/app/x/id389801252") === "de");
check("other hosts and bad ids are refused", playIdFromStoreUrl("https://evil.example/store/apps/details?id=com.x.y") === null && playIdFromStoreUrl("https://play.google.com/store/apps/details?id=bad id") === null && playIdFromStoreUrl("not a url") === null && playIdFromStoreUrl(null) === null);
check("store link is built with an encoded id", playStoreUrl("com.x.y", "de") === "https://play.google.com/store/apps/details?id=com.x.y&gl=de");

console.log("== project keys");
check("Play link -> app:<package>", projectKey("Spotify", url) === "app:com.spotify.music");
check("same app, different country/lang -> same project", projectKey("S", "https://play.google.com/store/apps/details?id=com.spotify.music&gl=us") === projectKey("S", url));
check("a package containing 'id12345' is not mistaken for an App Store id", projectKey("X", "https://play.google.com/store/apps/details?id=com.id12345.app") === "app:com.id12345.app");
check("App Store key unchanged", projectKey("Insta", "https://apps.apple.com/us/app/instagram/id389801252") === "app:389801252");
check("no link -> name key", projectKey(" My App ", "") === "name:my app");

console.log("== mapping scraper output");
const app = mapPlayApp({ appId: "com.x.y", title: "X", developer: "Dev", icon: "https://i/x.png", version: "VARY", updated: 1794908157000, recentChanges: "Fixes", score: 4.25, ratings: 1234 }, "tr");
check("app fields mapped", app.name === "X" && app.developer === "Dev" && app.avgRating === 4.25 && app.ratingCount === 1234 && app.storeUrl.includes("gl=tr"));
check("'varies with device' version -> null", app.version === null && mapPlayApp({ appId: "a.b", version: "3.2.1" }).version === "3.2.1");
check("updated (ms epoch) -> ISO date", app.releasedAt === new Date(1794908157000).toISOString());
check("missing numbers don't become NaN", mapPlayApp({ appId: "a.b", title: "T" }).ratingCount === 0 && mapPlayApp({ appId: "a.b", title: "T" }).avgRating === null);
const rv = mapPlayReview({ id: "abc", score: 2, title: null, text: "t".repeat(5000), date: "2026-11-17T20:11:15.643Z", version: null, thumbsUp: 7 });
check("review mapped, text clamped, null title -> ''", rv.id === "abc" && rv.rating === 2 && rv.title === "" && rv.content.length === 2000 && rv.helpfulVotes === 7 && rv.version === null);
const noId = mapPlayReview({ score: 5, text: "hello", userName: "Ann", date: "2026-01-01T00:00:00Z" });
check("a review without an id gets a stable derived one", noId.id.length === 40 && noId.id === mapPlayReview({ score: 5, text: "hello", userName: "Ann", date: "2026-01-01T00:00:00Z" }).id);
check("bad date -> null", mapPlayReview({ id: "1", score: 1, text: "x", date: "nope" }).reviewedAt === null);

console.log(`\nRESULT: ${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
