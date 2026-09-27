// Real copy for every item under the Header's Features / Use Cases / Resources dropdowns.
// Each entry: slug, title, pill (eyebrow), subtitle, and 3 body sections (heading + body).

export const FEATURES_PAGES = {
  "screenshot-analysis": {
    title: "Screenshot Analysis",
    pill: "Analysis",
    subtitle: "Upload your app's screens and get a categorized, evidence-based read on what's working and what isn't.",
    sections: [
      {
        heading: "13 categories, 4 lenses",
        body: "Every screen is checked against 13 categories — from color contrast and touch target size to onboarding length and empty states — and each finding is filed under a UI, UX, Accessibility, or Product lens, so you can see at a glance whether an issue is cosmetic or structural.",
      },
      {
        heading: "Grounded in what's on screen",
        body: "Findings only reference categories your screenshots can actually support. If you upload three screens, you won't get a made-up claim about a fourth — the analysis stays honest about what it did and didn't see.",
      },
      {
        heading: "From finding to fix",
        body: "Each finding comes with a concrete suggestion, and where it's genuinely code-related, a short starter snippet in CSS, Swift, or Kotlin — so the fix is a starting point your team can act on, not just a critique.",
      },
    ],
  },
  "aso-store-listing-review": {
    title: "ASO / Store Listing Review",
    pill: "Analysis",
    subtitle: "See your store listing the way a shopper does: title, description, and category, checked for clarity and keyword coverage.",
    sections: [
      {
        heading: "Title and description, read for clarity",
        body: "We pull your live listing and review whether the title is legible and keyword-rich without reading as spam, and whether the description front-loads the value proposition before it front-loads a feature list.",
      },
      {
        heading: "Concrete, not generic",
        body: "Suggestions reference your actual copy — a sentence that's too long, a benefit that's buried past the fold — instead of generic best-practice reminders you'd get from any checklist.",
      },
      {
        heading: "Paired with real reviews",
        body: "When we can also pull your App Store reviews, ASO suggestions are cross-checked against what users are actually confused about, so a listing fix can address a real, recurring point of friction.",
      },
    ],
  },
  "update-risk-check": {
    title: "Update Risk Check",
    pill: "Analysis",
    subtitle: "A read on what could flag your app at the next store review — not a guess, a check against what's visibly on screen.",
    sections: [
      {
        heading: "Your app is already live — this isn't a first-approval check",
        body: "Apple and Google re-review apps on every update, and can flag or remove an app that's already published. This check frames risks as things that could cause an issue at your next update or a random audit, not a first-submission gate.",
      },
      {
        heading: "Evidence-based flags only",
        body: "We only raise a risk when there's something concrete to point to — placeholder text left in a screen, a broken-looking or half-finished feature, an exaggerated claim in your description. No risk is invented without visible proof.",
      },
      {
        heading: "Severity, not just a list",
        body: "Each risk is marked high or medium against the relevant guideline category (like Completeness or Misleading Content), so you can decide what to fix before the next release and what can wait.",
      },
    ],
  },
  "visual-annotation": {
    title: "Visual Annotation",
    pill: "Analysis",
    subtitle: "Every finding that comes from a screenshot is marked on that screenshot, so you never have to guess where the issue is.",
    sections: [
      {
        heading: "See it, don't just read it",
        body: "Instead of a text-only list of issues, findings with a visual basis are pinned to their approximate location on the screen they came from — the low-contrast button, the missing empty state, the crowded nav bar.",
      },
      {
        heading: "Built for handing off",
        body: "A marked-up screenshot is easier to hand to a designer or engineer than a paragraph description — it removes the back-and-forth of 'which button do you mean?'",
      },
      {
        heading: "Confidence, not guesswork",
        body: "If we can't estimate a finding's position on screen with reasonable confidence, we leave it unmarked rather than pin it somewhere arbitrary — an annotation you see is one we're actually confident about.",
      },
    ],
  },
  "real-app-store-reviews": {
    title: "Real App Store Reviews",
    pill: "Insights",
    subtitle: "Every review we analyze is a real, public review pulled directly from the App Store — nothing synthetic, nothing sampled from a model's imagination.",
    sections: [
      {
        heading: "Straight from the source",
        body: "We pull your app's most recent public reviews directly from Apple's own review feed at analysis time, so the complaints and praise you see reflect what real users are saying right now, not a stale snapshot.",
      },
      {
        heading: "Summarized without losing the signal",
        body: "Instead of reading through hundreds of reviews yourself, you get the top recurring complaints with an estimated share of mentions, so you know which issue is affecting 30% of your reviewers and which is a one-off.",
      },
      {
        heading: "Reviews inform every other lens",
        body: "Review content doesn't just sit in its own panel — it feeds into the Product-lens findings too, so a complaint about a confusing checkout flow can surface as a concrete conversion-risk finding elsewhere in your report.",
      },
    ],
  },
  "quick-wins": {
    title: "Quick Wins",
    pill: "Insights",
    subtitle: "The findings worth doing first: high impact on your users, low effort for your team.",
    sections: [
      {
        heading: "Impact and effort, side by side",
        body: "Every finding is scored on both how much it likely affects users and how much work it takes to fix, so you can sort your backlog by real leverage instead of by whatever's loudest in the report.",
      },
      {
        heading: "A starting list, not a full roadmap",
        body: "Quick Wins pulls out the small handful of findings that score high on impact and low on effort — the changes you could plausibly ship this week, not a restructuring of your whole app.",
      },
      {
        heading: "Where to point a new team member",
        body: "If you're onboarding a designer or engineer and want to hand them something with real, well-scoped impact, this is the shortest path from report to shipped fix.",
      },
    ],
  },
  "code-level-suggestions": {
    title: "Code-Level Suggestions",
    pill: "Insights",
    subtitle: "Findings that can genuinely be illustrated with code get a short, ready-to-adapt snippet — not just a description of the problem.",
    sections: [
      {
        heading: "A starting point, not your actual code",
        body: "We don't have access to your codebase, so every snippet is a generic, illustrative example — a contrast fix in CSS, a touch-target adjustment in Swift or Kotlin — meant as a 'try an approach like this,' not a drop-in patch.",
      },
      {
        heading: "Only where code actually helps",
        body: "Not every finding gets a snippet. An onboarding-flow issue doesn't need one; a spacing or contrast issue often does. We only attach code where it genuinely clarifies the fix.",
      },
      {
        heading: "Speaks the platform's language",
        body: "Snippets are written in the language that matches the finding — CSS for a web or hybrid view, Swift for iOS-native issues, Kotlin for Android-native — so your engineer isn't translating before they can even evaluate it.",
      },
    ],
  },
  "history-trend": {
    title: "History & Trend",
    pill: "Insights",
    subtitle: "Every scan is saved, so you can watch your health score move release over release instead of judging each report in isolation.",
    sections: [
      {
        heading: "A timeline, not a snapshot",
        body: "Your Console keeps every past analysis for an app, plotted over time, so a single bad score reads in context — is this a new problem, or the same one from three releases ago that never got fixed?",
      },
      {
        heading: "See what a fix actually did",
        body: "After you ship a change, run a new scan and watch the specific category that was flagged — if the contrast score moved and the onboarding score didn't, you know exactly which fix landed and which didn't.",
      },
      {
        heading: "One place for every app you track",
        body: "The Dashboard rolls every tracked app's latest score and scan count into one view, so a portfolio of apps doesn't mean a portfolio of separate reports to remember.",
      },
    ],
  },
  "detailed-comparison": {
    title: "Detailed Comparison",
    pill: "Collaboration",
    subtitle: "Put two reports side by side — your app against a competitor, or your app against its own last release.",
    sections: [
      {
        heading: "Lens by lens, finding by finding",
        body: "Comparisons break down by UI, UX, Accessibility, and Product lens so you can see exactly where you're ahead and where a competitor is beating you, not just an aggregate score gap.",
      },
      {
        heading: "Reviews compared too",
        body: "When both apps have review data, their top complaints and ratings sit side by side — useful for spotting a complaint your competitor has solved and you haven't, or vice versa.",
      },
      {
        heading: "Works on any two scans",
        body: "Compare a competitor's app against yours, or your own app's current scan against last quarter's, to see whether a redesign actually moved the numbers.",
      },
    ],
  },
  "my-apps-dashboard": {
    title: "My Apps Dashboard",
    pill: "Collaboration",
    subtitle: "Every app you've analyzed, its latest health score, and how many times you've checked in on it — in one screen.",
    sections: [
      {
        heading: "A portfolio view, not a report pile",
        body: "Instead of hunting through a list of individual reports, the Dashboard shows one card per app with its current score and last-checked date, so you can tell at a glance which app needs attention.",
      },
      {
        heading: "Jump straight into a new analysis",
        body: "Search for any app or upload a fresh set of screenshots right from the Dashboard — no need to navigate elsewhere to start your next check.",
      },
      {
        heading: "Built for tracking more than one app",
        body: "If you manage several apps — your own portfolio, or a set of client apps — this is the one screen that keeps them all visible without digging through separate report histories.",
      },
    ],
  },
  "weekly-email-digest": {
    title: "Weekly Email Digest",
    pill: "Collaboration",
    subtitle: "A short email each week with a summary of your app's new reviews — no need to check in manually.",
    sections: [
      {
        heading: "New reviews, summarized",
        body: "Subscribe an app and you'll get a weekly email with your most recent reviews, average rating, and the most-voted negative review — a fast read on sentiment without opening the App Store yourself.",
      },
      {
        heading: "A link back to the full picture",
        body: "Every digest links back to your full analysis, so a concerning trend in the email is one click from the detailed findings behind it.",
      },
      {
        heading: "One subscription per app",
        body: "Subscribe from any report page — it takes an email address and an app, and you can unsubscribe at any time.",
      },
    ],
  },
  "pdf-export": {
    title: "PDF Export",
    pill: "Collaboration",
    subtitle: "Turn any report into a shareable PDF — for a stakeholder update, a client deliverable, or your own records.",
    sections: [
      {
        heading: "The full report, portable",
        body: "One click generates a PDF of your complete analysis — health score, findings, quick wins, and review summary — formatted to read well outside the app.",
      },
      {
        heading: "For people who don't have an account",
        body: "Not everyone you need to share a report with needs Console access. A PDF is the fastest way to get a finding in front of a stakeholder, client, or teammate who just needs the summary.",
      },
      {
        heading: "A record you can keep",
        body: "Even though every scan lives in your history, a downloaded PDF is useful as an offline snapshot — dated proof of where things stood before a release.",
      },
    ],
  },
};

