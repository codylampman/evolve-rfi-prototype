# Evolve owner RFI: case study prototype

A working redesign of Evolve's owner Request for Information flow, built to get more qualified owners through it without lowering lead quality. Built by Cody Lampman for the Senior Product Designer, Growth case study.

- **Live prototype:** https://codylampman.github.io/evolve-rfi-prototype/
- **Video walkthrough:** VIDEO_URL
- **Compare versions:** use the **Feature flags** panel (on the right on a computer, behind the Flags button on a phone). "Control" recreates today's flow, "Proposed" turns every change on, and each flag switches one change on its own.
  - Today's flow: `https://codylampman.github.io/evolve-rfi-prototype/?preset=control`
  - Proposed: `https://codylampman.github.io/evolve-rfi-prototype/`
  - One change at a time, e.g. `https://codylampman.github.io/evolve-rfi-prototype/?flags=backButton,whyCopy`

Estimates in the prototype are demo numbers. Nothing is sent anywhere; events print to the console and the event log in the Flags panel.

## Designed for the phone

The brief notes that many owners open the RFI on a mobile device, and they arrive from search and social ads, which skew heavily to phones. The two steps that lose the most owners, address and contact, are also the two typing steps, and typing is hardest on a phone keyboard. So this is designed phone first.

On a computer, the prototype shows in a phone frame, with notes on the left and the feature flags and event log on the right. For the real experience, open it on your phone (there's a QR code on the page).

## What I think is causing the drop-off

I walked the live flow on my phone (single property, multiple properties, and the branches for owners who already rent, use a manager, or rent unfurnished).

**First, a bug.** Tapping a past answer to edit it makes the screen flash to loading placeholders, the progress bar jumps backward, and the page scrolls on its own for a few seconds. I saw it every time on iPhone (Arc). It may be browser-specific, but it lands right before the contact step, so it's the first thing I'd check in session data.

**Contact step (35% drop-off).** The flow builds toward an answer and never gives one. An early step promises owners can earn up to 18% more, owners answer seven questions, the headline says "let's see if we're a fit," and then the reward is a request for their phone number and consent to calls and texts. Nothing says why the phone is needed or what happens next.

**Address step (30% drop-off).** It comes early, before any trust is built, and doesn't say why it's needed. Autocomplete already exists, so this is a trust problem more than a typing problem. The field accepts a ZIP, but most people will read it as asking for their home address.

The reasons already exist inside the company. The brief explains why each field is needed ("to look up the property and estimate its revenue potential," "so sales can follow up"). The flow just doesn't share them with owners.

What's already working, and kept: every step carries a reason to trust Evolve, the reassurance adapts to the owner's answers, and the eligibility questions (property type, unfurnished stay type) filter out owners Evolve can't serve.

## The changes

| Flag | Change | Plan |
|---|---|---|
| `backButton` | Visible back button instead of the hidden swipe-down; progress never jumps backward | Just do it |
| `whyCopy` | Say why we ask, using Evolve's own reasons, on the address and contact fields | Test 1 |
| `contactRework` | A short "what happens next" above the fields, one full-name field, and a plain button ("Connect with our team") | Test 2 |
| `estimateScreen` | Ask for ZIP early, then show an honest earnings range before contact, and collect the street address there ("for a sharper estimate") | Test 3 |
| `requirePhone` | Phone required (default). An open question for sales | Config |

Smaller details: the bedroom counter starts at 1, every field opens the right mobile keyboard and supports autofill, and phone numbers are accepted in any format.

The estimate screen adds one step. That's deliberate: it's friction that gives owners something back, and it's where the street address now lives, after owners have a reason to share it.

## How I prioritized

Three gates first:
1. **Just do it:** bugs and obvious usability fixes ship without a test.
2. **Money metric:** every test is judged on qualified leads reaching sales, not clicks.
3. **Trust:** nothing that wins by misleading owners. The estimate only passes as an honest range with its basis stated.

Then each idea scored 1 to 3 on Evidence (how strong is the research), Impact (how many owners, how close to a signed owner) and Feasibility (how fast to build and to a clear result):

| Idea | Evidence | Impact | Feasibility | Plan |
|---|---|---|---|---|
| Edit bug, back button | | | | Just do it |
| Say why we ask | 3 | 3 | 3 | Test 1 |
| Contact step rework | 3 | 3 | 3 | Test 2 |
| ZIP first + estimate | 2 | 3 | 1 | Test 3 (needs real estimate data) |

The prototype shows the destination. The test plan shows the order: one change per test, so we know what moved the number.

## Expected lift and how I'd validate it

Today about one in three owners who start the RFI finish. If the two problem steps lose 30% and 35%, every other step together keeps about 73% of owners.

| Step | Today | Expected | Why |
|---|---|---|---|
| Address / ZIP | 30% drop | 20 to 25% | A ZIP is less personal than a home address, and the reason is stated |
| New estimate screen | none | 5 to 12% drop | It adds a step and the street address moves here |
| Contact | 35% drop | 25 to 32% | The phone ask is explained, next steps are clear, and the reward is visible |

Combined, completion moves from about 33% to somewhere between flat and 42%, with my best guess around 38% (about 15% more completed RFIs). The wide range is honest: the estimate screen could cancel out the other gains, which is exactly why it's tested last and on its own.

**How I'd test each change**
- 50/50 split, one change per test, run at least a full week and no more than a month.
- **Primary metric:** RFI completion (started to submitted).
- **Guardrails for lead quality:** sales contact rate, sales-accepted leads, and the share of invalid phone numbers. Signed owners are watched, but they're too rare to read quickly.
- **Sample size:** at a 33% baseline, detecting a 10% relative lift takes about 3,200 owners per version (95% confidence, 80% power); a 20% lift takes about 820. If Evolve's monthly RFI starts can't support that, I'd combine the copy changes into one test or move the test higher in the funnel.

**If a test doesn't win**
- *Say why we ask:* try the reason as a short line above the field instead of below it, or test only the phone line.
- *Contact rework:* test the pieces separately, starting with "what happens next," which I'd expect to carry most of the effect.
- *Estimate:* try a market-level range without the street address, or show the estimate after contact as the reward for finishing.

## Assumptions (questions I sent; judgment calls until answered)
- Evolve can show an estimated range before the sales call, clearly labelled with its basis.
- Sales needs a phone number from every owner, so it stays required and is explained. The flag makes it easy to test as optional.
- Sales needs the street address before a lead is created, so it's collected on the estimate screen, before contact.
- "Something else" (tents, houseboats, campers) and annual leases aren't a fit, matching today's flow.
- Only the single-property path is rebuilt. The multiple-property path shares the same contact step, so those changes carry over.

## Running it locally

```bash
npm install
npm run dev
```

Built with Vite, React and TypeScript. Deploys to GitHub Pages on every push to `main`.

## How this was built

Designed and built with Claude (research, planning, prototyping and code) in the same loop. Details in the video.
