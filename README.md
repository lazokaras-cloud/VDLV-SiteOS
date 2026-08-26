# SiteOS

A construction operating system that starts at tender and runs to final account, built on
the way a commercial building contract actually runs.

Repository and deployment are still named `constrAI` from before the rename; the product
is SiteOS everywhere it is read.

Two pages, both static, both mobile first:

| Page | What it is |
| --- | --- |
| `/plumbline` | The site app. A guided chat forces the employee through the process one question at a time while the JBCC contractual clock runs in the background. |
| `/office` | The head office console. Every live project against the price it was won at, organised around the six value areas: tender, procurement, site productivity, commercial, programme, knowledge. Adds an Insights board with a derived action queue, an assistant that answers from the data and pins its answers as widgets, and a knowledge graph of 108 nodes. |
| `/brief` | The process ontology deck: what to ask a business so a system can be built from the answers. |
| `/workflow` | The method. Control points, contract deadlines, where an on-device model fits, and how the training turns into a game. |

## The idea in one paragraph

Commercial building in South Africa runs on JBCC contracts whose deadlines are counted in
working days. Miss the notice window and a valid claim is worth nothing. The process that
prevents this already exists at the contractor, drawn on a 1.6 metre sheet on a wall, with 48 steps
that each carry an owner, a target date and a binary status. Nobody can carry that in their
head, and no estimating or accounting package tracks it. This is the gap: not a portfolio
dashboard of things that already happened, but the one thing that is about to stop happening,
on the phone of the person who can still do something about it.

## Status

Bilingual. A language button switches both the site app and the head office console
between English and Afrikaans,
which on a Gauteng site is not a nicety: a system that forces a foreman to work
in his second language is a system he works around. The chrome, all four panes and
the site-instruction-to-variation flow are fully translated, including the spoken
number parser, so "vier en sestig duisend twee honderd" resolves to R64 200. The
remaining four flows open with an Afrikaans notice saying their copy is still English,
rather than switching language halfway through a conversation.

Working prototype. The guidance is a **deterministic rules engine**, not a language model:
working days are computed against the South African public holiday calendar, and every
contractual date and rand amount is calculated rather than generated. Project data is
illustrative, shaped to be plausible for a job of this size, and is not taken from a real
contract.

## Layout

```
src/                 page fragments, authored without <head>
  index.html           landing
  plumbline.html       the site app
  teardown.html        the method piece, served at /workflow
build.mjs            wraps each fragment into a standalone document
index.html           generated, committed
plumbline/index.html generated, committed
workflow/index.html  generated, committed
```

Fragments are authored without a `<head>` so the same file can be published directly as a
Claude artifact, which supplies its own skeleton. `build.mjs` adds the doctype, charset,
viewport and social tags for the web build.

## Build

```bash
node build.mjs
```

No dependencies and no build step on Vercel. The generated files are committed so the repo
deploys as plain static hosting: framework preset **Other**, no build command, output
directory the repository root.

Pages carry `noindex`, so the site can be shared by link without turning up in search.

## Roadmap

Ten flows are mapped. Five are live: tender to baseline, site instruction to
variation order, progress report, monthly claim, sub-contractor default. Next up:

1. Contract edition as a first-class object, so every deadline derives from it
2. Real on-device speech and vision in place of the browser recogniser and the
   scripted image read
3. Appointments and bulk orders, where the settlement discount is won
4. The 48-point project spine as the object everything else hangs from
