import React, { useRef } from "react";
import LogoMark from "./LogoMark";
import FooterLogo from "./FooterLogo";
import {
  Store,
  Sparkles,
  Mail,
  GitCompare,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Code2,
  ImageIcon,
  History,
  LayoutDashboard,
  Download,
  ShieldQuestion,
  Search,
} from "lucide-react";

const SAMPLE_REVIEWS = [
  { stars: 5, title: "Love the new update!", body: "Everything's so much faster, the UI is way cleaner too.", who: "Alex K. · 2 hours ago" },
  { stars: 2, title: "Checkout screen freezes", body: "The app keeps freezing while completing a purchase.", who: "Sam D. · 5 hours ago" },
  { stars: 4, title: "Wish it had dark mode", body: "Overall great, dark mode is the only thing missing.", who: "Zara A. · 1 day ago" },
  { stars: 5, title: "Support is super fast", body: "I reached out and got a reply within minutes.", who: "Kai T. · 1 day ago" },
];

const PRIORITY_ITEMS = [
  { tag: "P1", title: "Login screen bug", meta: "342 mentions · Rising ↑", color: "var(--kick)" },
  { tag: "P2", title: "Slow checkout flow", meta: "218 mentions · Steady", color: "var(--kick)" },
  { tag: "P3", title: "Missing dark mode", meta: "156 mentions · New", color: "var(--yellow)" },
  { tag: "P4", title: "Customer support", meta: "96 mentions · New", color: "var(--yellow)" },
];

// Every feature the product genuinely has — Stripe-style colorful icon boxes.
const ALL_FEATURES = [
  { icon: ImageIcon, title: "Screenshot Analysis", desc: "Reviews every screenshot across 13 categories and 4 lenses.", color: "var(--brand)", fill: "#8A7CFF", bgImage: null },
  { icon: Store, title: "Real App Store Reviews", desc: "Pulls and analyzes real, public App Store reviews in real time.", color: "var(--teal)", fill: "#79D9CC", bgImage: null },
  { icon: Search, title: "ASO / Store Listing Review", desc: "Reviews your title, description, and keywords to boost visibility.", color: "var(--yellow)", fill: "#F3C468", bgImage: null },
  { icon: ShieldQuestion, title: "Update Risk Check", desc: "Flags visual signals that could cause trouble in your next review.", color: "var(--brand)", fill: "#8A7CFF", bgImage: null },
  { icon: Sparkles, title: "Quick Wins", desc: "Ranks fixes by high impact and low effort, so you know what's first.", color: "var(--teal)", fill: "#79D9CC", bgImage: null },
  { icon: Code2, title: "Code-Level Suggestions", desc: "Suggests sample CSS, Swift, or Kotlin snippets for quick fixes.", color: "var(--yellow)", fill: "#F3C468", bgImage: null },
  { icon: ImageIcon, title: "Visual Annotation", desc: "Marks each finding directly on your screenshot, showing exactly where.", color: "var(--brand)", fill: "#8A7CFF", bgImage: null },
  { icon: History, title: "History & Trend", desc: "Saves every scan so you can track your health score over time.", color: "var(--teal)", fill: "#79D9CC", bgImage: null },
  { icon: GitCompare, title: "Detailed Comparison", desc: "Compares two scans finding by finding to see who's ahead.", color: "var(--yellow)", fill: "#F3C468", bgImage: null },
  { icon: LayoutDashboard, title: "My Apps Dashboard", desc: "See every tracked app, its score, and history in one place.", color: "var(--brand)", fill: "#8A7CFF", bgImage: null },
  { icon: Mail, title: "Weekly Email Digest", desc: "Sends new App Store reviews to your inbox every week.", color: "var(--teal)", fill: "#79D9CC", bgImage: null },
  { icon: Download, title: "PDF Export", desc: "Download your full report as a PDF and share it instantly.", color: "var(--yellow)", fill: "#F3C468", bgImage: null },
];

const PRICING_PLANS = [
  {
    tier: "FREE",
    name: "Free",
    price: "€0",
    priceNote: "Free forever",
    desc: "For curious founders and designers testing the value of feedback intelligence.",
    features: [
      { text: "2 AI reports per month", included: true },
      { text: "1 comparison report per month", included: true },
      { text: "Share reports via link", included: true },
      { text: "Pulse alerts", included: false },
      { text: "PDF export", included: false },
      { text: "Email support (48h response)", included: true },
    ],
    cta: "Get started free",
    highlighted: false,
  },
  {
    tier: "PRO",
    name: "Pro",
    priceMonthly: "€14",
    priceMonthlyNote: "billed monthly",
    priceAnnual: "€11",
    priceAnnualNote: "€134/yr · billed annually",
    priceSuffix: "/mo",
    desc: "For PMs, UX leads, and founders who need continuous competitive intelligence.",
    features: [
      { text: "10 AI reports per month", included: true },
      { text: "3 comparison reports per month", included: true },
      { text: "Share reports via link", included: true },
      { text: "2 Pulse monitors", included: true },
      { text: "PDF export", included: true },
      { text: "Priority email support (24h response)", included: true },
    ],
    cta: "Upgrade to Pro",
    highlighted: true,
  },
  {
    tier: "ENTERPRISE",
    name: "Enterprise",
    price: "Custom",
    priceNote: "Tailored to your organization",
    desc: "For teams and organizations that need custom limits, SSO, and integrations.",
    features: [
      { text: "Everything in Pro, unlimited", included: true, bold: true },
      { text: "Unlimited seats", included: true },
      { text: "SSO authentication (available on request)", included: true },
      { text: "Slack & Teams integration (available on request)", included: true },
      { text: "API access & data export (available on request)", included: true },
      { text: "Dedicated support", included: true },
    ],
    cta: "Contact Us",
    highlighted: false,
  },
];

const FAQ = [
  {
    q: "What data do you collect?",
    a: "We only analyze public App Store reviews and the screenshots you upload. We never access any private or hidden user data.",
  },
  {
    q: "How fresh are the reviews?",
    a: "We pull them from the App Store in real time on every analysis — no caching, so you always see the latest reviews.",
  },
  {
    q: "Can I compare against competitor apps?",
    a: "Yes — you can compare any two scans side by side, including your own app against a competitor.",
  },
  {
    q: "How are findings prioritized?",
    a: "Every finding is tagged critical/warning/good, and the 'Quick Wins' panel automatically highlights the high-impact, low-effort items.",
  },
  {
    q: "How does the weekly digest work?",
    a: "Once you start tracking an app, you'll get an email every week summarizing its new App Store reviews.",
  },
];

