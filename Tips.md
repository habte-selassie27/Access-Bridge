# Hackathon & Building Tips

Compiled from @BangDropID posts plus additional tips from multiple hackathon winners (MLH, JetBrains, Devpost, TensorHack, ETHGlobal).

================================================================================
PART 1 — Your provided tips, kept verbatim and grouped by similarity
================================================================================

## Choosing the Right Hackathon & Problem

hackathon tip: look for something the sponsor launched recently and build on it.
a project that shows off their newest feature is easy for them to showcase

- **Pick the ecosystem’s problem, not yours.** Every hackathon/protocol wants something that does not exist yet. Read their docs, Discord, and complaints. If your idea already has three competitors on the same chain, it’s a beauty contest—don’t enter beauty contests.
- **Sponsor tracks are the arbitrage.** Main prize fields are crowded; a sponsor bounty for one specific tool can be much smaller. The integration must be **load-bearing**—judges can tell when it was bolted on at 3 a.m.

## Reading the Rules, Rubric & Brief

- **The rubric is a spec sheet.** Keep it open the whole event. If presentation is worth 20 points, it’s worth as much as a fifth of your architecture. Optimize for the scorecard, not just impressiveness.
- **Read the rubric before the prize.** One event scored execution 10% vs originality 25%—the rubric tells you how to lose.
- **Optimize to the rubric weights.** If UX/presentation outweigh technical depth, stop over-optimizing the hard part; more than half the score is often “can a stranger use it?”
- **Read the brief for what it rules out.** Narrow briefs (e.g., “no standalone demo”, mandatory integration) signal what wins and thin the field.
- **Requirements that scare people off = better odds.** “Every submission must integrate X” filters most entrants.

## Odds, Prizes & Timing

- **Check registrants, not just prize size.** Most hackathon pages list how many people registered—look before deciding. It’s the single most useful number on the page. (e.g., `$15K / 102 registered` beats `$60K / 836`.)
- **Check how deep the prizes go, not how high.** Paying down to 4th/5th place improves your real odds; your odds of placing 4th are much better than winning, and nobody plans for 4th.
- **The prize is rarely just cash.** Adoption, routed users, API access, or official integration can outlast cash.
- **Speed/timing can matter** when criteria include time-to-submit; don’t treat the deadline as the target. (One bounty listed “time to submit” as a judging criterion—earlier scored better.)
- **hackathon tip:** keep every deadline you're chasing in one list. The wins that slip away are usually the ones you forgot to submit.
- **hackathon tip:** register early, even if you're not sure you'll build. You see the tracks, docs and sponsor announcements before everyone who joins in the last week.
- **Start the same day you find it.** Projects you postpone are often the ones you never finish.
- **Submit early, polish after.** Most platforms let you edit after submitting. Submit something working ~4 hours out—everyone hits the deadline at once and infrastructure won’t care about you.

## Scoping & Execution

- **Scope for the demo, not the roadmap.** A complete small thing beats an incomplete big thing every time. Get the core loop running end to end by the halfway mark, or cut a feature—then cut another one. Cut items go in the README as future work (vision); a broken demo reads as incompetence.
- **Write the demo script before you write code.** If you can’t explain the demo in 60 seconds, the scope is too big.
- **Build the happy path first and make it bulletproof.** Judges click the main flow; they rarely test edge cases.
- **Solo is underrated, but it costs.** You move at the speed of your own decisions, but you pitch worse and have nobody catching bugs. Budget explicit time for the pitch.

## Demo, Video & Judging Experience

hackathon tip: record your demo video early, then re-record at the end. a backup video saves you if the final build breaks

- **Make it touchable in ~90 seconds.** Judges are tired and often on a phone. Provide a deployed link, or a ~2-minute video where the first 15 seconds show the thing working—not your face, not slides. Record it at 8 p.m., not 4 a.m.
- **Judges give each project a few minutes.** The first 30 seconds of your demo video decide a lot—open with the problem and the working product. Not your logo, not your team intro.
- **hackathon tip:** open with the problem in one sentence. Judges need to know why it exists before how.

## Submission Quality (README & Testing)

