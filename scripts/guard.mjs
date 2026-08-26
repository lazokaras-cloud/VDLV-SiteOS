#!/usr/bin/env node
/**
 * Guard rails.
 *
 * Mechanically enforces the invariants in docs/09-GUARDRAILS.md. Prose rules do
 * not survive contact with a request at six in the evening; this does.
 *
 * Runs in CI on every pull request and locally via `pnpm guard`. A failure here
 * is not a style opinion. Every check below exists because breaking it either
 * loses money, leaks a client document, or silently makes a contractual number
 * wrong, which is worse than an outage because nobody reports it.
 *
 * If a check is genuinely wrong, change the check in its own pull request with a
 * reason. Never disable it in passing to make something else go green.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { createHash } from "node:crypto";

const ROOT = process.cwd();
const problems = [];
const notes = [];

const fail = (rule, detail) => problems.push({ rule, detail });
const note = (msg) => notes.push(msg);

const read = (p) => readFileSync(join(ROOT, p), "utf8");
const exists = (p) => existsSync(join(ROOT, p));

function walk(dir, out = []) {
  if (!existsSync(join(ROOT, dir))) return out;
  for (const entry of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, entry);
    const abs = join(ROOT, rel);
    if (statSync(abs).isDirectory()) {
      if (["node_modules", ".git", ".next", "dist", "coverage"].includes(entry)) continue;
      walk(rel, out);
    } else out.push(rel.split("\\").join("/"));
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 1. The rules engine stays pure
 * ------------------------------------------------------------------ */
if (exists("packages/rules/package.json")) {
  const pkg = JSON.parse(read("packages/rules/package.json"));
  const deps = Object.keys(pkg.dependencies ?? {});
  if (deps.length) {
    fail(
      "rules-no-dependencies",
      `packages/rules must have no dependencies, found: ${deps.join(", ")}. ` +
        `It has to run in Node, a browser, a worker and eventually a handset.`,
    );
  }
}

