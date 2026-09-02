# Architecture

Chosen for a small team, a Vercel deployment, and a rules engine that must run
on a phone with no signal.

## 0. Three surfaces, not two

The product is one system with three delivery surfaces. They share the domain
and the rules engine; they share nothing else.

| Surface | Who | What it is |
| --- | --- | --- |
| **Back office** | Contracts managers, directors, QS, finance | A website. Laptop first, and it must work properly on a phone browser, because a contracts manager approves payments from a bakkie. |
| **Site** | Foremen, site agents, subcontractor supervisors | A real Android and iOS app, downloaded from the stores. Not a web app. |
| **Agent runtime** | Both of the above | Two of them. Hosted agents on Vercel for the back office, and a small model running **on the handset** for the site app. See `docs/11-AGENT-RUNTIME.md`. |

The prototype in `src/` shows what the first two feel like. `src/plumbline.html`
is the site app, `src/office.html` is the back office. They are mockups, not
architecture: read them for interaction, flow order and tone, never for
structure. Where a prototype and this document disagree, this document wins.

**Why the site app is native and the back office is not.** The site app needs
the camera, background sync, push, and a local model, and it must work for a
whole day in a basement with no signal. The back office needs a dense table on a
wide screen and nothing else. Forcing either into the other's shape produces two
bad products.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js, App Router, TypeScript strict | Vercel-native, Server Components keep the client small |
| Mobile | React Native via Expo, EAS Build for the stores | Shares `packages/rules` verbatim. See D-11. |
| On-device model | Gemma, quantised, running locally on the handset | The site app never calls a cloud model. See §7 and `11-AGENT-RUNTIME.md`. |
| Hosted agents | Vercel AI SDK, AI Gateway, Workflow SDK, Sandbox, Connect | See `11-AGENT-RUNTIME.md` |
| Styling | Tailwind + CSS custom properties for the palette | Theme is token-driven, see §6 |
| Database | Postgres (Neon or Supabase) | Relational, because this domain is relational |
| ORM | Drizzle | SQL you can read, migrations you can review |
| Auth | Auth.js, email link plus WebAuthn | Site users will not remember passwords |
| Offline | IndexedDB via Dexie, outbox pattern | See §4 |
| Tests | Vitest, Playwright for the flows | |
| i18n | `next-intl` | English and Afrikaans, see §5 |

## 1. Monorepo layout

```
apps/
  office/            Next.js on Vercel. The back office website.
  site-mobile/       Expo / React Native. Ships to the App Store and Play Store.
  agents/            Next.js routes and Workflow definitions. The hosted agents.
packages/
  rules/             THE RULES ENGINE. Pure. Zero dependencies. Runs everywhere.
  domain/            Types and zod schemas shared by everything
  db/                Drizzle schema, migrations, queries
  ai/                Model interfaces. Two implementations, hosted and on-device.
  ui/                Shared design tokens. Components are NOT shared across
                     web and native; only the tokens are.
  i18n/              Message catalogues
  whatsapp-channel/  The build channel. Not part of the product.
fixtures/            Golden data, see docs/06-ACCEPTANCE.md
docs/
```

Three apps because the surfaces have nothing in common: one is a one-handed
conversation on a handset, one is a dense console, one has no interface at all.
They share `packages/*`, never layouts.

**`packages/ui` is tokens, not components.** A React DOM button and a React
Native button cannot be the same component, and pretending otherwise produces an
abstraction that fits neither. Share the palette, the spacing scale, the type
scale and the copy. Write the components twice.

## 2. `packages/rules`: the one that matters

```
packages/rules/src/
  calendar.ts      working days, public holidays, shutdowns
  editions.ts      the edition table and the project-type lookup
  clocks.ts        deriveClocks(): every countdown in the product
  variation.ts     pricing, markup, substantiation gates
  payment.ts       certificates, retention, contra, sub payment terms
  preliminaries.ts time/value/fixed, monthly rate, EOT recovery
  boq.ts           bill reconciliation, provisional sums, rate build-up
  controlpoints.ts the 48-point spine
  operating.ts     company operating rules, rules §9
  index.ts
```

Non-negotiable properties:

- **No dependencies.** Not date-fns, not lodash. If you need date arithmetic,
  write it; it is thirty lines and it must be exactly right.
- **No I/O and no ambient clock.** `asAt: ISODate` is always a parameter. This is
  what makes "as at month end" reporting free and what makes tests deterministic.
- **Pure functions over plain data.** No classes, no state.
- **100% branch coverage as a merge gate.**
- **Every constant cites its source** in a comment.

```ts
// JBCC PBA May 2018, cl. 26.10: the principal agent issues the final account
// within 60 working days of practical completion. Note 2007 and 2014 are 90.
export const FINAL_ACCOUNT_WD: Record<ContractEdition, WorkingDays> = { ... };
```

Because it is pure and dependency-free it runs unchanged in a Server Component,
in the browser for optimistic UI, in a worker, and later inside React Native.
That portability is the reason for the constraint.

## 3. Data flow

```
site app ──(outbox)──> /api/sync ──> Postgres ──> office console
    │                                    │
    └── rules (local, optimistic)        └── rules (authoritative)
```

The same functions run on both sides. The client computes optimistically so the
UI never waits; the server recomputes on write and is authoritative. They cannot
disagree, because it is the same code over the same inputs.

**Events are append-only.** `ContractEvent` rows are never updated or deleted.
Clocks are derived on read. This gives correct history for free: "what did we
know on the 25th" is a query, not a migration.

