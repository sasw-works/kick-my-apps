// Unit tests for app/lib/reviewTopics.js (no server or database):
// node tests/integration/review_topics_test.mjs
import { computeReviewTopics, taskFromTopic, topicByKey, REVIEW_TOPICS } from "../../app/lib/reviewTopics.js";

let ok = 0, bad = 0;
const check = (n, c, d = "") => { c ? (ok++, console.log("  ok  ", n)) : (bad++, console.log("  FAIL", n, d)); };
const rv = (rating, content, title = "") => ({ rating, title, content });
const topic = (res, k) => res.topics.find((t) => t.key === k);

console.log("== counting");
const reviews = [
  rv(1, "App crashes on launch every time"),
  rv(2, "Can't log in, the password reset never arrives"),
  rv(1, "Way too many ads and it crashes"),
  rv(3, "Subscription is too expensive"),
  rv(5, "Love it, no ads at all, never crashes"),
  rv(4, "Great"),
  rv(1, "Uygulama sürekli çöküyor ve hata veriyor"),
  rv(2, "Girişi yapamıyorum, şifre sıfırlama gelmiyor"),
];
const r = computeReviewTopics(reviews);
check("only 1-3 star reviews are the sample (6 of 8)", r.sample === 6, r.sample);
check("5-star praise isn't counted as a complaint", topic(r, "crash").count === 3 && topic(r, "ads").count === 1, JSON.stringify(r.topics.map((t) => [t.key, t.count])));
check("Turkish phrasing counts (çöküyor, hata, şifre)", topic(r, "crash").count === 3 && topic(r, "bugs").count >= 1 && topic(r, "login").count === 2, JSON.stringify(r.topics.map((t) => [t.key, t.count])));
check("percent is of the complaint reviews", topic(r, "crash").pct === 50);
check("sorted most-mentioned first", r.topics[0].key === "crash");
check("topics with no mentions are left out", !topic(r, "battery") && !topic(r, "storage"));
check("a topic needs 3 mentions before it can be added", topic(r, "crash").canAdd === true && topic(r, "login").canAdd === false);
check("examples are the lowest-rated mentions, at most 2", topic(r, "crash").examples.length === 2 && topic(r, "crash").examples[0].rating === 1);

console.log("== trend (input is newest first)");
const newerHeavy = [...Array(6).fill(0).map(() => rv(1, "crashes")), ...Array(6).fill(0).map(() => rv(1, "just meh"))];
check("mentions concentrated in the newer half -> up", topic(computeReviewTopics(newerHeavy), "crash").trend === "up");
const olderHeavy = [...Array(6).fill(0).map(() => rv(1, "just meh")), ...Array(6).fill(0).map(() => rv(1, "crashes"))];
check("concentrated in the older half -> down", topic(computeReviewTopics(olderHeavy), "crash").trend === "down");
const even = Array.from({ length: 12 }, (_, i) => rv(1, i % 2 ? "crashes" : "meh"));
check("spread evenly -> flat", topic(computeReviewTopics(even), "crash").trend === "flat");
check("a tiny sample never claims a trend", topic(computeReviewTopics([rv(1, "crashes"), rv(1, "crashes"), rv(1, "crashes")]), "crash").trend === "flat");

console.log("== false positives and garbage");
check("'loads' / 'upload' don't trigger the ads topic", !topic(computeReviewTopics([rv(1, "it loads slowly when I upload photos")]), "ads"));
check("'slowpoke' isn't slowness", !topic(computeReviewTopics([rv(1, "my cat is a slowpoke")]), "slow"));
check("empty / garbage input -> no topics, no NaN", computeReviewTopics([]).sample === 0 && computeReviewTopics(null).topics.length === 0 && computeReviewTopics([null, {}, { rating: 1 }]).sample === 0);
check("reviews with no text aren't counted", computeReviewTopics([rv(1, ""), rv(1, "   ")]).sample === 0);

console.log("== the task a topic becomes");
const t = taskFromTopic(topic(r, "crash"), r.sample);
check("stable key, readable title, severity from the share", t.key === "rev:crash" && t.title === "Reviews: Crashes / won't open" && t.severity === "bad", JSON.stringify(t));
check("finding states the exact counts and quotes a review", t.finding.includes("3 of the 6") && t.finding.includes("(50%)") && t.finding.includes("Example"), t.finding);
check("a suggestion is included", t.suggestion.length > 20);
check("a smaller share is 'attention', not critical", taskFromTopic({ ...topic(r, "crash"), pct: 10 }, 30).severity === "warn");
check("every topic has a fix hint and a unique key", REVIEW_TOPICS.every((x) => x.fix) && new Set(REVIEW_TOPICS.map((x) => x.key)).size === REVIEW_TOPICS.length);
check("topicByKey: known and unknown", topicByKey("crash")?.label && topicByKey("nope") === null && topicByKey("__proto__") === null);

console.log(`\nRESULT: ${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