function Icon01({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 92 92" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="92" height="92" rx="46" fill="#1A2B3B" />
      <path d="M58.7273 64.1818C58.7273 65.186 57.9132 66 56.9091 66C55.9049 66 55.0909 65.186 55.0909 64.1818C55.0909 63.1777 55.9049 62.3636 56.9091 62.3636C57.9132 62.3636 58.7273 63.1777 58.7273 64.1818Z" fill="url(#i01g0)" />
      <path d="M66 56.9091C66 57.9132 65.186 58.7273 64.1818 58.7273C63.1777 58.7273 62.3636 57.9132 62.3636 56.9091C62.3636 55.9049 63.1777 55.0909 64.1818 55.0909C65.186 55.0909 66 55.9049 66 56.9091Z" fill="url(#i01g1)" />
      <path d="M29.6364 35.0909C29.6364 36.0951 28.8223 36.9091 27.8182 36.9091C26.814 36.9091 26 36.0951 26 35.0909C26 34.0868 26.814 33.2727 27.8182 33.2727C28.8223 33.2727 29.6364 34.0868 29.6364 35.0909Z" fill="url(#i01g2)" />
      <path d="M36.9091 27.8182C36.9091 28.8223 36.0951 29.6364 35.0909 29.6364C34.0868 29.6364 33.2727 28.8223 33.2727 27.8182C33.2727 26.814 34.0868 26 35.0909 26C36.0951 26 36.9091 26.814 36.9091 27.8182Z" fill="url(#i01g3)" />
      <path fillRule="evenodd" clipRule="evenodd" d="M46 35.9689L44.8142 40.8592C44.3402 42.814 42.814 44.3402 40.8592 44.8142L35.9689 46L40.8592 47.1858C42.814 47.6598 44.3402 49.186 44.8142 51.1408L46 56.0311L47.1858 51.1408C47.6598 49.186 49.186 47.6598 51.1408 47.1858L56.0311 46L51.1408 44.8142C49.186 44.3402 47.6598 42.814 47.1858 40.8592L46 35.9689ZM48.3732 33.321C47.7697 30.8324 44.2303 30.8324 43.6268 33.321L41.9664 40.1687C41.7509 41.0572 41.0572 41.7509 40.1687 41.9664L33.321 43.6268C30.8324 44.2303 30.8324 47.7697 33.321 48.3732L40.1687 50.0336C41.0572 50.2491 41.7509 50.9428 41.9664 51.8313L43.6268 58.679C44.2303 61.1676 47.7697 61.1676 48.3732 58.679L50.0336 51.8313C50.2491 50.9428 50.9428 50.2491 51.8313 50.0336L58.679 48.3732C61.1676 47.7697 61.1676 44.2303 58.679 43.6268L51.8313 41.9664C50.9428 41.7509 50.2491 41.0572 50.0336 40.1687L48.3732 33.321Z" fill="url(#i01g4)" />
      <path fillRule="evenodd" clipRule="evenodd" d="M40.5539 64.754C40.2378 65.6007 39.2953 66.0309 38.4486 65.7149C32.9642 63.6679 28.5588 59.4184 26.3086 54.0415C25.9597 53.2078 26.3527 52.2492 27.1864 51.9003C28.0201 51.5514 28.9787 51.9444 29.3276 52.7781C31.2295 57.3226 34.9573 60.9185 39.593 62.6487C40.4397 62.9648 40.8699 63.9073 40.5539 64.754Z" fill="url(#i01g5)" />
      <path fillRule="evenodd" clipRule="evenodd" d="M64.7551 40.5832C63.9087 40.8999 62.9658 40.4704 62.6491 39.624C60.9053 34.9628 57.2674 31.2195 52.6715 29.3318C51.8355 28.9885 51.4362 28.0324 51.7795 27.1965C52.1229 26.3605 53.0789 25.9611 53.9149 26.3045C59.3503 28.537 63.6503 32.96 65.7144 38.4772C66.031 39.3236 65.6016 40.2665 64.7551 40.5832Z" fill="url(#i01g6)" />
      <defs>
        {["i01g0", "i01g1", "i01g2", "i01g3", "i01g4", "i01g5", "i01g6"].map((id) => (
          <linearGradient key={id} id={id} x1="26" y1="26" x2="46" y2="66" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFB00" />
            <stop offset="1" stopColor="#9FFD7F" />
          </linearGradient>
        ))}
      </defs>
    </svg>
  );
}

function Icon02({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 92 92" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="92" height="92" rx="46" fill="#1A2B3B" />
      <path d="M35.0909 66C34.0868 66 33.2727 65.186 33.2727 64.1818C33.2727 63.1777 34.0868 62.3636 35.0909 62.3636C36.0951 62.3636 36.9091 63.1777 36.9091 64.1818C36.9091 65.186 36.0951 66 35.0909 66Z" fill="url(#i02g0)" />
      <path d="M56.9091 29.6364C55.9049 29.6364 55.0909 28.8223 55.0909 27.8182C55.0909 26.814 55.9049 26 56.9091 26C57.9132 26 58.7273 26.814 58.7273 27.8182C58.7273 28.8223 57.9132 29.6364 56.9091 29.6364Z" fill="url(#i02g1)" />
      <path d="M64.1818 36.9091C63.1777 36.9091 62.3636 36.0951 62.3636 35.0909C62.3636 34.0868 63.1777 33.2727 64.1818 33.2727C65.186 33.2727 66 34.0868 66 35.0909C66 36.0951 65.186 36.9091 64.1818 36.9091Z" fill="url(#i02g2)" />
      <path d="M43.6268 33.321C44.2303 30.8324 47.7697 30.8324 48.3732 33.321L50.0336 40.1687C50.2491 41.0572 50.9428 41.7509 51.8313 41.9664L58.679 43.6268C61.1676 44.2303 61.1676 47.7697 58.679 48.3732L51.8313 50.0336C50.9428 50.2491 50.2491 50.9428 50.0336 51.8313L48.3732 58.679C47.7697 61.1676 44.2303 61.1676 43.6268 58.679L41.9664 51.8313C41.7509 50.9428 41.0572 50.2491 40.1687 50.0336L33.321 48.3732C30.8324 47.7697 30.8324 44.2303 33.321 43.6268L40.1687 41.9664C41.0572 41.7509 41.7509 41.0572 41.9664 40.1687L43.6268 33.321Z" fill="url(#i02g3)" />
      <path fillRule="evenodd" clipRule="evenodd" d="M64.754 51.4461C65.6007 51.7621 66.0309 52.7047 65.7149 53.5513C63.6679 59.0358 59.4184 63.4412 54.0415 65.6913C53.2079 66.0402 52.2492 65.6472 51.9003 64.8135C51.5514 63.9799 51.9444 63.0212 52.7781 62.6723C57.3226 60.7705 60.9186 57.0426 62.6488 52.4069C62.9648 51.5603 63.9073 51.1301 64.754 51.4461Z" fill="url(#i02g4)" />
      <path fillRule="evenodd" clipRule="evenodd" d="M40.5832 27.2448C40.8999 28.0912 40.4704 29.0341 39.624 29.3508C34.9628 31.0946 31.2195 34.7325 29.3318 39.3284C28.9885 40.1644 28.0325 40.5638 27.1965 40.2204C26.3605 39.877 25.9612 38.921 26.3045 38.085C28.537 32.6496 32.96 28.3497 38.4772 26.2856C39.3237 25.9689 40.2666 26.3984 40.5832 27.2448Z" fill="url(#i02g5)" />
      <path d="M27.8182 58.7273C26.814 58.7273 26 57.9132 26 56.9091C26 55.9049 26.814 55.0909 27.8182 55.0909C28.8223 55.0909 29.6364 55.9049 29.6364 56.9091C29.6364 57.9132 28.8223 58.7273 27.8182 58.7273Z" fill="url(#i02g6)" />
      <defs>
        {["i02g0", "i02g1", "i02g2", "i02g3", "i02g4", "i02g5", "i02g6"].map((id) => (
          <linearGradient key={id} id={id} x1="26" y1="26" x2="46" y2="66" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFB00" />
            <stop offset="1" stopColor="#9FFD7F" />
          </linearGradient>
        ))}
      </defs>
    </svg>
  );
}

