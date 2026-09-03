# School ERP — Commercial Roadmap

**Product:** TechAppDev School ERP
**Last updated:** September 2026
**Status:** Pricing model recommended, pending final decision

---

## 1. Market pricing reality

Compiled from published vendor pricing, July–September 2026. The Indian school ERP market splits into two pricing models, and the split matters enormously.

### Flat band pricing (budget segment)

| Vendor | Annual price | Notes |
|---|---|---|
| EduGradUP | ₹9,000 – ₹23,000 | All 43 modules in every plan, no per-student metering, free data migration from Excel. WhatsApp billed separately at ₹1,000 per 4,000 messages. |
| Campus 365 | ₹71,988 (₹5,999/mo billed annually) | Flat |
| Fedena | ₹40,000+ | Tiered, with per-student fees that grow with the school, features gated behind higher tiers |

### Per-student pricing (mid/enterprise segment)

| Vendor | Rate | At 2,200 students |
|---|---|---|
| Typical published example | ₹150/student/year | ₹3,30,000 |
| Range across market | ₹100–500/student/year | ₹2.2L – ₹11L |
| Entab (CampusCare) | Unpublished, enterprise quote | — |

### What this means

At the pilot school's size (2,200 students), a flat-band competitor delivers a comparable module list for **₹23,000–₹72,000**. A per-student competitor charges **₹3.3 lakh**.

The original plan of ₹50/student would put TechAppDev at **₹1,10,000** — cheaper than per-student incumbents, but **1.5× Campus 365 and nearly 5× EduGradUP**. That is a difficult position to defend on a price comparison.

---

## 2. Why per-student pricing is the wrong model here

Per-student pricing fails at both ends of the customer range:

- **Large schools:** the model makes you expensive exactly where the revenue is. A 2,200-student school pays ₹1.1L against a ₹23K alternative. Large schools are also the most likely to shop around and compare quotes.
- **Small schools:** a 300-student school pays ₹15,000/year, while consuming nearly the same onboarding effort — data migration, configuration, on-site training. Margin disappears.

There is a third problem: per-student pricing penalises a school for growing. It creates an annual renegotiation and a reason to churn.

This is why the entire budget segment of the Indian market uses band-based flat pricing.

---

## 3. Recommended pricing model

### 3.1 Subscription — annual, band-based, all modules included

| Student strength | Annual subscription |
|---|---|
| Up to 500 | ₹24,000 |
| 501 – 1,200 | ₹42,000 |
| 1,201 – 2,500 | ₹66,000 |
| 2,501 – 5,000 | ₹90,000 |
| 5,000+ | Custom |

All prices exclusive of 18% GST.

**Every band includes every module.** Do not gate features by tier — that is the Fedena complaint that budget-segment competitors are actively marketing against.

**Pilot school lands at ₹66,000/year.**

Positioning: below Campus 365's ₹72,000, above EduGradUP's ₹23,000. The gap above EduGradUP is justified by on-site service, not by features.

### 3.2 Onboarding fee — one time

| Student strength | Onboarding |
|---|---|
| Up to 500 | ₹12,000 |
| 501 – 1,200 | ₹18,000 |
| 1,201 – 2,500 | ₹25,000 |
| 2,500+ | Quoted |

Covers: data migration from Excel/registers, school configuration, fee structure setup, report card template matching, user account creation, and **on-site staff training**.

**Note the competitive pressure:** EduGradUP offers free data migration. The onboarding fee must therefore be sold as on-site setup and training, not as migration. Migration alone cannot be charged for when a competitor gives it away.

The earlier figure of ₹10,000 was too low. For 2,200 students migrating off manual registers, onboarding is 3–4 weeks of work including cleanup rounds and on-site training. ₹10,000 would price that at roughly ₹2,500 per week.

### 3.3 Pass-through costs — billed separately, at cost

| Service | Basis |
|---|---|
| SMS | Per message, MSG91 rates |
| WhatsApp | Per conversation, BSP rates (industry standard is around ₹1,000 per 4,000 messages) |
| Payment gateway | Razorpay transaction fees, borne by school or parent per school's choice |
| GPS tracking | Per vehicle per month, vendor rate |
| Biometric hardware | School procures directly; integration included |

**Never fold these into the subscription.** At 2,200 students, attendance alerts plus fee reminders can run 50,000+ messages a year — ₹8,000–15,000 depending on channel mix. Absorbed into a ₹66,000 subscription, that is over 15% of revenue before hosting costs.

### 3.4 Other commercial terms

- **Multi-year discount:** 10% for two years paid upfront
- **Multi-branch:** 20% discount on additional campuses under the same trust
- **Founding customer pricing:** offer a time-limited discount to the first 3 schools in exchange for a written reference and a site visit for prospects — but never discount the list price permanently
- **Custom development:** anything outside the product roadmap is scoped and quoted separately
- **Included in subscription:** hosting, backups, standard updates, support within stated terms

---

## 4. Positioning

### The honest competitive picture

TechAppDev cannot win on feature count. EduGradUP markets 43 modules and 110+ capabilities. Fedena has 50+ modules and a 15-year track record. Entab has 1,200+ schools.

