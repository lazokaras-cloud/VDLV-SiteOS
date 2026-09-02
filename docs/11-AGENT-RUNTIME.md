# The agent runtime

There are **two** agent runtimes and they are not the same system. Do not build
one and adapt it. Do not let code leak between them.

| | Back office | Site app |
| --- | --- | --- |
| Where it runs | Vercel | On the handset |
| Model | Chosen per task via AI Gateway | Gemma, quantised, local |
| Network | Server side | **None** |
| Job | Long-running work, approvals, integrations | Hearing a person, filling a form |
| Failure if it is wrong | A workflow stalls, a human notices | A foreman is told the wrong thing on site |

The rule in `AGENTS.md` §1 governs both: **no model output becomes a number a
user relies on.** Everything below assumes it.

---

## 1. The boundary, stated once

An agent may **read** anything it is authorised to read, **draft** anything, and
**propose** any action. It may not decide a number, and it may not commit a
consequence on its own.

```
model  ->  intent, fields, phrasing, a draft
rules  ->  every date, quantity, rate, percentage and rand amount
person ->  approval, where the domain says a person approves
```

A concrete example, because this is the part that gets fudged. A site agent
says, in Afrikaans, that the slab was poured late because of rain.

- The model extracts: event = delay, cause = weather, date = yesterday.
- The app **reads those fields back** and the person confirms them.
- `packages/rules` computes the notice deadline from the contract edition, the
  calendar and the event date.
- The app shows the deadline with its basis: which clause, which edition.

The model never saw the deadline. It could not have got it wrong.

---

## 2. Back office: hosted agents on Vercel

Built on Vercel's agent stack. Use these rather than rolling your own, and read
the current docs before you start, because this surface moves quickly.

| Product | What we use it for |
| --- | --- |
| **AI SDK** | The agent loop, tool calls, structured output |
| **AI Gateway** | One endpoint and one credential for every model. Switching model is a string change, so no provider name is hard-coded in a feature. |
| **Workflow SDK** | Durable execution. Checkpoints each step, retries what fails, **pauses to wait on a person**. |
| **Sandbox** | Anywhere an agent runs code or parses an untrusted file |
| **Connect** | Scoped short-lived tokens to external systems, with an audit trail from user to agent to service |

### 2.1 Why Workflow SDK is the right shape for this domain

Because our processes already are durable workflows, and they are measured in
weeks.

A claim cycle opens, waits for a PQS valuation, waits for a certificate, waits
for the client to pay, and only then releases a subcontractor payment. That is
not a request. It is a state machine that must survive deploys, restarts and a
month of waiting, and it has a human approval in the middle of it.

That maps onto Workflow SDK's checkpoint-and-pause model exactly. **A pause
waiting on a director's approval is a first-class state, not a cron job that
polls a table.**

Every workflow that touches money has a human step. From `03-RULES.md`:

- Subcontractor payment: a director approves. Always.
- Advance payment: a director signs, and only a director.
- Exceeding an advance payment limit: a director motivates by email to the
  profit share partners.

Model these as workflow pauses with a named approver role, never as a
notification the agent sends and then proceeds past.

### 2.2 Connect, and why the audit trail matters here

`04-ARCHITECTURE.md` §10 says every commercial decision records who, when and on
what basis, and that this is the product rather than compliance theatre.

An agent acting on a person's behalf is exactly where that guarantee usually
breaks: the log says "system" and the trail ends. Connect ties every outbound
call to the user the agent acted for. Use it for anything reaching the
estimating package, the accounting package, or a bank. Do not mint long-lived
credentials for an agent.

### 2.3 What the back office agents actually do

Start with these four. They are chosen because each one is a real, named cost in
`03-RULES.md`, not because they demo well.

1. **The clock watcher.** Derives every live deadline from events and the
   contract edition, and surfaces what is about to lapse. Pure rules engine
   under an agent's presentation. The highest-value thing in the product.
2. **The claim assembler.** Drafts the monthly claim from the cost report
   including accruals, flags cost with no matching claim line. Drafts. A person
   submits.
3. **The order classifier.** Any purchase not on a bulk order must resolve to a
   variation, a contra charge or a P&G item. The agent proposes which; an order
   that fits none is raised as an error rather than absorbed.
