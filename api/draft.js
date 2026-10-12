// Back-office draft call. See docs/11-AGENT-RUNTIME.md section 2.
// This is the one place that chooses the provider and the model.
// The call goes through the Vercel AI Gateway. The browser only posts
// to /api/draft and never sees a key.
// AI_GATEWAY_API_KEY is the credential. A later provider replaces that
// key and sets AI_MODEL. AI_GATEWAY_MODEL is the previous name for the
// model id and is used only when AI_MODEL is unset.
// The model extracts and phrases. A person accepts any date or amount
// before it is kept. This file does not compute one.

const MODEL = process.env.AI_MODEL || process.env.AI_GATEWAY_MODEL || "amazon/nova-micro";
const ENDPOINT = "https://ai-gateway.vercel.sh/v1/chat/completions";

const BOUNDARY = [
  "You draft and extract text.",
  "You are not the source of a date, a deadline, a quantity, a rate, a percentage, or a rand amount.",
  "Copy a date or an amount only when it is already written in the text you were given, and mark it as their words.",
  "Do not invent a clause number, a notice period, a payment term, or a markup.",
  "Do not add a project, a person, or a price that is not in the text.",
  "Technical nouns stay in English: notice, claim, programme, RFI, EOT, snag, plant, Candy, BuildSmart.",
  "Reply with one JSON object and no other text."
].join(" ");

const TASKS = {
  diary: {
    instruction:
      "A site diary note follows. Split it into these text fields: work, labour, materials, delays, rfis, drawings, instructions, snags, plant, weather, move. " +
      "Use only words from the note. Leave a field as an empty string when the note does not mention it. " +
      "Put any date, amount, quantity, or percentage that appears in the note into proposals as well as the field, copied exactly. " +
      "Do not add a date or an amount the note does not contain.",
    shape: '{"fields":{"work":"","labour":"","materials":"","delays":"","rfis":"","drawings":"","instructions":"","snags":"","plant":"","weather":"","move":""},"proposals":[{"field":"delays","kind":"date","text":""}]}'
  },
  risk: {
    instruction:
      "The text is a tender or contract document the company pasted. Write a short risk note and a qualifications suggestion in prose, grounded only in that text. " +
      "Do not state a deadline, a date, a quantity, or a price as a fact. If you mention one, it must be a quote already in the text.",
    shape: '{"risk":"","qualifications":""}'
  },
  rfi: {
    instruction:
      "Draft the request wording from the rows and notes provided. Any date in the draft must be copied from a date already on those rows. Do not invent a date or an amount.",
    shape: '{"draft":""}'
  },
  claims: {
    instruction:
      "The figures and the comparison sentences were already calculated in the app. Write advice in sentences around those figures only. " +
      "Do not introduce a new amount, percentage, date, or quantity. Do not name a contract clause. The 10% retention check, if present, is SiteOS Rev 4 section 2.5, not a contract clause.",
    shape: '{"advice":""}'
  },
  quality: {
    instruction:
      "Ask, in short sentences, for the area, the description, the responsible person, and the status, using what is still missing from the note. " +
      "Also fill area, description, person, and status from the note when the note states them. Leave a field empty when it does not. " +
      "Do not produce a date or an amount. Dates are entered by the person.",
    shape: '{"ask":"","fields":{"area":"","description":"","person":"","status":""}}'
  }
};

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function clip(s, n) {
  const t = String(s == null ? "" : s);
  return t.length > n ? t.slice(0, n) : t;
}

function safeError(status, message) {
  const msg = clip(message || "The model call failed.", 400).replace(/sk-[A-Za-z0-9_-]{8,}/g, "[redacted]");
  return { error: msg, status: status };
}

function parseModelJson(text) {
  const raw = String(text || "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch (e) {
    return null;
  }
}

function isoDates(s) {
  return String(s || "").match(/\d{4}-\d{2}-\d{2}/g) || [];
}

function digitRuns(s) {
  return String(s || "").replace(/[\s\u202f]/g, "").match(/\d+/g) || [];
}

function allowedDigits(corpus) {
  const set = new Set(digitRuns(corpus));
  return set;
}

function adviceIntroducesAmount(advice, corpus) {
  const allowed = allowedDigits(corpus);
  const runs = digitRuns(advice);
  for (const run of runs) {
    if (!allowed.has(run)) return true;
  }
  return false;
}

function datesNotIn(text, allowed) {
  return isoDates(text).filter((d) => allowed.indexOf(d) === -1);
}

function stripDates(text, drop) {
  let out = String(text || "");
  drop.forEach((d) => {
    out = out.split(d).join("");
  });
  return out.replace(/[ \t]{2,}/g, " ").trim();
}