function Icon03({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 92 92" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="92" height="92" rx="46" fill="#1A2B3B" />
      <path d="M35.89 31.1529C36.3803 29.1309 39.2561 29.1309 39.7464 31.1529L41.0955 36.7166C41.2706 37.4385 41.8342 38.0022 42.5561 38.1772L48.1199 39.5264C50.1419 40.0167 50.1419 42.8924 48.1199 43.3827L42.5561 44.7319C41.8342 44.9069 41.2706 45.4706 41.0955 46.1925L39.7464 51.7562C39.2561 53.7782 36.3803 53.7782 35.89 51.7562L34.5409 46.1925C34.3658 45.4706 33.8022 44.9069 33.0802 44.7319L27.5165 43.3827C25.4945 42.8924 25.4945 40.0167 27.5165 39.5264L33.0802 38.1772C33.8022 38.0022 34.3658 37.4385 34.5409 36.7166L35.89 31.1529Z" fill="url(#i03g0)" />
      <path d="M52.0861 50.5696C52.3879 49.3253 54.1576 49.3253 54.4593 50.5696L55.2895 53.9934C55.3973 54.4377 55.7441 54.7846 56.1884 54.8923L59.6122 55.7225C60.8565 56.0242 60.8565 57.7939 59.6122 58.0957L56.1884 58.9259C55.7441 59.0336 55.3973 59.3805 55.2895 59.8248L54.4593 63.2486C54.1576 64.4929 52.3879 64.4929 52.0861 63.2486L51.2559 59.8248C51.1482 59.3805 50.8013 59.0336 50.3571 58.9259L46.9332 58.0957C45.6889 57.7939 45.6889 56.0242 46.9332 55.7225L50.3571 54.8923C50.8013 54.7846 51.1482 54.4377 51.2559 53.9934L52.0861 50.5696Z" fill="url(#i03g1)" />
      <path d="M57.9486 30.9306C58.1466 30.114 59.308 30.114 59.506 30.9306L60.0508 33.1775C60.1215 33.4691 60.3491 33.6967 60.6407 33.7674L62.8876 34.3122C63.7041 34.5102 63.7041 35.6716 62.8876 35.8696L60.6407 36.4144C60.3491 36.4851 60.1215 36.7128 60.0508 37.0043L59.506 39.2512C59.308 40.0678 58.1466 40.0678 57.9486 39.2512L57.4037 37.0043C57.333 36.7128 57.1054 36.4851 56.8139 36.4144L54.567 35.8696C53.7504 35.6716 53.7504 34.5102 54.567 34.3122L56.8139 33.7674C57.1054 33.6967 57.333 33.4691 57.4037 33.1775L57.9486 30.9306Z" fill="url(#i03g2)" />
      <path fillRule="evenodd" clipRule="evenodd" d="M58.7273 31.3293L58.2826 33.1631C58.1048 33.8961 57.5325 34.4685 56.7995 34.6462L54.9656 35.0909L56.7995 35.5356C57.5325 35.7133 58.1048 36.2857 58.2826 37.0187L58.7273 38.8526L59.172 37.0187C59.3497 36.2857 59.922 35.7133 60.6551 35.5356L62.4889 35.0909L60.6551 34.6462C59.922 34.4685 59.3497 33.8961 59.172 33.1631L58.7273 31.3293ZM59.6172 30.3363C59.3909 29.4031 58.0636 29.4031 57.8373 30.3363L57.2147 32.9042C57.1339 33.2374 56.8737 33.4975 56.5405 33.5783L53.9727 34.201C53.0394 34.4273 53.0394 35.7545 53.9727 35.9808L56.5405 36.6035C56.8737 36.6843 57.1339 36.9445 57.2147 37.2777L57.8373 39.8455C58.0636 40.7788 59.3909 40.7788 59.6172 39.8455L60.2399 37.2777C60.3207 36.9445 60.5808 36.6843 60.914 36.6035L63.4819 35.9808C64.4151 35.7545 64.4151 34.4273 63.4819 34.201L60.914 33.5783C60.5808 33.4975 60.3207 33.2374 60.2399 32.9042L59.6172 30.3363Z" fill="url(#i03g3)" />
      <path d="M36.9091 66C35.9049 66 35.0909 65.186 35.0909 64.1818C35.0909 63.1777 35.9049 62.3636 36.9091 62.3636C37.9132 62.3636 38.7273 63.1777 38.7273 64.1818C38.7273 65.186 37.9132 66 36.9091 66Z" fill="url(#i03g4)" />
      <path d="M27.8182 58.7273C26.814 58.7273 26 57.9132 26 56.9091C26 55.9049 26.814 55.0909 27.8182 55.0909C28.8223 55.0909 29.6364 55.9049 29.6364 56.9091C29.6364 57.9132 28.8223 58.7273 27.8182 58.7273Z" fill="url(#i03g5)" />
      <path d="M47.8182 29.6364C46.814 29.6364 46 28.8223 46 27.8182C46 26.814 46.814 26 47.8182 26C48.8223 26 49.6364 26.814 49.6364 27.8182C49.6364 28.8223 48.8223 29.6364 47.8182 29.6364Z" fill="url(#i03g6)" />
      <path d="M64.1818 49.6364C63.1777 49.6364 62.3636 48.8223 62.3636 47.8182C62.3636 46.814 63.1777 46 64.1818 46C65.186 46 66 46.814 66 47.8182C66 48.8223 65.186 49.6364 64.1818 49.6364Z" fill="url(#i03g7)" />
      <defs>
        {["i03g0", "i03g1", "i03g2", "i03g3", "i03g4", "i03g5", "i03g6", "i03g7"].map((id) => (
          <linearGradient key={id} id={id} x1="26" y1="26" x2="46" y2="66" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFB00" />
            <stop offset="1" stopColor="#9FFD7F" />
          </linearGradient>
        ))}
      </defs>
    </svg>
  );
}