- **The README carries half the score.** It’s what gets read when the demo link times out. Include: what it does (1 sentence), the problem (2), architecture, how each sponsor tool is used and **why**, deployed addresses, and what is honestly unfinished.
- **hackathon tip:** put a "how to test" section at the top of your README, with test accounts or faucet steps. A judge who can't run it can't score it.
- **Name your project like a product.** Short, easy to say, and hints at what it does (e.g., Tirai, Segel, Kutip, Turu). Judges discuss projects by name.
- **If the form asks “what’s still broken,” answer honestly/candidly.** Judges know nothing is finished; naming limitations reads as maturity.
- **Submitting something unfinished beats submitting nothing.**

## Strategy, Reuse & Compounding Wins

same project, two results: 5th at stellar hacks real-world zk and grand finalist at stellar apac. tukar = private cross-border payments settled with zk proofs.
lesson: a strong project can run twice in the same ecosystem. polish it, don't restart

- **Stop hopping chains/ecosystems every hackathon.** Building on the same stack twice compounds fast (e.g., Tirai → Talang on the same stack).
- **Every loss is a codebase.** Reuse mechanisms/repos from past events (even losses)—much of day-one velocity comes from prior work.
- **For financial apps, show an end-to-end on-ledger lifecycle** (e.g., margin calls, full flow) to build judge trust.
- **Community votes reward things people can picture using tomorrow.** (e.g., a “Stripe for…” with clear utility.)
- **A clear one-line belief makes the pitch.** e.g., “if AI reuses your work, the payment should follow the citation.”
- **Dev tools win when they remove a hated moment** (e.g., staring at a cryptic error that says nothing).
- **Boring tools win when the pain is real** (e.g., codemods that remove manual rewriting).
- **The hard part of real-world data onchain isn’t fetching it—it’s making it trustworthy.** Sign it, score it, then let the contract decide.
- **Most hackathon projects die after the deadline.** The ones still shipping a week later stand out to sponsors.
- **Real revenue beats a pretty demo when the rubric says business.** Show checkable traction/volume/AI-native ops, not promises.

## Learning from Feedback

- **Losing teaches more than placing when the feedback is specific.** A rejection with a number attached (e.g., lost by 0.017 on one metric) is worth more than a win without one—fix the measured gap (e.g., contrast, not judgment).

## Building & Engineering Tips

- **Keep the model out of money/verdict decisions.** Let the LLM propose/order/summarize; compute pass/fail or verdicts with **deterministic code** against real execution (tx/fork).
- **Prove by executing, not just inferring.** Fork mainnet (e.g., Anvil/Base) and run real probes/transactions to show behavior (honeypots, sells/reverts) instead of bytecode-only guesses.
- **Fuzz/test money logic before judges do.** Mirror pricing/auction logic and fuzz (e.g., 256 runs) to catch critical bugs.
- **Deterministic generation for safety-critical code.** Model text only in comments/string literals; validate numbers—models can be wrong but must not inject executable code.
- **Agent proposes, human disposes.** Present fixes/renames/skips as one-click suggestions; apply only on explicit human action.
- **Show misses, not just wins.** Publish honest failure cases/metrics to build trust (and explain why you ask before acting).
- **Validate with ground truth/external systems.** Derive expected values by hand and replay against the real system (e.g., Stripe test clocks); when they disagree, the system of record wins.
- **Turn disagreements into tests/rules.** Probe edge cases (API limits, rounding, empty inputs), fix, and leave a regression test.
- **Rounding/money math:** sum exact amounts, round once at the end (avoid per-item rounding drift).
- **Handle real API limits.** e.g., chunk requests when an API caps list sizes.
- **Keep the model out of security/spend authority.** Enforce mandates/caps in deterministic/isolated components (e.g., contract/enclave), not agent code alone.
- **Codemod/automation quality:** deterministic multi-pass transforms, validated on real repos, strong test coverage.

## Vibe-Coding Tips

- **Spec before prompt (3 points):** what to do, what to touch, what **not** to break. Vague prompt → vague code.
- **Level-up loop:** 1) spec before prompt, 2) make it write the test first, 3) one feature per session/fresh context, 4) read every diff (no blind accept), 5) if it fails twice the same way, your prompt is wrong (not the model)—reset context.
- **Tell it the boring option is allowed** (counter over-eagerness/bloat).
- **When debugging, give it the exact error/line/cause** instead of asking it to explain the bug (it may invent reasons).
- **Read what it wrote.** Understanding > feeling fast; use the agent to learn faster, not to avoid understanding.
- **Cut what the model reads** (compress noisy logs/tool output) to save context/tokens.

## Long Essay Verbatim — “What I Wish I Knew Before My First Hackathon”