export const USE_CASES_PAGES = {
  "product-managers": {
    title: "Product Managers",
    pill: "Who it's for",
    subtitle: "Turn scattered app store feedback into a prioritized, defensible roadmap.",
    sections: [
      {
        heading: "Prioritize by evidence, not the loudest voice in the room",
        body: "Every finding is scored by impact and effort, and every review-based claim traces back to real, public feedback — so when you tell your team what to build next, you're pointing at evidence instead of a hunch.",
      },
      {
        heading: "Track whether a release actually moved the needle",
        body: "Run a scan before and after a release and compare the two — if the category you targeted improved and sentiment shifted, you have a clean before/after story for your next planning meeting.",
      },
      {
        heading: "Benchmark against the competition",
        body: "Use Detailed Comparison to see exactly where a competitor's app is ahead of yours, lens by lens — useful ammunition when you're arguing for a roadmap item that needs cross-team buy-in.",
      },
    ],
  },
  "indie-developers": {
    title: "Indie Developers",
    pill: "Who it's for",
    subtitle: "You're the whole team — get a second pair of eyes without hiring one.",
    sections: [
      {
        heading: "Catch what you've gone blind to",
        body: "When you've built and stared at every screen yourself, it's easy to miss a contrast issue or a confusing flow that a new user hits immediately. A fresh, structured pass catches what familiarity hides.",
      },
      {
        heading: "Fix what's actually worth fixing first",
        body: "Quick Wins surfaces the small number of findings that are both high-impact and low-effort — a realistic list for someone shipping solo, not a 40-item backlog you'll never clear.",
      },
      {
        heading: "Know what real reviewers are saying",
        body: "You don't have time to read every App Store review yourself. Real App Store Reviews summarizes the recurring complaints so you know what's actually costing you ratings.",
      },
    ],
  },
  designers: {
    title: "Designers",
    pill: "Who it's for",
    subtitle: "Spot UI and UX issues fast, with findings marked directly on the screens you designed.",
    sections: [
      {
        heading: "A structured critique, on demand",
        body: "Instead of waiting for a stakeholder review to catch a spacing inconsistency or an unclear hierarchy, run your screens through a 13-category check any time you want a second opinion.",
      },
      {
        heading: "See exactly where, not just what",
        body: "Visual Annotation marks each finding's approximate location on the actual screenshot, so a critique reads like markup on your file, not a disconnected list you have to interpret.",
      },
      {
        heading: "A consistency check across your whole flow",
        body: "The Consistency category compares spacing, button styles, and component reuse across multiple screens at once — useful for catching drift in a design system before it ships.",
      },
    ],
  },
};

