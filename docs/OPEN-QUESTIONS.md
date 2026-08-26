# Open questions

Add anything you needed and could not find. Do not guess, and do not delete an
entry: mark it answered with the answer and its source.

Format:

```
### Q-01 — short title
**Asked by:** agent / ticket
**Blocking:** which ticket, or "no"
**Question:** ...
**Answer:** ... *(source)*
```

---

### Q-01 — Are the clause references verified?
**Asked by:** hand-off
**Blocking:** no, but blocks commercial reliance
**Question:** Section 3 of `03-RULES.md` was transcribed from a tender pack, a
priced bill and a process flowchart, not from the published JBCC agreements. Are
the clause numbers and windows correct?
**Answer:** Not yet verified. Treat every constant as data, keep it in
`editions.ts`, and have someone with the executed contract check it before the
pilot goes live.

### Q-02 — Which builders' break dates apply per contract?
**Asked by:** hand-off
**Blocking:** RULES-01 fixture accuracy
**Question:** The break is published annually by the regional master builders
association and carried in tender qualifications. Do we take it per contract from
the qualification, or hold a company default and let the contract override?
**Answer:** Per contract, from the qualification. The default is a convenience
only. Two live projects can differ.

### Q-03 — Does the pay-when-paid position apply on every project?
**Asked by:** hand-off
**Blocking:** RULES-06
**Question:** Paying nominated and selected sub-contractors only once the
employer has paid is a tender qualification, not a JBCC default, and it requires
the employer to insert a clause into the sub-contract conditions. Is it always
agreed?
**Answer:** No. Model it as a project-level flag defaulting to off, and surface
whether it was actually agreed for that contract.

### Q-04 — What is the working-days-per-month divisor for EOT recovery?
**Asked by:** hand-off
**Blocking:** RULES-07 rounding
**Question:** Time-related P&G is held per month. An extension is granted in
working days. What divisor converts one to the other, and is it contractual or
conventional?
**Answer:** Unknown. Roughly 21.7 working days per month is the arithmetic
average, but the contract may define it. Ask before shipping a claim figure.

### Q-05 — How are the 48 control points allocated to owners?
**Asked by:** hand-off
**Blocking:** RULES-09
**Question:** Every control point carries a named owner. Is the mapping from
control point to role fixed, or set per project at handover?
**Answer:** Unknown. Assume per project with a role-based default until told
otherwise.

### Q-06 — Why is the estimating package round trip broken?
**Asked by:** hand-off
**Blocking:** IMPORT-01, TENDER-03
**Question:** The per-trade packages in `docs/knowledge/source/boq/` are
`CANDYXLS` exports carrying an `INTERNAL LINK` key per row, which means rates can
be read straight back in. Yet rates are described as being typed in by hand. Which
is actually happening: sub-contractors return a PDF or printout, they return a
restructured spreadsheet with rows added or removed, or they quote on their own
letterhead against nothing?
**Answer:** Unknown. Ask before building the importer, because the answer decides
whether the work is a file parser, a reconciler, or an extraction problem.