function Icon04({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 92 92" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="92" height="92" rx="46" fill="#1A2B3B" />
      <path fillRule="evenodd" clipRule="evenodd" d="M56.2853 27.7467C56.7517 26.68 58.4034 26.7562 58.7005 27.9752L59.5722 31.5531C59.6853 32.0174 60.0495 32.3799 60.516 32.4924L64.111 33.36C65.4175 33.6753 65.4175 35.5247 64.111 35.84L60.516 36.7076C60.0495 36.8201 59.6853 37.1826 59.5722 37.6469L58.7005 41.2248C58.3836 42.5251 56.5254 42.5251 56.2086 41.2248L55.3369 37.6469C55.3298 37.6179 55.3218 37.5892 55.3128 37.561C55.1779 37.1383 54.8304 36.8131 54.3931 36.7076L50.7981 35.84L50.7828 35.8362C49.4916 35.5102 49.4967 33.6741 50.7981 33.36L54.3931 32.4924C54.8596 32.3799 55.2238 32.0174 55.3369 31.5531L56.2086 27.9752C56.2284 27.894 56.2543 27.8178 56.2853 27.7467ZM28.8182 49.8C28.8182 50.8493 27.9635 51.7 26.9091 51.7C25.8547 51.7 25 50.8493 25 49.8C25 48.7507 25.8547 47.9 26.9091 47.9C27.9635 47.9 28.8182 48.7507 28.8182 49.8ZM65.0909 46C66.1453 46 67 45.1493 67 44.1C67 43.0507 66.1453 42.2 65.0909 42.2C64.0365 42.2 63.1818 43.0507 63.1818 44.1C63.1818 45.1493 64.0365 46 65.0909 46ZM34.5455 36.88C35.8107 36.88 36.8364 35.8592 36.8364 34.6C36.8364 33.3408 35.8107 32.32 34.5455 32.32C33.2802 32.32 32.2545 33.3408 32.2545 34.6C32.2545 35.8592 33.2802 36.88 34.5455 36.88ZM40.0165 36.2911C39.4801 38.0119 38.1466 39.3836 36.4456 39.9788C36.4515 40.0348 36.4545 40.0915 36.4545 40.1489L36.4545 53.7511C36.4545 53.8085 36.4515 53.8652 36.4456 53.9212C38.1466 54.5164 39.4801 55.8881 40.0165 57.6089C40.1001 57.5965 40.1856 57.59 40.2727 57.59H51.7272C51.8143 57.59 51.8999 57.5965 51.9835 57.6089C52.5409 55.8209 53.9588 54.4098 55.7553 53.8551C55.7428 53.7718 55.7363 53.6867 55.7363 53.6V47.9C55.7363 46.9556 56.5056 46.19 57.4545 46.19C58.4034 46.19 59.1727 46.9556 59.1727 47.9V53.6C59.1727 53.6867 59.1662 53.7718 59.1537 53.855C61.4871 54.5755 63.1818 56.7408 63.1818 59.3C63.1818 62.448 60.6176 65 57.4545 65C54.8831 65 52.7075 63.3134 51.9835 60.9911C51.8999 61.0035 51.8143 61.01 51.7272 61.01H40.2727C40.1856 61.01 40.1001 61.0036 40.0165 60.9911C39.2925 63.3134 37.1169 65 34.5455 65C31.3824 65 28.8182 62.448 28.8182 59.3C28.8182 56.8149 30.4162 54.7012 32.6453 53.9212C32.6394 53.8652 32.6364 53.8085 32.6364 53.7511V40.1489C32.6364 40.0915 32.6394 40.0347 32.6453 39.9788C30.4162 39.1988 28.8182 37.0851 28.8182 34.6C28.8182 31.452 31.3824 28.9 34.5455 28.9C37.1169 28.9 39.2925 30.5866 40.0165 32.9089C40.1001 32.8964 40.1857 32.89 40.2728 32.89H44.091C45.0399 32.89 45.8091 33.6556 45.8091 34.6C45.8091 35.5444 45.0399 36.31 44.091 36.31H40.2728C40.1857 36.31 40.1001 36.3035 40.0165 36.2911ZM36.8364 59.3C36.8364 60.5592 35.8107 61.58 34.5455 61.58C33.2802 61.58 32.2545 60.5592 32.2545 59.3C32.2545 58.0408 33.2802 57.02 34.5455 57.02C35.8107 57.02 36.8364 58.0408 36.8364 59.3ZM57.4545 61.58C58.7198 61.58 59.7455 60.5592 59.7455 59.3C59.7455 58.0408 58.7198 57.02 57.4545 57.02C56.1893 57.02 55.1636 58.0408 55.1636 59.3C55.1636 60.5592 56.1893 61.58 57.4545 61.58Z" fill="url(#i04g0)" />
      <defs>
        <linearGradient id="i04g0" x1="25" y1="27" x2="42.8376" y2="66.4306" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFB00" />
          <stop offset="1" stopColor="#9FFD7F" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Icon05({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 92 92" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="92" height="92" rx="46" fill="#1A2B3B" />
      <path fillRule="evenodd" clipRule="evenodd" d="M31.6 49.36C32.3953 49.36 33.04 50.0047 33.04 50.8V58.96H41.2C41.9953 58.96 42.64 59.6047 42.64 60.4C42.64 61.1953 41.9953 61.84 41.2 61.84H31.6C30.8047 61.84 30.16 61.1953 30.16 60.4V50.8C30.16 50.0047 30.8047 49.36 31.6 49.36Z" fill="url(#i05g0)" />
      <path fillRule="evenodd" clipRule="evenodd" d="M49.36 31.6C49.36 30.8047 50.0047 30.16 50.8 30.16H60.4C61.1953 30.16 61.84 30.8047 61.84 31.6V41.2C61.84 41.9953 61.1953 42.64 60.4 42.64C59.6047 42.64 58.96 41.9953 58.96 41.2V33.04H50.8C50.0047 33.04 49.36 32.3953 49.36 31.6Z" fill="url(#i05g1)" />
      <path fillRule="evenodd" clipRule="evenodd" d="M61.4182 30.5818C61.9806 31.1441 61.9806 32.0559 61.4182 32.6182L50.2182 43.8182C49.6559 44.3806 48.7441 44.3806 48.1818 43.8182C47.6194 43.2559 47.6194 42.3441 48.1818 41.7818L59.3818 30.5818C59.9441 30.0194 60.8559 30.0194 61.4182 30.5818Z" fill="url(#i05g2)" />
      <path fillRule="evenodd" clipRule="evenodd" d="M44.6183 47.3818C45.1806 47.9441 45.1806 48.8559 44.6183 49.4182L32.6183 61.4182C32.0559 61.9806 31.1442 61.9806 30.5818 61.4182C30.0194 60.8559 30.0194 59.9441 30.5818 59.3818L42.5818 47.3818C43.1442 46.8194 44.0559 46.8194 44.6183 47.3818Z" fill="url(#i05g3)" />
      <path d="M33.2 31.6C33.2 32.4837 32.4837 33.2 31.6 33.2C30.7163 33.2 30 32.4837 30 31.6C30 30.7163 30.7163 30 31.6 30C32.4837 30 33.2 30.7163 33.2 31.6Z" fill="url(#i05g4)" />
      <path d="M62 60.4C62 61.2837 61.2837 62 60.4 62C59.5163 62 58.8 61.2837 58.8 60.4C58.8 59.5163 59.5163 58.8 60.4 58.8C61.2837 58.8 62 59.5163 62 60.4Z" fill="url(#i05g5)" />
      <defs>
        {["i05g0", "i05g1", "i05g2", "i05g3", "i05g4", "i05g5"].map((id) => (
          <linearGradient key={id} id={id} x1="30" y1="30" x2="46" y2="62" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFB00" />
            <stop offset="1" stopColor="#9FFD7F" />
          </linearGradient>
        ))}
      </defs>
    </svg>
  );
}

function Icon06({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 92 92" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="92" height="92" rx="46" fill="#1A2B3B" />
      <path fillRule="evenodd" clipRule="evenodd" d="M38.9729 37.2378C38.9729 36.2795 39.7498 35.5026 40.7081 35.5026H51.1189C52.0772 35.5026 52.854 36.2795 52.854 37.2378C52.854 38.196 52.0772 38.9729 51.1189 38.9729H47.6486V52.854H51.1189C52.0772 52.854 52.854 53.6309 52.854 54.5892C52.854 55.5475 52.0772 56.3243 51.1189 56.3243H40.7081C39.7498 56.3243 38.9729 55.5475 38.9729 54.5892C38.9729 53.6309 39.7498 52.854 40.7081 52.854H44.1783V38.9729H40.7081C39.7498 38.9729 38.9729 38.196 38.9729 37.2378Z" fill="url(#i06g0)" />
      <path d="M58.0594 63.2649C58.0594 64.2231 57.2826 65 56.3243 65C55.366 65 54.5892 64.2231 54.5892 63.2649C54.5892 62.3066 55.366 61.5297 56.3243 61.5297C57.2826 61.5297 58.0594 62.3066 58.0594 63.2649Z" fill="url(#i06g1)" />
      <path d="M65 56.3243C65 57.2826 64.2232 58.0594 63.2649 58.0594C62.3066 58.0594 61.5297 57.2826 61.5297 56.3243C61.5297 55.366 62.3066 54.5892 63.2649 54.5892C64.2232 54.5892 65 55.366 65 56.3243Z" fill="url(#i06g2)" />
      <path fillRule="evenodd" clipRule="evenodd" d="M40.7161 63.8109C40.4145 64.6189 39.515 65.0295 38.707 64.7279C33.4731 62.7744 29.2689 58.719 27.1215 53.5877C26.7885 52.7921 27.1636 51.8772 27.9592 51.5443C28.7548 51.2113 29.6696 51.5864 30.0026 52.382C31.8176 56.7189 35.3752 60.1506 39.7991 61.8018C40.6071 62.1034 41.0177 63.0029 40.7161 63.8109Z" fill="url(#i06g3)" />
      <path fillRule="evenodd" clipRule="evenodd" d="M63.812 40.7441C63.0042 41.0463 62.1044 40.6364 61.8022 39.8286C60.138 35.3804 56.6662 31.808 52.2803 30.0066C51.4825 29.6789 51.1014 28.7665 51.429 27.9687C51.7567 27.1709 52.6691 26.7898 53.4669 27.1175C58.654 29.248 62.7576 33.469 64.7274 38.7342C65.0296 39.542 64.6198 40.4419 63.812 40.7441Z" fill="url(#i06g4)" />
      <path d="M31.5301 27.8419C31.7461 26.9513 33.0127 26.9513 33.2287 27.8419L33.8229 30.2925C33.9 30.6105 34.1483 30.8587 34.4663 30.9358L36.9168 31.5301C37.8075 31.746 37.8075 33.0127 36.9169 33.2287L34.4663 33.8229C34.4265 33.8325 34.3879 33.8448 34.3505 33.8596C34.0889 33.9631 33.8904 34.188 33.8229 34.4662L33.2287 36.9168C33.2152 36.9725 33.1976 37.0247 33.1764 37.0734C32.8585 37.804 31.7326 37.7518 31.5301 36.9168L30.9359 34.4662C30.9311 34.4464 30.9256 34.4268 30.9194 34.4075C30.8275 34.1179 30.5906 33.8952 30.2925 33.8229L27.8419 33.2287C27.7863 33.2152 27.7341 33.1976 27.6854 33.1764C26.9548 32.8585 27.007 31.7325 27.8419 31.5301L30.2925 30.9358C30.6105 30.8587 30.8588 30.6105 30.9359 30.2925L31.5301 27.8419Z" fill="url(#i06g5)" />
      <defs>
        {["i06g0", "i06g1", "i06g2", "i06g3", "i06g4", "i06g5"].map((id) => (
          <linearGradient key={id} id={id} x1="27" y1="27" x2="46" y2="65" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFB00" />
            <stop offset="1" stopColor="#9FFD7F" />
          </linearGradient>
        ))}
      </defs>
    </svg>
  );
}

function AppStoreDataIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#kma-icon1-clip)">
        <path opacity="0.3" fillRule="evenodd" clipRule="evenodd" d="M0.601562 59.707L59.9986 0.309998L119.396 59.707L59.9986 119.104L0.601562 59.707Z" stroke="#CACACA" />
        <path fillRule="evenodd" clipRule="evenodd" d="M45 44V74H75V44" fill="#2B59FF" fillOpacity="0.1" />
        <path opacity="0.3" d="M102.426 16.574L17.574 101.426M119 59.603H1M102.426 101.426L17.574 16.574M60 118.603V0.603027" stroke="#CACACA" />
        <path fillRule="evenodd" clipRule="evenodd" d="M31 30H89V88H31V30Z" stroke="#666666" strokeWidth="2" />
      </g>
      <defs>
        <clipPath id="kma-icon1-clip">
          <rect width="120" height="120" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

function FreshIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#kma-icon2-clip)">
        <path opacity="0.3" fillRule="evenodd" clipRule="evenodd" d="M0.601562 59.707L59.9986 0.309998L119.396 59.707L59.9986 119.104L0.601562 59.707Z" stroke="#CACACA" />
        <path opacity="0.3" d="M102.426 16.574L17.574 101.426M119 59.603H1M102.426 101.426L17.574 16.574M60 118.603V0.603027M45.5 44.5H74.5V73.5H45.5V44.5Z" stroke="#CACACA" />
        <path fillRule="evenodd" clipRule="evenodd" d="M31 30H89V88H31V30Z" stroke="#666666" strokeWidth="2" />
        <path fillRule="evenodd" clipRule="evenodd" d="M59.0781 29.089V60.089H90.0781V29.089H59.0781Z" fill="#2B59FF" fillOpacity="0.1" />
        <path fillRule="evenodd" clipRule="evenodd" d="M60.0781 30.089H89.0781V59.089H60.0781V30.089Z" stroke="#666666" strokeWidth="2" />
      </g>
      <defs>
        <clipPath id="kma-icon2-clip">
          <rect width="120" height="120" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="faq-row">
      <button className="faq-q" onClick={() => setOpen(!open)}>
        <span>{q}</span>
        <span className={`faq-toggle ${open ? "faq-toggle-open" : ""}`}>
          {open ? <X size={22} color="#FFFFFF" /> : <Plus size={22} color="var(--muted)" />}
        </span>
      </button>
      <div className={`faq-a-wrap ${open ? "faq-a-wrap-open" : ""}`}>
        <div className="faq-a-inner">
          <div className="faq-a">{a}</div>
        </div>
      </div>
    </div>
  );
}

