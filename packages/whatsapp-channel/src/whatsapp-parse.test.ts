import { parseWhatsappWebhook, unixToIso } from "./whatsapp-parse.js";

const sample = {
  object: "whatsapp_business_account",
  entry: [
    {
      changes: [
        {
          value: {
            contacts: [{ profile: { name: "Site agent" }, wa_id: "27820000000" }],
            messages: [
              {
                from: "27820000000",
                id: "wamid.TEXT",
                timestamp: "1787749086",
                type: "text",
                text: { body: "/update add the toggle" },
              },
              {
                from: "27820000000",
                id: "wamid.DOC",
                timestamp: "1787749087",
                type: "document",
                document: {
                  id: "media-1",
                  mime_type: "application/pdf",
                  filename: "daywork.pdf",
                  caption: "signed sheet",
                },
              },
            ],
            statuses: [{ id: "wamid.STATUS", status: "delivered" }],
          },
        },
      ],
    },
  ],
};

describe("parseWhatsappWebhook", () => {
  it("extracts user messages and ignores delivery statuses", () => {
    const parsed = parseWhatsappWebhook(sample);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({
      wamid: "wamid.TEXT",
      from: "27820000000",
      text: "/update add the toggle",
      profileName: "Site agent",
    });
    expect(parsed[1]?.media).toEqual({
      id: "media-1",
      mimeType: "application/pdf",
      filename: "daywork.pdf",
      caption: "signed sheet",
    });
    expect(parsed[1]?.text).toBe("signed sheet");
  });

  it("returns nothing for junk", () => {
    expect(parseWhatsappWebhook(null)).toEqual([]);
    expect(parseWhatsappWebhook({ object: "other" })).toEqual([]);
  });
});

describe("unixToIso", () => {
  it("converts a WhatsApp timestamp", () => {
    expect(unixToIso("0")).toBe("1970-01-01T00:00:00.000Z");
  });

  it("rejects non-numeric values", () => {
    expect(() => unixToIso("nope")).toThrow(/Unix timestamp/);
  });
});