export const RESOURCES_PAGES = {
  guides: {
    title: "Guides",
    pill: "Learn",
    subtitle: "Practical playbooks for improving your App Store presence and in-app experience.",
    sections: [
      {
        heading: "Written from what we see across real reports",
        body: "Our guides are grounded in the same categories your analysis uses — contrast, onboarding, ASO, review response — written as practical playbooks rather than abstract best practices.",
      },
      {
        heading: "Start where your report points",
        body: "If your latest scan flagged onboarding length or color contrast, there's a guide that goes deeper on exactly that category, with more context than a single finding can carry.",
      },
      {
        heading: "More on the way",
        body: "We're building out this library alongside the product. If there's a topic you'd want a guide on, the Contact page is the fastest way to tell us.",
      },
    ],
  },
  blog: {
    title: "Blog",
    pill: "Learn",
    subtitle: "Product updates, behind-the-scenes notes, and what we're learning about app quality at scale.",
    sections: [
      {
        heading: "What shipped, and why",
        body: "When we ship a new feature or category, the blog is where we explain the reasoning — what problem it solves and how to get the most out of it.",
      },
      {
        heading: "Patterns across apps",
        body: "Analyzing a large number of apps surfaces patterns worth sharing — common onboarding mistakes, recurring ASO issues, what separates a 4-star app from a 5-star one.",
      },
      {
        heading: "Check back for new posts",
        body: "This is a young product and a young blog — new posts are on the way as we learn more from the reports running through the system.",
      },
    ],
  },
  "customer-stories": {
    title: "Customer Stories",
    pill: "Learn",
    subtitle: "How teams are using Kick My Apps to find and fix what's holding their app back.",
    sections: [
      {
        heading: "Real teams, real findings",
        body: "We're collecting stories from early teams about specific findings that led to a fix and a measurable change — a contrast fix that reduced drop-off, an ASO tweak that improved conversion.",
      },
      {
        heading: "Different teams, different uses",
        body: "From solo indie developers to product teams comparing themselves against competitors, the same report structure ends up used in different ways — this page is where we'll show that range.",
      },
      {
        heading: "Want to share yours?",
        body: "If Kick My Apps helped you find something worth fixing, we'd like to hear about it — reach out through the Contact page.",
      },
    ],
  },
  "help-center": {
    title: "Help Center",
    pill: "Support",
    subtitle: "Answers to the questions we hear most, in one place.",
    sections: [
      {
        heading: "Start with the FAQ",
        body: "Most questions about how analysis works, what data we use, and what's included in each plan are answered on our FAQ page — the fastest first stop before reaching out directly.",
      },
      {
        heading: "Account and billing",
        body: "For anything specific to your account, sign-in, or billing, the Account page in your Console has direct actions for most common needs, including exporting or deleting your data.",
      },
      {
        heading: "Still stuck?",
        body: "If you can't find what you're looking for, Contact reaches our team directly — we read every message.",
      },
    ],
  },
  "product-updates": {
    title: "Product Updates",
    pill: "Support",
    subtitle: "What's new, what changed, and what shipped recently.",
    sections: [
      {
        heading: "A running log",
        body: "As we ship new categories, fix analysis quality, or add new ways to view your reports, this is where we'll note what changed and why it matters for your existing reports.",
      },
      {
        heading: "Built from real feedback",
        body: "Most of what ships here comes directly from questions and requests we hear through Contact — if something's missing that you need, that's the fastest way to influence what's next.",
      },
      {
        heading: "Check back periodically",
        body: "We're early and shipping frequently. This page will fill in as more updates go out.",
      },
    ],
  },
};

export const ALL_MARKETING_PAGES = {
  features: FEATURES_PAGES,
  "use-cases": USE_CASES_PAGES,
  resources: RESOURCES_PAGES,
};