export default function MarketingSections() {
  const carouselRef = useRef(null);
  const dragState = useRef({ isDown: false, startX: 0, scrollStart: 0, moved: false });
  const [billingCycle, setBillingCycle] = React.useState("annual"); // monthly | annual

  const scrollCarousel = (dir) => {
    carouselRef.current?.scrollBy({ left: dir * 380, behavior: "smooth" });
  };

  const onDragStart = (e) => {
    const el = carouselRef.current;
    if (!el) return;
    dragState.current = { isDown: true, startX: e.pageX, scrollStart: el.scrollLeft, moved: false };
    el.classList.add("mkt-carousel-dragging");
  };
  const onDragMove = (e) => {
    const el = carouselRef.current;
    if (!el || !dragState.current.isDown) return;
    const dx = e.pageX - dragState.current.startX;
    if (Math.abs(dx) > 4) dragState.current.moved = true;
    el.scrollLeft = dragState.current.scrollStart - dx;
  };
  const endDrag = () => {
    const el = carouselRef.current;
    dragState.current.isDown = false;
    el?.classList.remove("mkt-carousel-dragging");
  };
  return (
    <div className="mkt-root">
      <style>{`
        .mkt-root { width: 100%; max-width: 1000px; margin: 90px auto 0; font-family: var(--font-inter), sans-serif; }
        .mkt-section-title { font-size: 34px; font-weight: 500; letter-spacing: -0.02em; color: var(--chalk); text-align: center; margin-bottom: 10px; }
        .mkt-section-sub { font-size: 15px; font-family: var(--font-body); color: var(--muted); text-align: center; max-width: 480px; margin: 0 auto 40px; }
        .mkt-title-card {
          background: var(--ink);
          border-radius: 20px;
          padding: 24px 32px;
          margin: 0 auto 40px;
          width: fit-content;
          max-width: 90%;
        }

        .mkt-browser-frame {
          border: 1px solid var(--ink-3); border-radius: 14px; overflow: hidden;
          box-shadow: var(--shadow); margin-bottom: 90px;
        }
        .mkt-browser-topbar {
          display: flex; align-items: center; gap: 14px;
          background: var(--ink-2); border-bottom: 1px solid var(--ink-3); padding: 12px 16px;
        }
        .mkt-browser-dots { display: flex; gap: 7px; }
        .mkt-browser-dots span { width: 11px; height: 11px; border-radius: 50%; display: block; }
        .mkt-browser-url {
          font-family: var(--font-mono); font-size: 11.5px; color: var(--muted);
          background: var(--ink); border-radius: 999px; padding: 5px 14px; flex: 1; max-width: 260px;
        }
        .mkt-preview-card {
          background: var(--ink-2); padding: 0;
        }
        .mkt-preview-full-img { width: 100%; display: block; }
        .mkt-preview-body { display: flex; gap: 28px; align-items: flex-start; }
        .mkt-preview-chart { width: 260px; flex-shrink: 0; border-radius: 12px; margin-right: 25px; }
        .mkt-preview-right { flex: 1; min-width: 0; }
        @media (max-width: 700px) {
          .mkt-preview-body { flex-direction: column; }
          .mkt-preview-chart { width: 100%; }
        }
        .mkt-preview-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .mkt-preview-score { display: flex; align-items: center; gap: 14px; }
        .mkt-preview-score-num { font-family: var(--font-display); font-size: 40px; font-weight: 700; color: var(--teal); }
        .mkt-preview-findings { display: flex; flex-direction: column; gap: 8px; }
        .mkt-preview-row { display: flex; align-items: center; gap: 10px; background: var(--ink); border-radius: 8px; padding: 10px 14px; font-size: 15px; font-family: var(--font-body); }
        .mkt-preview-row span { flex: 1; color: var(--chalk); }

        .mkt-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 90px; }
        .mkt-grid-4 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 90px; }
        .mkt-feature-card {
          background: var(--ink-2); border: 1px solid var(--ink-3); border-radius: 16px;
          box-shadow: var(--shadow); padding: 26px;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .mkt-feature-card:hover { transform: translateY(-3px); border-color: var(--brand); }

        .mkt-halo {
          position: relative; border-radius: 24px; padding: 17px; overflow: hidden;
          display: flex; height: 100%; box-sizing: border-box;
        }
        .mkt-halo-pink { background: linear-gradient(135deg, #31c1d2, #73e49d); }
        .mkt-halo-mint { background: linear-gradient(225deg, #6564ee, #d0a5fe); }
        .mkt-feature-card-floating {
          position: relative; z-index: 1; border: none; width: 100%;
        }
        .mkt-feature-icon {
          width: 66px; height: 66px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; margin-bottom: 31px;
        }
        .mkt-feature-title { font-size: 19px; font-weight: 500; margin-bottom: 6px; }
        .mkt-feature-desc { font-size: 15px; font-family: var(--font-body); color: var(--muted); line-height: 1.6; margin-bottom: 18px; }

        .mkt-ticker { max-height: 168px; overflow: hidden; -webkit-mask-image: linear-gradient(to bottom, transparent, black 15%, black 85%, transparent); mask-image: linear-gradient(to bottom, transparent, black 15%, black 85%, transparent); }
        .mkt-ticker-track { display: flex; flex-direction: column; gap: 8px; animation: ticker-scroll 14s linear infinite; }
        @keyframes ticker-scroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }

        .mkt-live-dot {
          width: 7px; height: 7px; border-radius: 50%; background: var(--teal); flex-shrink: 0;
          animation: live-pulse 1.6s ease-in-out infinite;
        }
        @keyframes live-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(14,165,160,0.4); }
          50% { opacity: 0.5; box-shadow: 0 0 0 4px rgba(14,165,160,0); }
        }
        .mkt-rating-dist { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; }
        .mkt-rating-dist-row { display: flex; align-items: center; gap: 8px; }
        .mkt-rating-dist-label { font-size: 11px; color: var(--muted); width: 20px; flex-shrink: 0; font-family: var(--font-mono); }
        .mkt-rating-dist-bar { flex: 1; height: 6px; border-radius: 3px; background: var(--ink-3); overflow: hidden; }
        .mkt-rating-dist-fill { height: 100%; background: rgb(255, 0, 122); border-radius: 3px; }
        .mkt-rating-dist-pct { font-size: 10.5px; color: var(--muted); width: 32px; text-align: right; font-family: var(--font-mono); }

        .mkt-spin-slow { animation: spin-slow 3s linear infinite; }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .mkt-tag-pulse { animation: tag-pulse 1.8s ease-in-out infinite; }
        @keyframes tag-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }

        .mkt-bounce { animation: mkt-bounce 2s ease-in-out infinite; }
        @keyframes mkt-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        .mkt-pulse-scale { animation: pulse-scale 1.8s ease-in-out infinite; }
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.25); }
        }
        .mkt-review-card { background: var(--ink); border-radius: 8px; padding: 10px 12px; }
        .mkt-review-stars { color: rgb(255, 0, 122); font-size: 11px; margin-bottom: 3px; }
        .mkt-review-title { font-size: 12.5px; font-weight: 600; color: var(--chalk); }
        .mkt-review-body { font-size: 11.5px; color: var(--muted); margin-top: 2px; }

        .mkt-priority-list { display: flex; flex-direction: column; gap: 8px; }
        .mkt-priority-row { display: flex; align-items: center; gap: 10px; background: var(--ink); border-radius: 8px; padding: 8px 12px; }
        .mkt-priority-row + .mkt-priority-row { margin-top: 8px; }
        .mkt-priority-tag { font-family: var(--font-mono); font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 999px; }
        .mkt-priority-title { font-size: 12.5px; font-weight: 600; color: var(--chalk); flex: 1; }
        .mkt-priority-meta { font-size: 10.5px; color: var(--muted); font-family: var(--font-mono); }

        .mkt-showcase { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 90px; }
        .mkt-showcase-visual {
          background: var(--ink); border-radius: 10px; padding: 20px;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; min-height: 120px;
        }

        .mkt-fullbleed {
          width: 100vw; position: relative; left: 50%; right: 50%;
          margin-left: -50vw; margin-right: -50vw; padding: 0 40px; box-sizing: border-box;
        }
        .mkt-grid-dark-wrap {
          background: #030B25; padding: 0 0 0 40px;
          position: relative; overflow: hidden;
        }
        .mkt-grid-dark-video {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; z-index: 0; transform: scaleX(-1); opacity: 0.5;
        }
        .mkt-grid-dark-inner {
          max-width: 1500px; margin-left: auto; margin-right: 0; overflow-x: auto;
          border-top: 1px solid rgba(255,255,255,0.5); border-bottom: 1px solid rgba(255,255,255,0.5);
          position: relative; z-index: 1;
        }
        .mkt-grid-dark-row {
          display: flex;
        }
        .mkt-grid-dark-title {
          flex: 0 0 600px; box-sizing: border-box;
          padding: 56px 40px 40px 0; display: flex; flex-direction: column; justify-content: center;
        }
        .mkt-grid-dark-spacer { flex: 0 0 auto; }
        .mkt-grid-dark-spacer-md { flex-basis: 300px; }
        .mkt-grid-dark-spacer-sm { flex-basis: 0px; }
        .mkt-grid-dark-cell {
          position: relative; overflow: hidden; flex: 0 0 300px; width: 300px; height: 250px;
          border-left: 1px solid rgba(255,255,255,0.5); box-sizing: border-box;
        }
        .mkt-grid-dark-row:not(:first-child) .mkt-grid-dark-cell { border-top: 1px solid rgba(255,255,255,0.5); }
        .mkt-grid-dark-fill {
          position: absolute; inset: 0; background: var(--cell-fill);
          background-size: cover; background-position: center;
          opacity: 0; transition: opacity 0.35s ease; z-index: 0;
        }
        .mkt-grid-dark-cell:hover .mkt-grid-dark-fill { opacity: 1; }
        .mkt-grid-dark-content { position: relative; z-index: 1; padding: 28px; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; }
        .mkt-grid-dark-headline {
          font-size: 17px; font-weight: 600; color: #FFFFFF; margin-bottom: 10px; transition: color 0.2s ease;
        }
        .mkt-grid-dark-desc {
          font-size: 14px; font-family: var(--font-body); color: rgba(255,255,255,0.5); line-height: 1.55;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
          transition: color 0.2s ease;
        }
        .mkt-grid-dark-cell:hover .mkt-grid-dark-desc { color: rgba(0,0,0,0.65); }
        .mkt-grid-dark-cell:hover .mkt-grid-dark-headline { color: #000000; }
        @media (max-width: 1000px) {
          .mkt-grid-dark-inner {
            display: grid; grid-template-columns: repeat(2, 1fr); max-width: 100%;
            border: none;
          }
          .mkt-grid-dark-row { display: contents; }
          .mkt-grid-dark-title { display: none; }
          .mkt-grid-dark-spacer { display: none; }
          .mkt-grid-dark-cell {
            flex: none; width: auto; height: 220px; border: 1px solid rgba(255,255,255,0.5);
          }
        }
        .mkt-carousel {
          display: flex; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory;
          padding-bottom: 8px; margin-bottom: 22px; scrollbar-width: none;
          cursor: grab;
        }
        .mkt-carousel::-webkit-scrollbar { display: none; }
        .mkt-carousel-dragging { cursor: grabbing; scroll-snap-type: none; user-select: none; }
        .mkt-carousel-dragging * { pointer-events: none; }
        .mkt-carousel-card {
          position: relative; overflow: hidden;
          flex: 0 0 calc((100% - 40px) / 5); max-width: 400px; height: 365px;
          scroll-snap-align: start;
          background: var(--ink-2); border: 1px solid var(--ink-3); border-radius: 16px;
          box-shadow: var(--shadow);
        }
        @media (max-width: 1400px) {
          .mkt-carousel-card { flex-basis: calc((100% - 30px) / 4); }
        }
        @media (max-width: 1100px) {
          .mkt-carousel-card { flex-basis: calc((100% - 20px) / 3); }
        }
        @media (max-width: 780px) {
          .mkt-carousel-card { flex-basis: calc((100% - 10px) / 2); height: 300px; }
        }
        @media (max-width: 520px) {
          .mkt-carousel-card { flex-basis: 85%; height: 280px; }
        }
        .mkt-carousel-fill {
          position: absolute; left: 0; right: 0; bottom: 0; height: 0;
          background: var(--fill-color); transition: height 0.4s ease; z-index: 0;
        }
        .mkt-carousel-card:hover .mkt-carousel-fill { height: 100%; }
        .mkt-carousel-content { position: relative; z-index: 1; display: flex; flex-direction: column; height: 100%; padding: 34px; }
        .mkt-carousel-icon {
          width: 36px; height: 36px; border-radius: 10px; margin-bottom: 26px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .mkt-carousel-headline {
          font-size: 19px; font-weight: 500; line-height: 1.35; color: var(--chalk);
          margin-bottom: 6px; transition: color 0.3s ease;
        }
        .mkt-carousel-card:hover .mkt-carousel-headline { color: #FFFFFF; }
        .mkt-carousel-footer {
          font-size: 15px; font-family: var(--font-body); color: var(--muted); transition: color 0.3s ease;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
          overflow: hidden; line-height: 1.45; min-height: 4.65em;
        }
        .mkt-carousel-card:hover .mkt-carousel-footer { color: #FFFFFF; opacity: 0.85; }

        .mkt-carousel-nav-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 90px; }
        .mkt-carousel-tagline { font-size: 15px; font-family: var(--font-body); color: var(--chalk); }
        .mkt-carousel-arrows { display: flex; gap: 8px; }
        .mkt-carousel-arrow {
          width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--ink-3);
          background: var(--ink-2); color: var(--chalk); display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: border-color 0.15s ease;
        }
        .mkt-carousel-arrow:hover { border-color: var(--brand); }

        .faq-eyebrow { font-size: 15px; font-family: var(--font-body); color: var(--muted); text-align: center; margin-bottom: 8px; }

        .mkt-pricing { margin-top: 150px; width: calc(100% + 150px); max-width: 1150px; margin-left: -75px; margin-right: -75px; }
        @media (max-width: 1100px) {
          .mkt-pricing { width: 100%; max-width: 100%; margin-left: 0; margin-right: 0; }
        }
        .mkt-pricing-header { margin-bottom: 48px; }
        .mkt-pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; align-items: start; }
        @media (max-width: 900px) { .mkt-pricing-grid { grid-template-columns: 1fr; } }
        .mkt-pricing-card {
          position: relative; background: var(--ink-2); border: 1px solid var(--ink-3); border-radius: 20px;
          padding: 32px; display: flex; flex-direction: column;
        }
        .mkt-pricing-card-highlighted { border: 2px solid var(--brand); box-shadow: 0 12px 32px color-mix(in srgb, var(--brand) 15%, transparent); }
        .mkt-pricing-badge {
          position: absolute; top: -16px; left: 50%; transform: translateX(-50%);
          background: var(--brand); color: #fff; font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
          padding: 6px 16px; border-radius: 999px; white-space: nowrap;
        }
        .mkt-pricing-tier {
          display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; color: var(--muted);
          background: var(--ink-3); padding: 5px 12px; border-radius: 999px; width: fit-content; margin-bottom: 20px;
        }
        .mkt-pricing-card-highlighted .mkt-pricing-tier { background: color-mix(in srgb, var(--brand) 15%, transparent); color: var(--brand); }
        .mkt-pricing-tier-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
        .mkt-pricing-tier-row .mkt-pricing-tier { margin-bottom: 0; }
        .mkt-billing-toggle { display: flex; gap: 2px; background: var(--ink-3); border-radius: 999px; padding: 3px; }
        .mkt-billing-toggle-btn {
          display: flex; align-items: center; gap: 6px; border: none; background: transparent;
          padding: 6px 12px; border-radius: 999px; font-size: 13px; font-family: var(--font-body); color: var(--muted); cursor: pointer;
        }
        .mkt-billing-toggle-btn-active { background: var(--ink-2); color: var(--chalk); font-weight: 600; }
        .mkt-billing-save { background: color-mix(in srgb, var(--teal) 18%, transparent); color: var(--teal); font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 999px; }
        .mkt-pricing-price-row { display: flex; align-items: baseline; gap: 4px; }
        .mkt-pricing-price { font-size: 34px; font-weight: 500; letter-spacing: -0.02em; color: var(--chalk); }
        .mkt-pricing-price-suffix { font-size: 15px; font-family: var(--font-body); color: var(--muted); }
        .mkt-pricing-note { font-size: 15px; font-family: var(--font-body); color: var(--muted); margin-top: 6px; margin-bottom: 20px; }
        .mkt-pricing-desc { font-size: 15px; font-family: var(--font-body); color: var(--muted); line-height: 1.6; min-height: 66px; }
        .mkt-pricing-divider { height: 1px; background: var(--ink-3); margin: 20px 0; }
        .mkt-pricing-features { display: flex; flex-direction: column; gap: 16px; flex: 1; margin-bottom: 28px; }
        .mkt-pricing-feature-row { display: flex; align-items: flex-start; gap: 10px; font-size: 15px; font-family: var(--font-body); line-height: 1.5; }
        .mkt-pricing-feature-row svg { flex-shrink: 0; margin-top: 2px; }
        .mkt-pricing-cta {
          border: none; border-radius: 999px; padding: 15px; font-size: 15px; font-family: var(--font-body); font-weight: 600; cursor: pointer;
          background: var(--ink-3); color: var(--chalk); width: 100%;
        }
        .mkt-pricing-cta-brand { background: var(--chalk); color: #fff; }
        .faq-list { max-width: 720px; margin: 0 auto 40px; border-top: 1px solid var(--ink-3); }
        .faq-row { border-bottom: 1px solid var(--ink-3); }
        .faq-q {
          width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 20px;
          background: none; border: none; cursor: pointer; padding: 26px 4px;
          font-size: 19px; font-weight: 500; color: var(--chalk); text-align: left;
        }
        .faq-toggle {
          width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: var(--ink-3); transition: background 0.2s ease, transform 0.3s ease;
        }
        .faq-toggle-open { background: rgb(255, 0, 122); transform: rotate(180deg); }
        .faq-a-wrap {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .faq-a-wrap-open { grid-template-rows: 1fr; }
        .faq-a-inner { overflow: hidden; }
        .faq-a {
          font-size: 15px; font-family: var(--font-body); color: var(--muted); line-height: 1.7; padding: 0 4px 26px; max-width: 560px;
          opacity: 0; transform: translateY(-6px);
          transition: opacity 0.3s ease 0.05s, transform 0.3s ease 0.05s;
        }
        .faq-a-wrap-open .faq-a { opacity: 1; transform: translateY(0); }
        .faq-support-btn {
          display: block; margin: 0 auto; background: rgb(255, 0, 122); color: #FFFFFF;
          font-weight: 600; font-size: 15px; padding: 13px 28px; border-radius: 999px; border: none; cursor: default;
        }

        .mkt-closing-cta {
          background: #000000; padding: 100px 40px; margin-top: 90px;
          display: flex; flex-direction: column; align-items: center; text-align: center;
        }
        .mkt-closing-logo { margin-bottom: 40px; }
        .mkt-closing-heading {
          font-family: var(--font-display); font-size: 44px; font-weight: 500; color: #FFFFFF;
          letter-spacing: -0.02em; line-height: 1.15; margin-bottom: 32px;
        }
        .mkt-closing-btn {
          background: rgb(255, 0, 122); color: #FFFFFF; font-weight: 600; font-size: 15px;
          padding: 14px 32px; border-radius: 999px; border: none; cursor: pointer;
        }
        @media (max-width: 600px) {
          .mkt-closing-heading { font-size: 30px; }
        }

        @media (max-width: 780px) {
          .mkt-grid-2, .mkt-showcase, .mkt-grid-4 { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Report preview */}
      <div>
        <div className="mkt-title-card">
          <div className="mkt-section-title" style={{ marginBottom: 8 }}>See the real report</div>
          <div className="mkt-section-sub" style={{ marginBottom: 0 }}>Your screenshots and reviews turn into one clear health report.</div>
        </div>
        <div className="mkt-browser-frame">
          <div className="mkt-browser-topbar">
            <div className="mkt-browser-dots">
              <span style={{ background: "#FF5F57" }} />
              <span style={{ background: "#FFBD2E" }} />
              <span style={{ background: "#28C840" }} />
            </div>
            <div className="mkt-browser-url">kickmyapps.com/report</div>
          </div>
          <div className="mkt-preview-card">
            <img src="/kma-console-preview.png" alt="Kick My Apps console" className="mkt-preview-full-img" />
          </div>
        </div>
      </div>

      {/* App Store data + Always fresh */}
      <div>
        <div className="mkt-section-title">Everything your reviews are telling you</div>
        <div className="mkt-section-sub">Screenshot analysis and real user reviews meet in the same report.</div>
        <div className="mkt-grid-2">
          <div className="mkt-halo mkt-halo-pink">
            <div className="mkt-feature-card mkt-feature-card-floating">
              <div className="mkt-feature-icon" style={{ background: "transparent", width: 99, height: 99 }}><AppStoreDataIcon size={99} /></div>
              <div className="mkt-feature-title">Real App Store data</div>
              <div className="mkt-feature-desc" style={{ marginBottom: 43 }}>Not guesswork — we analyze real, publicly available App Store reviews directly and honestly.</div>
              <div className="mkt-priority-row" style={{ justifyContent: "center", gap: 8 }}>
                <span className="mkt-live-dot" />
                <span style={{ fontSize: 12.5, color: "var(--muted)" }}>★★★★☆ · 1,240 reviews analyzed</span>
              </div>
              <div className="mkt-rating-dist">
                {[
                  { star: 5, pct: 62 },
                  { star: 4, pct: 21 },
                  { star: 3, pct: 9 },
                  { star: 2, pct: 5 },
                  { star: 1, pct: 3 },
                ].map((r) => (
                  <div className="mkt-rating-dist-row" key={r.star}>
                    <span className="mkt-rating-dist-label">{r.star}★</span>
                    <div className="mkt-rating-dist-bar">
                      <div className="mkt-rating-dist-fill" style={{ width: `${r.pct}%` }} />
                    </div>
                    <span className="mkt-rating-dist-pct">{r.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mkt-halo mkt-halo-mint">
            <div className="mkt-feature-card mkt-feature-card-floating">
              <div className="mkt-feature-icon" style={{ background: "transparent", width: 99, height: 99 }}><FreshIcon size={99} /></div>
              <div className="mkt-feature-title">Always fresh</div>
              <div className="mkt-feature-desc" style={{ marginBottom: 43 }}>No caching, ever — every single analysis pulls the freshest reviews straight from the source.</div>
              <div className="mkt-ticker">
                <div className="mkt-ticker-track">
                  {[...SAMPLE_REVIEWS, ...SAMPLE_REVIEWS].map((r, i) => (
                    <div className="mkt-review-card" key={i}>
                      <div className="mkt-review-stars">{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</div>
                      <div className="mkt-review-title">{r.title}</div>
                      <div className="mkt-review-body">{r.body} — {r.who}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 13 categories + Quick Wins + Weekly digest + Compare, merged */}
      <div>
        <div className="mkt-section-title">Deep, but never messy</div>
        <div className="mkt-section-sub">13 categories of findings, prioritized by impact, and tracked with weekly digests and competitor comparisons.</div>
        <div className="mkt-grid-4">
          <div className="mkt-feature-card">
            <div className="mkt-feature-icon" style={{ background: "transparent" }}><AppStoreDataIcon size={66} /></div>
            <div className="mkt-feature-title">13 categories, 4 lenses</div>
            <div className="mkt-feature-desc" style={{ marginBottom: 43 }}>From onboarding to accessibility, every finding maps to one of the UI / UX / Accessibility / Product lenses.</div>
            <div className="mkt-priority-list">
              <div className="mkt-priority-row"><span style={{ fontSize: 12.5, color: "var(--chalk)", fontWeight: 600 }}>UI</span><span style={{ fontSize: 11.5, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>2 critical · 1 warning</span></div>
              <div className="mkt-priority-row"><span style={{ fontSize: 12.5, color: "var(--chalk)", fontWeight: 600 }}>UX</span><span style={{ fontSize: 11.5, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>1 warning</span></div>
            </div>
          </div>
          <div className="mkt-feature-card">
            <div className="mkt-feature-icon" style={{ background: "transparent" }}><FreshIcon size={66} /></div>
            <div className="mkt-feature-title">Prioritized by impact</div>
            <div className="mkt-feature-desc" style={{ marginBottom: 43 }}>We tell you what to fix first by matching high impact with low implementation effort, so nothing important slips through.</div>
            <div className="mkt-priority-list">
              {PRIORITY_ITEMS.slice(0, 2).map((p) => (
                <div className="mkt-priority-row" key={p.tag}>
                  <span className={`mkt-priority-tag ${p.color === "var(--kick)" ? "mkt-tag-pulse" : ""}`} style={{ color: p.color, background: "var(--ink-3)" }}>{p.tag}</span>
                  <span className="mkt-priority-title">{p.title}</span>
                  <span className="mkt-priority-meta">{p.meta}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mkt-feature-card">
            <div className="mkt-feature-icon" style={{ background: "transparent" }}><AppStoreDataIcon size={66} /></div>
            <div className="mkt-feature-title">Weekly review digest</div>
            <div className="mkt-feature-desc" style={{ marginBottom: 43 }}>Get a summary of a tracked app's new reviews delivered to your inbox every week.</div>
            <div className="mkt-showcase-visual">
              <Mail size={22} color="var(--muted)" className="mkt-bounce" />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Every Monday, automatic</span>
            </div>
          </div>
          <div className="mkt-feature-card">
            <div className="mkt-feature-icon" style={{ background: "transparent" }}><FreshIcon size={66} /></div>
            <div className="mkt-feature-title">Compare with a competitor</div>
            <div className="mkt-feature-desc" style={{ marginBottom: 43 }}>Put your app side by side with a competitor — scores and findings, one screen.</div>
            <div className="mkt-showcase-visual" style={{ flexDirection: "row", gap: 24 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--teal)" }}>78</div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>You</div>
              </div>
              <GitCompare size={16} color="var(--muted)" className="mkt-pulse-scale" />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "var(--yellow)" }}>61</div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>Competitor</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* All features — dark grid */}
      <div className="mkt-fullbleed mkt-grid-dark-wrap">
        <video className="mkt-grid-dark-video" autoPlay loop muted playsInline>
          <source src="/dark-grid-bg.mp4" type="video/mp4" />
        </video>
        <div className="mkt-grid-dark-inner">
        <div className="mkt-grid-dark-row">
          <div className="mkt-grid-dark-title" />
          {ALL_FEATURES.slice(0, 3).map((f) => (
            <div className="mkt-grid-dark-cell" key={f.title} style={{ "--cell-fill": "#FDFF00" }}>
              <div className="mkt-grid-dark-fill" style={f.bgImage ? { backgroundImage: `url(${f.bgImage})` } : undefined} />
              <div className="mkt-grid-dark-content">
                <div className="mkt-grid-dark-headline">{f.title}</div>
                <div className="mkt-grid-dark-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mkt-grid-dark-row">
          <div className="mkt-grid-dark-spacer mkt-grid-dark-spacer-md" />
          {ALL_FEATURES.slice(3, 7).map((f) => (
            <div className="mkt-grid-dark-cell" key={f.title} style={{ "--cell-fill": "#FDFF00" }}>
              <div className="mkt-grid-dark-fill" style={f.bgImage ? { backgroundImage: `url(${f.bgImage})` } : undefined} />
              <div className="mkt-grid-dark-content">
                <div className="mkt-grid-dark-headline">{f.title}</div>
                <div className="mkt-grid-dark-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mkt-grid-dark-row">
          <div className="mkt-grid-dark-spacer mkt-grid-dark-spacer-sm" />
          {ALL_FEATURES.slice(7, 12).map((f) => (
            <div className="mkt-grid-dark-cell" key={f.title} style={{ "--cell-fill": "#FDFF00" }}>
              <div className="mkt-grid-dark-fill" style={f.bgImage ? { backgroundImage: `url(${f.bgImage})` } : undefined} />
              <div className="mkt-grid-dark-content">
                <div className="mkt-grid-dark-headline">{f.title}</div>
                <div className="mkt-grid-dark-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="mkt-pricing">
        <div className="mkt-pricing-header">
          <div className="mkt-section-title">Choose your plan</div>
          <div className="mkt-section-sub">Start free, upgrade when you need more. Cancel anytime.</div>
        </div>
        <div className="mkt-pricing-grid">
          {PRICING_PLANS.map((plan) => (
            <div key={plan.tier} className={`mkt-pricing-card ${plan.highlighted ? "mkt-pricing-card-highlighted" : ""}`}>
              {plan.highlighted && <div className="mkt-pricing-badge">MOST POPULAR</div>}
              <div className="mkt-pricing-tier-row">
                <div className="mkt-pricing-tier">{plan.tier}</div>
                {plan.highlighted && (
                  <div className="mkt-billing-toggle">
                    <button
                      className={`mkt-billing-toggle-btn ${billingCycle === "monthly" ? "mkt-billing-toggle-btn-active" : ""}`}
                      onClick={() => setBillingCycle("monthly")}
                    >
                      Monthly
                    </button>
                    <button
                      className={`mkt-billing-toggle-btn ${billingCycle === "annual" ? "mkt-billing-toggle-btn-active" : ""}`}
                      onClick={() => setBillingCycle("annual")}
                    >
                      Annual <span className="mkt-billing-save">SAVE 20%</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="mkt-pricing-price-row">
                <span className="mkt-pricing-price">
                  {plan.highlighted ? (billingCycle === "annual" ? plan.priceAnnual : plan.priceMonthly) : plan.price}
                </span>
                {plan.priceSuffix && <span className="mkt-pricing-price-suffix">{plan.priceSuffix}</span>}
              </div>
              <div className="mkt-pricing-note">
                {plan.highlighted ? (billingCycle === "annual" ? plan.priceAnnualNote : plan.priceMonthlyNote) : plan.priceNote}
              </div>
              <div className="mkt-pricing-desc">{plan.desc}</div>
              <div className="mkt-pricing-divider" />
              <div className="mkt-pricing-features">
                {plan.features.map((f, i) => (
                  <div className="mkt-pricing-feature-row" key={i}>
                    {f.included ? (
                      <CheckCircle2 size={16} color="var(--teal)" />
                    ) : (
                      <XCircle size={16} color="var(--ink-3)" />
                    )}
                    <span style={{ color: f.included ? "var(--chalk)" : "var(--muted)", fontWeight: f.bold ? 700 : 400 }}>{f.text}</span>
                  </div>
                ))}
              </div>
              <button className={`mkt-pricing-cta ${plan.highlighted ? "mkt-pricing-cta-brand" : ""}`}>{plan.cta}</button>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <div className="faq-eyebrow" style={{ marginTop: 150 }}>We're happy to answer your questions</div>
        <div className="mkt-section-title">Frequently asked questions</div>
        <div className="mkt-section-sub">&nbsp;</div>
        <div className="faq-list">
          {FAQ.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
        <button className="faq-support-btn">Support Page</button>
      </div>

      {/* Closing CTA */}
      <div className="mkt-fullbleed mkt-closing-cta">
        <div className="mkt-closing-logo"><FooterLogo size={140} /></div>
        <div className="mkt-closing-heading">Ready to see<br />what's hurting your app?</div>
        <button
          className="mkt-closing-btn"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          Get started
        </button>
      </div>
    </div>
  );
}