## 4. Offline

Outbox pattern:

1. Every mutation writes to IndexedDB and enqueues an intent.
2. The UI reflects it immediately, computed by the local rules engine.
3. A sync worker drains the queue when there is a connection.
4. The server validates, applies, and returns authoritative state.
5. Conflicts: last-writer-wins on scalar fields, **append for events**, and a
   human decides on anything commercial. Never silently discard a site write.

Evidence (photographs) uploads separately with resumable chunks and is immutable
once captured. A photograph that can be edited afterwards is worth nothing in a
dispute.

Flows are state machines persisted step by step, so a dropped call or a flat
battery resumes where it left off.

## 5. Language

- All strings via `next-intl`. No bare strings in components. Ever.
- Afrikaans is **site register**: technical nouns stay English (notice, claim,
  contra, markup, VO, PA, SI, plant, snag), everyday words are Afrikaans,
  contractions throughout. See `docs/07-GLOSSARY.md`.
- Document references are identifiers, not prose: `SI-114` stays `SI-114` in both
  languages.
- Number formatting is `en-ZA` in both: `R1 234 567`, spaces not commas.

## 6. Theme

Palette lives as CSS custom properties in `packages/ui/tokens.css`. The pilot's
brand is black `#0c0c0c`, yellow `#ffcb05`, grey `#f1f1f1`, Source Sans Pro.

**One trap, already hit once:** yellow fills well and is illegible as text on
white, about 1.9:1. Fills and text use separate tokens: `--signal` for fills,
`--signal-txt` which darkens to `#7a5e00` in light mode. Do not collapse them.

Light and dark both required, defined token-level on `:root`, with
`@media (prefers-color-scheme: dark)` guarded as `:root:not([data-theme="light"])`
and `:root[data-theme="dark"]` for the explicit toggle.

## 7. Models, where they appear at all

Behind an interface in `packages/ai`, never called directly from a component.

```ts
interface SpeechToFields {
  transcribe(audio: Blob, lang: "en" | "af"): Promise<string>;
  extract(text: string, schema: ZodSchema): Promise<Partial<T>>;
}
```

Two callers only:

- **Voice capture.** Speech to text, then text to fields. The fields are read
  back to the user and confirmed before anything is computed from them.
- **Phrasing.** Turning a computed answer into a sentence, or a loosely worded
  question into an intent.

**There are two implementations of this interface, and which one you get depends
on the surface.**

| Surface | Implementation | Network |
| --- | --- | --- |
| Site app | Gemma, quantised, running on the handset | **None. Ever.** |
| Back office | Vercel AI Gateway, model chosen per task | Server side only |

The site app does not call a cloud model. Not as a fallback, not when the signal
happens to be good. A foreman in a basement and a foreman on the pavement get
identical behaviour, because behaviour that changes with signal is behaviour
nobody trusts.

The on-device model is small, so it is **worse** at everything than a hosted one.
That does not relax the rule in `AGENTS.md` §1, it makes it load-bearing. A 2B
model asked for a working-day count will answer confidently and wrongly. It is
allowed to hear speech, fill fields, classify an intent and phrase a sentence.
Every number in what it produces comes from `packages/rules`.

Detail, including model choice, the runtime, size budget and what happens on
first run, is in `docs/11-AGENT-RUNTIME.md`.

## 8. Integrations

Read-only, one direction, for now.

- **Estimating package (Candy):** import a priced bill. Parse the printed export
  into `Bill` and `BillItem`. Never write back in version one.
- **Accounting package (BuildSmart):** import the cost report; produce the
  contract request form as an export.

We are the layer between them, not a replacement for either. Any proposal to
replace either is out of scope.

## 9. Deployment

Vercel, from one repo. Four projects, because they have different release
cadences and different blast radii.

| Project | Source | Notes |
| --- | --- | --- |
| **Demo** | `src/*.html` via `build.mjs` | The existing prototype. Deploys from `main`. This is the one `/updateDemo` ships. |
| **Office** | `apps/office` | The back office website |
| **Agents** | `apps/agents` | Hosted agent runtime and workflows |
| **Mobile OTA** | `apps/site-mobile` | Expo updates channel. Store builds via EAS, which is not Vercel. |

- Preview deployments per pull request, for office and agents.
- Postgres on Neon with branching, so a preview gets a database branch.
- Migrations run in CI before promotion, never at request time.
- **Deployment protection off for production** once the pilot starts, or the
  people who need to see it cannot.

**The mobile app does not deploy like the others.** Store review takes days, and
users run whatever version they last installed. Two consequences the swarm must
design for from the start:

1. **The API is versioned and backward compatible.** An old app in someone's
   pocket must keep working. Never remove a field the shipped app reads.
2. **The rules engine version is pinned into the build and reported with every
   sync.** If a handset computed a deadline on last month's rules, the back
   office has to be able to see that, because the two answers will differ and
   somebody will have to say which one stands.

Expo over-the-air updates cover JavaScript changes without a store round trip.
They do **not** cover a native module change, and the on-device model runtime is
a native module.

## 10. Security and data

- Row-level authorisation by project membership and role.
- Approval limits are data, not code: role plus value threshold.
- Evidence in object storage with signed, expiring URLs.
- **Client tender packs, priced bills and rates never enter the repository.**
  Seed and fixtures are generic by construction.
- Audit: every commercial decision records who, when and on what basis. That is
  not compliance theatre, it is the product; a committed rate without provenance
  is the problem we exist to solve.