What I Wish I Knew Before My First Hackathon

Nine wins, a lot more losses. The gap between those two piles is not talent and definitely not sleep. It is a few decisions made before I write any code.

1. Pick the ecosystem's problem, not yours

Every hackathon exists because a protocol wants something that does not exist yet. Read their docs, their Discord, their complaints. If your idea already has three competitors on the same chain, you are in a beauty contest. Do not enter beauty contests.

2. The rubric is a spec sheet

Most people skim the rules once. Keep them open the whole event. If presentation is worth 20 points, it is worth as much as a fifth of your architecture. I have beaten technically stronger projects because they optimized for impressiveness and I optimized for the scorecard.

3. Sponsor tracks are the arbitrage

Main prize: 200 submissions. Sponsor bounty for one specific tool: eleven, and four barely integrated it. But the integration has to be load bearing. Judges can tell when an oracle call was bolted on at 3am.

4. Scope for the demo, not the roadmap

A complete small thing beats an incomplete big thing every time. Core loop running end to end by the halfway mark, or cut a feature. Then cut another one. Whatever you cut goes in the README as future work, which reads as vision. A broken demo reads as incompetence.

5. Make it touchable in ninety seconds

Judges are tired and often on a phone. A deployed link, or a two minute video where the first fifteen seconds show the thing working. Not your face. Not slides. Record it at 8pm, not 4am.

6. Name it like a product

Short real words. Tirai. Segel. Kutip. Turu. A judge deliberating between six projects remembers a name and forgets CrossChainYieldAggregatorV2. A name that carries a concept forces you to have a concept.

7. The README carries half the score

It is what gets read when the demo link times out. What it does in one sentence, the problem in two, the architecture, how each sponsor tool is used and why, deployed addresses, and what is honestly unfinished. Naming your own limitations reads as maturity.

8. Solo is underrated, but it costs

You move at the speed of your own decisions. You also pitch worse and have nobody catching your bugs. Budget explicit time for the pitch instead of assuming it happens.

9. Submit early, polish after

Most platforms let you edit after submitting. Submit something working four hours out. Everyone hits the deadline at once and the infrastructure does not care about you.

10. Every loss is a codebase

1st place at the portaldot mini hackathon, builder tools track. the project turns cryptic transaction failures into clear diagnoses.
lesson: dev tools win when they remove the moment every builder hates: staring at an error that says nothing

hackathon tip: put a "how to test" section at the top of your README, with test accounts or faucet steps.
a judge who can't run it can't score it

hackathon tip: look for something the sponsor launched recently and build on it.
a project that shows off their newest feature is easy for them to showcase

most hackathon pages list how many people have registered
it's right there, usually near the top, and almost nobody looks at it before deciding
it's the single most useful number on the page

losing teaches more than placing when the feedback is specific
i lost one by 0.017 on a single metric. ordering was already perfect, so the fix wasn't judgement, it was contrast
a rejection with a number attached is worth more than a win without one

pdk, the portaldot dev kit: 14 commands for the local dev workflow, plus faillens, which turns cryptic substrate runtime errors into actionable diagnoses.
1st place in the builder tools track

An auction mechanism from one hackathon became the OTC desk in another. Half my day one velocity comes from repos I wrote for events I lost.

None of this requires being the best engineer in the room. I have never been the best engineer in the room. I have frequently been the person who read the judging criteria.

hackathon tip: keep every deadline you're chasing in one list.
the wins that slip away are usually the ones you forgot to submit

3rd at the kite ai global hackathon (encode club) with kutip, a research agent that pays the sources it cites.
lesson: a clear one-line belief makes the pitch. mine was: if ai reuses your work, the payment should follow the citation

3rd at hackcanton s2 with tirai, a confidential otc desk on canton. one season later i came back to the same stack with talang and took 1st in the grofty wallet & onboarding track, plus best in track for financial applications.
lesson: stop hopping chains every hackathon. building on the same stack twice compounds fast

hackathon tip: name your project like a product. short, easy to say, and hints at what it does.
judges discuss projects by name

hackathon tip: register early, even if you're not sure you'll build.
you see the tracks, docs and sponsor announcements before everyone who joins in the last week

how to level up your vibe coding:

1. spec before prompt
2. make it write the test first
3. one feature per session, fresh context
4. read every diff, no blind accept
5. if it fails twice the same way, your prompt is wrong, not the model

