import { createHmac } from "node:crypto";

import { mcpAuthorized, verifyWhatsappSignature } from "./signature.js";

describe("verifyWhatsappSignature", () => {
  const secret = "app-secret";
  const body = `{"object":"whatsapp_business_account"}`;
  const good = `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;

  it("accepts a matching X-Hub-Signature-256", () => {
    expect(verifyWhatsappSignature(body, good, secret)).toBe(true);
  });

  it("rejects missing, wrong, or empty inputs", () => {
    expect(verifyWhatsappSignature(body, good, "")).toBe(false);
    expect(verifyWhatsappSignature(body, undefined, secret)).toBe(false);
    expect(verifyWhatsappSignature(body, "sha256=deadbeef", secret)).toBe(false);
    expect(verifyWhatsappSignature(body, good.slice(0, 10), secret)).toBe(false);
  });
});

describe("mcpAuthorized", () => {
  it("requires an exact bearer token", () => {
    expect(mcpAuthorized("Bearer secret-token", "secret-token")).toBe(true);
    expect(mcpAuthorized("Bearer other", "secret-token")).toBe(false);
    expect(mcpAuthorized("secret-token", "secret-token")).toBe(false);
    expect(mcpAuthorized("Bearer secret-token", "")).toBe(false);
  });
});
