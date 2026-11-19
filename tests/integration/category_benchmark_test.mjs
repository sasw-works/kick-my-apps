// Category benchmark maths. Run: node tests/integration/category_benchmark_test.mjs
import { computeBenchmark, MIN_PEERS } from "../../app/lib/categoryBenchmark.js";

let ok = 0, bad = 0;
const check = (n, c, d = "") => (c ? (ok++, console.log("  ok  ", n)) : (bad++, console.log("  FAIL", n, d)));
const peers = Array.from({ length: 20 }, (_, i) => ({ id: String(10000 + i), name: `P${i}`, rating: 3 + i * 0.1, count: (i + 1) * 100 })); // 3.0 .. 4.9
const b = computeBenchmark({ id: "1", name: "Me", rating: 4.5, count: 700 }, peers);

console.log("== 1. standing");
check("rating median and percentile among peers", b.rating.median === 3.95 && b.rating.percentile === 78, JSON.stringify(b.rating));
check("rank counts peers rated higher, plus one", b.rank === 5 && b.ratedPeers === 20, String(b.rank));
check("count median and percentile", b.count.median === 1050 && b.count.percentile === 33, JSON.stringify(b.count));
check("best three by rating", b.best.map((x) => x.name).join() === "P19,P18,P17");
check("a high rating is called out; a low count too", /above the median/.test(b.notes[0]));
check("far fewer ratings than peers is flagged", computeBenchmark({ id: "1", rating: 4, count: 10 }, peers).notes.some((n) => /rate your app/.test(n)));
check("below and about-equal wording", /below the median/.test(computeBenchmark({ id: "1", rating: 3.2, count: 5000 }, peers).notes[0]) && /about the same/.test(computeBenchmark({ id: "1", rating: 4, count: 5000 }, peers).notes[0]));

console.log("== 2. honesty");
const few = computeBenchmark({ id: "1", rating: 4.5, count: 700 }, peers.slice(0, MIN_PEERS - 1));
check("too few peers -> no percentile, no rank, says so", !few.enough && few.rating.percentile === null && few.rank === null && /Too few/.test(few.notes[0]));
check("peers with under 50 ratings or no rating don't count as rated", computeBenchmark({ id: "1", rating: 4, count: 1 }, [...peers, { id: "x", name: "N", rating: null, count: 0 }, { id: "y", name: "Few", rating: 5, count: 3 }]).ratedPeers === 20);
check("an app without a rating gets no percentile", computeBenchmark({ id: "1", rating: null, count: 0 }, peers).rating.percentile === null);
check("empty peers is safe", computeBenchmark({ id: "1", rating: 4, count: 1 }, []).enough === false);

console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