vibes are a starting point, not a workflow

kaspay was a "stripe for kaspa" payment gateway with merchant dashboards and webhooks. it won community choice at kaspathon 2026.
community votes reward things people can picture using tomorrow

3rd at telegraph hackathon s1 with amanat: signed weather data a smart contract can act on by itself.
lesson: the hard part of real-world data onchain isn't fetching it. it's making it trustworthy. sign it, score it, then let the contract decide

most hackathon projects die after the deadline. the ones still shipping a week later stand out to sponsors

judges give each project a few minutes. the first 30 seconds of your demo video decide a lot.
open with the problem and the working product. not your logo, not your team intro

================================================================================
PART 2 — New Tips from Multiple Hackathon Winners (web research)
================================================================================

## Source: Major League Hacking (MLH)

These tips are drawn from MLH’s judging plan, rules, and winner guidance. MLH is one of the largest student hackathon leagues.

- **Judging weight:** MLH judges weigh four criteria roughly evenly—technical difficulty, originality/creativity, adherence to theme, and practical implementation. Understand the rubric before you build so you build with purpose, not hope.
- **Minimum presentable product, not MVP:** You do not need a minimum viable product; you need a minimum *presentable* product. If console errors flash but the live demo looks fine, you are doing it right.
- **Demo, don’t pitch:** Judges do not score pitch quality or idea quality. Show the thing. If broken or unfinished, still present what you tried and what you learned.
- **Open with the problem:** Present the problem, what you built, a live demo working, then where it goes next. Every sentence must earn its place because judging slots are only a few minutes.
- **Decide who says what:** On a team, assign pitch roles before standing in front of a judge. Solo builders rehearse out loud at least once.
- **Finish one thing:** Ship-blocking mistakes are usually about scope, not skill—building three features instead of finishing one is a common losing pattern.
- **Submit early:** Submit ~4 hours before the deadline. Everyone hits the deadline at once; infrastructure will not care about you.
- **Work backwards:** Working backwards from submission day (T-30: pick event/read rubric; T-0: build/deploy/submit) is the highest-leverage move.
- **Team size:** Most winning teams are 2–4 people. Include one strong communicator; non-technical roles are welcome and often decisive.

## Source: JetBrains “Notes From the Judging Table”

Based on judges watching teams build and pitch at a JetBrains x Codex hackathon.

- **Leading with the problem wins:** Every judge said start with the problem you are solving. Make judges share your frustration.
- **Demo is the whole pitch:** A strong project with a confusing demo loses to a simpler project judges understand. Shipping a good demo matters more than clean architecture nobody sees.
- **One “oh, this is possible now” moment:** One clear flow beats a tour of every feature. Show what used to be frustrating vs. the new version; make the contrast obvious.
- **Put the judge in the user’s shoes:** Walk them through what using it actually looks like, even if not fully polished.
- **Mock everything you can:** Pre-fill data, mock slow API calls, remove every place the demo could stall.
- **Rehearse like you already won:** Visualize the winning demo and build toward it. Time it; every second must earn its place.
- **Familiar tools & teammates:** Limit unknowns—do not stack a new framework, new teammate, and new problem domain all at once.
- **Enthusiasm convinces:** A team clearly enjoying its project beats a team grinding through a script. Have fun. Build.

## Source: Devpost Winner Guidance

From Devpost’s “From idea to prototype” winner series and user stories (including Nathan, a 22-time hackathon winner).

- **Set clear goals:** Write down goals and expectations; allocate time for building, networking, workshops, and fun.
- **Prototype mindset:** Treat the product as a prototype. Focus on 2–3 must-have features that demonstrate viability, not a full app.
- **Prepare boilerplates:** Create small starter templates for core technology functions so you can start coding without setup issues.
- **Customer-centric + teamwork:** Start with a clear objective and customer insights; delegate by team strengths so everyone does what they do best.
- **Early submission wins:** Consider submitting early so you do not race the clock in the final hour.
- **Demo video backup:** Prepare a backup video in case the live build breaks. Spend ~60% of video time explaining and ~40% demoing; keep voice clear and not too fast.
- **Dedicate 15% to polishing:** Reserve at least 15% of the hackathon timeframe for polishing the submission.

## Source: TensorHack Winner Data (1,328 winning projects)

Data-driven patterns from actual winning projects on Devpost, ETHGlobal, and Devfolio.