4. **The document reader.** Delivery notes, invoices, site instructions arriving
   as photographs. Extracts fields, never totals. Parse untrusted files in
   Sandbox.

---

## 3. Site app: Gemma on the handset

### 3.1 Why on-device, given a cloud model would be better

Three reasons, in order of how much they matter.

1. **Signal.** Sites are basements, steel frames and farms outside Bela-Bela.
   A feature that works in the yard and fails on the third floor is worse than
   no feature, because people stop trusting the whole app.
2. **Cost.** Per-token cost against a foreman who talks all day is a variable
   cost on a fixed-price contract.
3. **Confidentiality.** Rates and programme are commercially sensitive. Not
   leaving the handset is the strongest possible answer to a client asking where
   their data goes.

### 3.2 What to run

- **Model:** a Gemma release intended for on-device use, quantised to 4-bit.
  Confirm the current small Gemma variant and its licence before pinning one;
  do not assume the version named in a conversation is still current.
- **Runtime:** Google's on-device LLM inference stack (MediaPipe) or a
  `llama.cpp` binding, wrapped as one Expo native module. It is a native module,
  so it does not ship in an over-the-air update.
- **Budget:** target under 2 GB resident. Test on a mid-range Android handset
  that costs about R4000, not on an iPhone Pro. That is what is actually on site.
- **First run:** the model is **downloaded on first launch over wifi**, not
  bundled. Store limits make bundling impractical, and a 2 GB download over a
  site connection is not acceptable. Until it has downloaded, the app works
  fully with typing instead of speech. The model is an enhancement to input, and
  nothing in the critical path may depend on it.

### 3.3 What it is allowed to do

Allowed:

- Speech to text, English and Afrikaans, including the Gauteng site register in
  `07-GLOSSARY.md`.
- Text to fields, against a zod schema from `packages/domain`.
- Classifying an intent: which flow does this belong to.
- Phrasing a computed answer as a sentence.

Not allowed, ever:

- Producing a date, a working-day count, a quantity, a rate, a percentage or a
  rand amount.
- Deciding whether a gate is satisfied.
- Deciding what a contract says.

Enforce this in the type system. The on-device implementation of the
`packages/ai` interface returns fields and text. It has no path to a number,
because the interface does not have one.

### 3.4 Read-back is not optional

Whatever the model extracts is shown to the person before anything is computed
from it. On a phone, in their language, in one screen.

This is the single control that makes a small model safe. A wrong field the
person corrects in two seconds is a non-event. The same wrong field, silent,
becomes a claim someone loses in four months.

---

## 4. Offline and sync

The site app is offline first, per `04-ARCHITECTURE.md` §4. Two rules the agent
work adds on top:

1. **The rules engine runs on the handset**, so a deadline computed offline is
   the same deadline the server computes. That is the whole reason
   `packages/rules` is pure and dependency free. Same input, same answer, no
   network.
2. **Every sync carries the rules version the handset used.** When they differ,
   the server's answer stands and the difference is surfaced rather than
   silently overwritten. A changed answer is a finding.

---

## 5. What not to build

- **No agent that writes to the accounting or estimating package.** Read-only,
  one direction, per `04-ARCHITECTURE.md` §8. Writing back is a red change under
  `09-GUARDRAILS.md`.
- **No agent that approves anything.** Where the domain says a director
  approves, a director approves.
- **No cloud fallback in the site app.** If the local model is unavailable, fall
  back to typing, not to a network call.
- **No agent that edits `packages/rules`.** The rules engine changes by pull
  request, with a fixture, reviewed by a person.

---

## 6. Open questions

These need answers before the relevant workstream starts. Add to
`OPEN-QUESTIONS.md` as they are resolved.

- **Q-07.** Which Gemma variant, at which quantisation, and does its licence
  permit shipping inside a commercial app on both stores?
- **Q-08.** Does the on-device runtime support both platforms well enough to
  ship one native module, or does iOS need a different backend?
- **Q-09.** Speech in Afrikaans on a small local model: does it work well enough
  on real site audio, or is voice English-only in version one with Afrikaans by
  typing? Test with the real voice notes in `docs/knowledge` before committing.
- **Q-10.** Where does the handset's model download come from, and who pays for
  the bandwidth?
