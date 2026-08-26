import { isAllowedSender, normalizePhone, phoneTail, waMeLink } from "./phone.js";

describe("normalizePhone", () => {
  it("strips formatting to digits", () => {
    expect(normalizePhone("+27 82 000 0000")).toBe("27820000000");
    expect(normalizePhone("27820000000")).toBe("27820000000");
  });
});

describe("isAllowedSender", () => {
  it("denies everyone when the allowlist is empty", () => {
    expect(isAllowedSender("27820000000", [], false)).toBe(false);
  });

  it("matches formatted numbers against digits", () => {
    expect(isAllowedSender("+27 82 000 0000", ["27820000000"], false)).toBe(true);
    expect(isAllowedSender("27829999999", ["27820000000"], false)).toBe(false);
  });

  it("allow-all is explicit", () => {
    expect(isAllowedSender("27820000000", [], true)).toBe(true);
  });
});

describe("phoneTail", () => {
  it("returns at most four digits", () => {
    expect(phoneTail("27820000000")).toBe("0000");
    expect(phoneTail("12")).toBe("12");
  });
});

describe("waMeLink", () => {
  it("builds a join link from a display number", () => {
    expect(waMeLink("+27820000000")).toBe("https://wa.me/27820000000");
    expect(waMeLink("")).toBeUndefined();
  });
});