**The differentiator is service delivery, not software.**

The pilot school runs on manual registers. Fifty-plus teachers have never used school software. What they need is not a ticket portal — it is someone who comes to the school, sits with the staff, and trains them in Hindi. Remote SaaS vendors structurally cannot deliver this at these price points.

### Positioning statement

> A modern School Operating System, set up and taught in person. One secure cloud platform, simple daily operations, and a local team that comes to your school.

### Sales messaging priorities

1. **On-site onboarding and training** — the primary differentiator
2. **Hindi interface and Hindi support** — critical for Tier 2/3 schools
3. **Direct WhatsApp support with a named contact** — not a ticket queue
4. **All modules included, no feature gating** — directly counters Fedena
5. **Owner's remote dashboard** — the feature that closes management, demo it first

### What not to lead with

Do not lead with a module list or a feature comparison table. That is a fight against vendors with more modules and more years. Lead with the transition: how a school on registers gets to a working system without chaos.

---

## 5. Unit economics

### Per school, at the 1,201–2,500 band

| Line | Year 1 | Year 2+ |
|---|---|---|
| Subscription | ₹66,000 | ₹66,000 |
| Onboarding | ₹25,000 | — |
| **Gross revenue** | **₹91,000** | **₹66,000** |
| Hosting and infrastructure share | ~₹6,000 | ~₹6,000 |
| Support and account time | ~₹10,000 | ~₹8,000 |
| **Contribution** | **~₹75,000** | **~₹52,000** |

Pass-through services are revenue-neutral and excluded.

### Portfolio view

| Schools | Annual recurring revenue |
|---|---|
| 1 (pilot) | ₹66,000 |
| 5 | ~₹2.5L |
| 10 | ~₹5L |
| 25 | ~₹12L |
| 50 | ~₹25L |

Assumes a mix across bands averaging ₹50,000. Onboarding fees add on top in the year a school joins.

**The implication is important:** this business becomes meaningful at 25+ schools, not at 5. The build effort (~8 months) only pays back across a portfolio. Plan the sales motion accordingly, and do not let the product build consume the year without parallel pipeline work.

---

## 6. Go-to-market

### 6.1 The paid ads plan — a caution

Meta and Google ads are a poor first channel for this product:

- School ERP is a high-consideration B2B purchase. Sales cycles run 2–6 months and typically involve a committee, a demo, and references.
- At a plausible ₹1,000–2,000 per qualified lead and a 3–5% lead-to-close rate, CAC lands around **₹25,000–60,000 per school** — most or all of year one revenue.
- Competitors advertise at ₹9,000. Winning a click-level price comparison against that is not realistic.
- Purchasing is seasonal: schools buy January–April, ahead of the academic year. Ads outside that window mostly burn budget.

Ads become viable later, once there is a referenceable customer base, a self-serve trial, and proven conversion economics — likely after `P5`.

### 6.2 Channels that actually work in this segment, in priority order

**1. Pilot reference and word of mouth**
Inter college networks in Purvanchal are tight. Principals talk to principals. One visibly successful deployment at Shri Hansraj is worth more than any ad spend. Formalise it: a case study, a site visit offer for prospects, and a referral incentive.

**2. Existing pipeline**
Already-interested schools are the cheapest customers available. Qualify them now: student strength, current system, decision maker, budget, and timeline. Confirm which are *committed* versus merely *interested* — this distinction determines the entire build and revenue plan.

**3. Direct outreach with on-site demo**
These schools do not buy online. District-level outreach, an in-person demo on the principal's own data, and a local presence close deals here.

**4. Board and association channels**
School management associations, principal networks, and district education bodies give access to many schools per conversation.

**5. Paid ads — later**
Revisit after 10+ referenceable schools and a self-serve trial exist.

### 6.3 Seasonality

| Period | Activity |
|---|---|
| Sep – Dec | Build, pilot go-live, case study preparation |
| **Jan – Apr** | **Peak selling season** — new academic year onboarding |
| May – Jun | Onboarding and data migration for schools that signed |
| Jul – Aug | Support, product development, next-cycle pipeline building |

The pilot going live before January is what makes the January–April selling window usable.

---

## 7. Revenue targets

| Milestone | Target | Timing |
|---|---|---|
| Pilot live and paid | 1 school, ₹91,000 | Dec 2026 |
| Pipeline converted | 3–5 schools | Apr 2027 |
| First full selling season | 8–12 schools, ~₹5L ARR | Jun 2027 |
| Second season | 25+ schools, ~₹12L ARR | Jun 2028 |

---

## 8. Open commercial decisions

| Question | Needed by |
|---|---|
| Confirm band-based flat pricing vs per-student | Before the pilot proposal is sent |
| Pipeline schools: student counts, and committed vs interested | Before finalising bands |
| Payment schedule tied to phases | Before the contract is signed |
| Support SLA by band | Before the pilot proposal is sent |
| Whether payment gateway fees are borne by school or parent | During pilot configuration |
| Founding-customer discount: amount and how many schools | Before approaching pipeline |
