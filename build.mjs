// Wraps the page fragments in src/ into standalone HTML documents.
// The fragments are authored without <head> so the same file can also be
// published as a Claude artifact, which supplies its own skeleton.
// Run: node build.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));

const FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
      '<rect width="32" height="32" rx="6" fill="#101317"/>' +
      '<path d="M16 5v13" stroke="#E5AE0B" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M11 18h10l-5 8z" fill="#E5AE0B"/>' +
      "</svg>"
  );

const PAGES = [
  {
    src: "src/index.html",
    out: "index.html",
    desc:
      "The project app and the company overview. One job from the tender onto the site, and one sheet for the company.",
  },
  {
    src: "src/plumbline.html",
    out: "plumbline/index.html",
    desc:
      "The project app. One question at a time, from the tender result through the job.",
  },
  {
    src: "src/office.html",
    out: "office/index.html",
    desc:
      "The company overview. Four fictional jobs on one sheet, grouped for a contracts director.",
  },
  {
    src: "src/brief.html",
    out: "brief/index.html",
    desc:
      "A template for capturing how a construction business actually runs, in the one " +
      "shape a system can be built from.",
  },
  {
    src: "src/teardown.html",
    out: "workflow/index.html",
    desc:
      "How a commercial building contract actually runs: the control points, the deadlines, " +
      "and where a system has to step in.",
  },
];

// No absolute site URL is baked in: the vercel.app subdomains that match this
// project name belong to unrelated projects, so canonical and og:url are left
// relative until a real domain is attached.
const SITE = process.env.SITE_URL || "";

function build({ src, out, desc }) {
  let body = readFileSync(join(ROOT, src), "utf8");

  const m = body.match(/<title>([^<]*)<\/title>/i);
  const title = m ? m[1].trim() : "SiteOS";
  body = body.replace(/<title>[^<]*<\/title>\s*/i, "");

  const path = "/" + out.replace(/(^|\/)index\.html$/, "$1").replace(/\/$/, "");
  const canonical = SITE ? SITE + path : path;

  const doc = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="${esc(desc)}">
<meta name="color-scheme" content="light dark">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,300;0,400;0,600;0,700;0,900;1,400&display=swap">
<meta name="theme-color" content="#F1F1F1" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0C0C0C" media="(prefers-color-scheme: dark)">
<link rel="icon" href="${FAVICON}">
<link rel="apple-touch-icon" href="${FAVICON}">
<link rel="canonical" href="${canonical}">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta property="og:type" content="website">
<meta property="og:site_name" content="SiteOS">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary">
<meta name="robots" content="noindex">
</head>
<body>
${body.trim()}
</body>
</html>
`;

  const dest = join(ROOT, out);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, doc, "utf8");

  const nonAscii = [...doc].filter((c) => c.codePointAt(0) > 127);
  console.log(
    `  ${out.padEnd(22)} ${title.padEnd(18)} ${(doc.length / 1024).toFixed(1).padStart(6)} kB` +
      (nonAscii.length ? `  (${nonAscii.length} non-ascii)` : "")
  );
}

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

console.log("building SiteOS");
PAGES.forEach(build);
console.log("done");