- **Public code repo:** 81% of winning projects link public code; 81% link a demo video; 67% have both. Keep a public repo with a clear README from hour one.
- **Common team size:** 4 people is most common (34%); 26% won solo.
- **Top themes:** AI (58%), Web3 (22%), Fintech (9%), Social good (6%), Dev tools (6%).
- **Multiple prizes:** 13% of winners took more than one prize or track award.
- **Treat common winner traits as the floor:** Then read the event’s own rules, which always come first.

## Source: ETHGlobal Event Details

From ETHGlobal New York, Trifecta, New Delhi, Agentic Ethereum, Prague, Cannes, Scaling Ethereum.

- **7-minute judging:** Finalist teams present 4 minutes demo + 3 minutes Q&A. Prepare for common questions: what inspired it, what tools and why, what challenges and how.
- **Demo video length:** 2–4 minutes; under 2 or over 4 may be auto-rejected. Use slides sparingly (max 4 bullet points per slide).
- **Code history matters:** Large single commits or missing histories may be disqualified; show progress throughout the hackathon.
- **Document pre-existing work:** Continuity submissions must clearly document prior work and include new features built during the event.
- **Top 20% advance:** In async events, only ~20% advance to live judging; but partner prizes often go to projects that did not advance.

## Source: Cloudinary / Hall of Hacks / Others

Additional winner insights from various developer advocates and judges.

- **Work backwards from the demo:** Know exactly what you need to show; build that first, add features only if time remains.
- **Sponsor integration must be load-bearing:** If going for a sponsor track prize, focus on deep integration of their product, not a bolted-on API call.
- **Do the opposite of the obvious:** When everyone solves a problem one way, the winning move is often to flip it.
- **Pick an idea people understand in one sentence:** If a judge cannot repeat your idea to the next judge, it loses.
- **Scope it tiny and finish:** A small finished project beats an ambitious unfinished one.
- **Spend the last hours on the demo:** You win on the two-minute demo, not the codebase. Have a clean story: problem → working moment → result.
- **Be original / take it to the edge:** Do not go for the obvious product everyone will make.
- **Make decisions fast:** Lead the team to make decisions; avoid hour-long debates over minor UI choices.
- **Professional presentation matters:** Sometimes projects that were not fully delivered succeeded because the presentation was strong.
- **If you fail, don’t stop:** Participation and learning matter more than a single placement.

================================================================================
END
================================================================================



deadline radar, next 2 weeks:

pixels to prognosis: ₹35,000, closes nov 27
health hackathon 3.0: ₹200,000, closes nov 30
midnight buildathon: $5,000, closes nov 30
qie hackathon 3.0: $17,000, closes nov 30
gemma 4 agent competition (kaggle): $75,000, closes dec 2, accept rules by nov 25

full breakdowns drop at night. bookmark and pick one
local problems make strong projects. judges remember specific stories
hackathon tip: build in public during the hackathon. sponsors notice the builders who post progress
hackathon myth: ai-built projects can't win.

reality: judges score the product and the thinking, not the keystrokes
hackathon tip: pick a problem you can explain to a non-technical friend. judges come from different backgrounds
hackathon myth: reusing your own code is cheating.

reality: it depends on the rules. read them and disclose
fuzz testing catches the bugs you didn't think to test. use it on anything that moves value
hackathon tip: commit often with clear messages. some judges look at the repo history
hackathon myth: track prizes are consolation prizes.

reality: they're often the best odds in the hackathon
hackathon tip: one clear diagram of your architecture beats three paragraphs explaining it
a small project that fully works beats a big one that half works.

cut features until everything in your demo runs live
hackathon myth: judges don't care about design.

reality: a clean ui makes your project easier to understand
hackathon tip: keep the demo video under the time limit, with room to spare. some platforms cut it off
hackathon myth: a web3 project needs a token.

reality: most good projects don't need one
hackathon tip: pick a problem you can explain to a non-technical friend. judges come from different backgrounds
hackathon myth: judges don't care about design.

reality: a clean ui makes your project easier to understand
sponsor tracks are product research for the sponsor. build what they wish existed
hackathon tip: name the sponsor tech you used in the first lines of your submission. make the judges' checklist easy

hackathon tip: leave the last 6 hours for polish, docs and the video. not for new features
hackathon myth: losing means your project was bad.

reality: sometimes it just wasn't what that sponsor needed
hackathon tip: check if past winners are public. what won last time tells you what judges value "
