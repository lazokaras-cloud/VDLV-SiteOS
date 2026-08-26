import { parseWebMessage, shouldProcessWebMessage } from "./whatsapp-web-parse.js";

describe("parseWebMessage", () => {
  const config = {
    whatsappGroupJid: "",
    whatsappGroupSubject: "SiteOS Cursor",
  };

  it("routes a group message on the channel name, including fromMe", () => {
    const parsed = parseWebMessage(
      {
        id: "ABCD",
        remoteJid: "120363@g.us",
        participant: "27820000000@s.whatsapp.net",
        fromMe: true,
        timestamp: 0,
        pushName: "Tobie",
        text: "/update add the toggle",
      },
      "SiteOS Cursor",
      config,
    );
    expect(parsed?.fromChannel).toBe(true);
    expect(parsed?.from).toBe("27820000000");
    expect(parsed?.replyTo).toBe("120363@g.us");
    expect(parsed?.text).toBe("/update add the toggle");
  });

  it("does not treat a differently named group as the channel", () => {
    const parsed = parseWebMessage(
      {
        id: "E",
        remoteJid: "120363@g.us",
        participant: "27820000000@s.whatsapp.net",
        fromMe: false,
        timestamp: 0,
        text: "hello",
      },
      "Family",
      config,
    );
    expect(parsed?.fromChannel).toBeUndefined();
  });

  it("ignores status broadcasts", () => {
    expect(
      parseWebMessage(
        {
          id: "S",
          remoteJid: "status@broadcast",
          fromMe: false,
          timestamp: 0,
          text: "x",
        },
        undefined,
        config,
      ),
    ).toBeUndefined();
  });

  it("skips bridge-originated fromMe messages without a participant", () => {
    expect(
      shouldProcessWebMessage({
        id: "bot",
        remoteJid: "120363@g.us",
        fromMe: true,
        timestamp: 0,
        text: "Note stored. Cursor can see it in the inbox.",
      }),
    ).toBe(false);
  });

  it("still processes fromMe group messages with a participant", () => {
    expect(
      shouldProcessWebMessage({
        id: "user",
        remoteJid: "120363@g.us",
        participant: "27820000000@s.whatsapp.net",
        fromMe: true,
        timestamp: 0,
        text: "Hello",
      }),
    ).toBe(true);
  });
});