const ruleFiles = walk("packages/rules/src").filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
for (const f of ruleFiles) {
  const src = read(f);

  // No ambient clock. asAt is always an argument, which is what makes
  // "as at month end" free and the tests deterministic.
  if (/\bDate\.now\s*\(/.test(src) || /new Date\s*\(\s*\)/.test(src)) {
    fail("rules-no-ambient-clock", `${f} reads the clock. Pass asAt as an argument instead.`);
  }

  // No I/O of any kind.
  if (/\bfrom\s+["']node:|require\(["']node:|\bfetch\s*\(/.test(src)) {
    fail("rules-no-io", `${f} does I/O or imports a node builtin. The engine is pure.`);
  }

  // No escape hatches in business logic.
  if (/:\s*any\b/.test(src)) {
    fail("rules-no-any", `${f} uses \`any\`. Model the type properly.`);
  }
  if (/@ts-(ignore|expect-error|nocheck)/.test(src)) {
    fail("rules-no-ts-suppression", `${f} suppresses the type checker.`);
  }
}

/* ------------------------------------------------------------------ *
 * 2. Golden fixtures do not drift quietly
 * ------------------------------------------------------------------ */
const FIXTURES = [
  "fixtures/calendar-2025-2026.json",
  "fixtures/editions.json",
  "fixtures/tender-lanseria.json",
  "fixtures/project-menlyn.json",
];
const LOCK = "fixtures/.lock.json";

const digest = (p) => createHash("sha256").update(read(p)).digest("hex").slice(0, 16);
const current = Object.fromEntries(FIXTURES.filter(exists).map((f) => [f, digest(f)]));

if (process.argv.includes("--bless")) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(join(ROOT, LOCK), JSON.stringify(current, null, 2) + "\n");
  console.log("fixtures blessed. Say why in the pull request body.");
  process.exit(0);
}

if (exists(LOCK)) {
  const locked = JSON.parse(read(LOCK));
  for (const [f, hash] of Object.entries(current)) {
    if (locked[f] && locked[f] !== hash) {
      fail(
        "fixture-changed",
        `${f} changed. Golden numbers are verified, not guessed. If this is ` +
          `deliberate, run \`pnpm guard --bless\` and explain why in the pull ` +
          `request. If it is not, you have probably adjusted an expected value ` +
          `to make a test pass, which is the wrong direction.`,
      );
    }
  }
} else {
  note("no fixture lock yet, run `pnpm guard --bless` once to create it");
}

/* ------------------------------------------------------------------ *
 * 3. Nothing from the knowledge folder reaches anything that ships
 * ------------------------------------------------------------------ */
const IDENTIFIERS = [
  "ultimate heliport", "nsika", "clarence de wet", "cdl.co.za", "bhberg",
  "van der linde", "v/d linde", "vdlv.co.za", "@vdlv", "waterval 5-ir",
  "grant finlayson", "johan ras", "bernard van der merwe", "thys@",
  "gerhard@", "jp@century", "012 803",
];
// The real product. `src/` is the throwaway prototype and carries the demo
// client name on purpose; `scripts/` is tooling and this file necessarily holds
// the list it searches for.
const SHIPPED = ["packages", "apps", "fixtures"];
for (const dir of SHIPPED) {
  for (const f of walk(dir)) {
    if (/\.(ts|tsx|js|mjs|json|css|html|md)$/.test(f)) {
      const lower = read(f).toLowerCase();
      for (const id of IDENTIFIERS) {
        if (lower.includes(id)) {
          fail(
            "client-data-in-shipped-code",
            `${f} contains "${id}". Client names, consultants, individuals and ` +
              `traceable rates live only in docs/knowledge, never in anything ` +
              `that ships. Use the generic fixture names.`,
          );
        }
      }
    }
  }
}

// and never a path reference into it
for (const dir of SHIPPED) {
  for (const f of walk(dir)) {
    if (/\.(ts|tsx|js|mjs)$/.test(f) && /docs\/knowledge/.test(read(f))) {
      fail("knowledge-referenced-from-code", `${f} reads from docs/knowledge. That folder is reference material for people, not an input to the product.`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * 4. Invariants that protect money
 * ------------------------------------------------------------------ */
const domainFiles = walk("packages/domain/src").concat(walk("packages/db/src"));
for (const f of domainFiles) {
  if (!f.endsWith(".ts")) continue;
  const src = read(f);

  // Binary status is a deliberate choice, see docs/08-DECISIONS.md D-07.
  if (/percent(age)?Complete|pctComplete|progressPct/i.test(src)) {
    fail(
      "no-percentage-complete",
      `${f} introduces a percentage-complete field. Control points are binary: ` +
        `done or not. That is what makes the completion figure trustworthy.`,
    );
  }

  // The baseline is immutable, see D-06.
  if (/interface Baseline\b/.test(src) && !/readonly/.test(src)) {
    fail("baseline-must-be-readonly", `${f} declares Baseline without readonly fields.`);
  }
}

/* ------------------------------------------------------------------ *
 * 5. Coverage gate is not quietly lowered
 * ------------------------------------------------------------------ */
if (exists("vitest.config.ts")) {
  const cfg = read("vitest.config.ts");
  const nums = [...cfg.matchAll(/(branches|functions|lines|statements):\s*(\d+)/g)];
  for (const [, key, val] of nums) {
    if (Number(val) < 100) {
      fail("coverage-gate-lowered", `vitest.config.ts sets ${key} coverage to ${val}. The rules engine gate is 100 and is a merge gate, not a target.`);
    }
  }
  if (!nums.length) fail("coverage-gate-missing", "vitest.config.ts has no coverage thresholds.");
}

/* ------------------------------------------------------------------ *
 * 6. The repository must stay private while knowledge is in it
 * ------------------------------------------------------------------ */
if (exists("docs/knowledge") && exists(".github/workflows")) {
  const wf = walk(".github/workflows").map(read).join("\n");
  if (/pages-deploy|actions\/deploy-pages/.test(wf)) {
    fail("no-public-publish", "a workflow publishes the repository contents while docs/knowledge is present.");
  }
}

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */
const bar = "─".repeat(64);
console.log(`\n${bar}\nguard rails\n${bar}`);
for (const n of notes) console.log(`  note   ${n}`);

if (!problems.length) {
  console.log(`  ok     ${ruleFiles.length} rules files, ${FIXTURES.filter(exists).length} fixtures, nothing shipped that should not be\n`);
  process.exit(0);
}

const byRule = new Map();
for (const p of problems) {
  if (!byRule.has(p.rule)) byRule.set(p.rule, []);
  byRule.get(p.rule).push(p.detail);
}
for (const [rule, details] of byRule) {
  console.log(`\n  BLOCKED  ${rule}`);
  for (const d of details) console.log(`           ${d}`);
}
console.log(
  `\n${bar}\n${problems.length} problem${problems.length === 1 ? "" : "s"}. ` +
    `These are guard rails, not lint. Read docs/09-GUARDRAILS.md before ` +
    `changing one.\n`,
);
process.exit(1);