function tidy(task, parsed, payload) {
  if (!parsed || typeof parsed !== "object") return { error: "The model response was not usable." };
  if (task === "diary") {
    const src = parsed.fields && typeof parsed.fields === "object" ? parsed.fields : {};
    const fields = {};
    ["work", "labour", "materials", "delays", "rfis", "drawings", "instructions", "snags", "plant", "weather", "move"].forEach((k) => {
      fields[k] = typeof src[k] === "string" ? src[k] : "";
    });
    const proposals = Array.isArray(parsed.proposals) ? parsed.proposals : [];
    return { fields: fields, proposals: proposals };
  }
  if (task === "risk") {
    const source = clip(payload.text, 12000);
    let risk = typeof parsed.risk === "string" ? parsed.risk : "";
    let qualifications = typeof parsed.qualifications === "string" ? parsed.qualifications : "";
    const stray = datesNotIn(risk + "\n" + qualifications, isoDates(source));
    if (stray.length) {
      risk = stripDates(risk, stray);
      qualifications = stripDates(qualifications, stray);
    }
    return { risk: risk, qualifications: qualifications, omitted: stray.length > 0 };
  }
  if (task === "rfi") {
    let draft = typeof parsed.draft === "string" ? parsed.draft : "";
    const allowed = Array.isArray(payload.dates) ? payload.dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)) : [];
    const stray = datesNotIn(draft, allowed);
    if (stray.length) draft = stripDates(draft, stray);
    return { draft: draft, omitted: stray.length > 0 };
  }
  if (task === "claims") {
    const advice = typeof parsed.advice === "string" ? parsed.advice : "";
    const corpus = clip(payload.corpus, 12000);
    if (adviceIntroducesAmount(advice, corpus)) {
      return { error: "The model introduced an amount that was not entered." };
    }
    return { advice: advice };
  }
  if (task === "quality") {
    const src = parsed.fields && typeof parsed.fields === "object" ? parsed.fields : {};
    const fields = {};
    ["area", "description", "person", "status"].forEach((k) => {
      fields[k] = typeof src[k] === "string" ? src[k] : "";
    });
    let ask = typeof parsed.ask === "string" ? parsed.ask : "";
    const stray = isoDates(ask + "\n" + Object.values(fields).join("\n"));
    if (stray.length) {
      ask = stripDates(ask, stray);
      stray.forEach((d) => {
        ["area", "description", "person", "status"].forEach((k) => {
          fields[k] = stripDates(fields[k], [d]);
        });
      });
    }
    return { ask: ask, fields: fields, omitted: stray.length > 0 };
  }
  return { error: "The model response was not usable." };
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch (e) { return null; }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try { return JSON.parse(raw); } catch (e) { return null; }
}

async function handler(req, res) {
  if (req.method !== "POST") {
    send(res, 405, safeError(405, "POST only."));
    return;
  }
  const key = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || "";
  if (!key) {
    send(res, 503, safeError(503, "AI_GATEWAY_API_KEY is not set."));
    return;
  }
  const body = await readBody(req);
  if (!body || typeof body !== "object") {
    send(res, 400, safeError(400, "The request was not JSON."));
    return;
  }
  const task = String(body.task || "");
  const spec = TASKS[task];
  if (!spec) {
    send(res, 400, safeError(400, "Unknown task."));
    return;
  }
  const payload = body.payload && typeof body.payload === "object" ? body.payload : {};
  const lang = payload.lang === "af" ? "Afrikaans" : "English";
  const user = spec.instruction + " Reply in " + lang + ". JSON shape: " + spec.shape + "\n\n" + clip(JSON.stringify(payload), 14000);

  let gateway;
  try {
    gateway = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        authorization: "Bearer " + key,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: BOUNDARY },
          { role: "user", content: user }
        ]
      }),
      signal: AbortSignal.timeout(25000)
    });
  } catch (e) {
    send(res, 502, safeError(502, "The model call failed."));
    return;
  }

  const rawText = await gateway.text();
  if (!gateway.ok) {
    let detail = "The model call failed (" + gateway.status + ").";
    if (gateway.status === 401 || gateway.status === 403) {
      detail = "The model refused the call (" + gateway.status + "). Set AI_GATEWAY_API_KEY on the constr-ai project.";
    }
    send(res, gateway.status, safeError(gateway.status, detail));
    return;
  }

  let completion = null;
  try { completion = JSON.parse(rawText); } catch (e) { completion = null; }
  const text = completion && completion.choices && completion.choices[0] && completion.choices[0].message
    ? completion.choices[0].message.content
    : "";
  const parsed = parseModelJson(text);
  const tidyResult = tidy(task, parsed, payload);
  if (tidyResult.error) {
    send(res, 422, safeError(422, tidyResult.error));
    return;
  }
  const answered = completion && typeof completion.model === "string" && completion.model
    ? completion.model
    : MODEL;
  send(res, 200, Object.assign({ model: answered }, tidyResult));
}

module.exports = handler;
