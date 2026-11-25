import { describe, it, expect } from "vitest";
import { MARKETING_TEMPLATES, getMarketingTemplate } from "./marketing";

describe("marketing templates", () => {
  it("registers at least three person templates and one org template", () => {
    expect(MARKETING_TEMPLATES.filter((t) => t.audience === "person").length).toBeGreaterThanOrEqual(3);
    expect(MARKETING_TEMPLATES.filter((t) => t.audience === "org").length).toBeGreaterThanOrEqual(1);
  });

  it("template keys are unique", () => {
    const keys = MARKETING_TEMPLATES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every template builds a full email with a CTA to meekmeet.com", () => {
    for (const template of MARKETING_TEMPLATES) {
      const built = template.build({ recipientName: "Sam", orgName: "St. Mark's Anglican" });
      expect(built.subject.length).toBeGreaterThan(5);
      expect(built.html).toContain("<!DOCTYPE html>");
      expect(built.html).toContain("meekmeet.com");
      expect(built.html).toContain("MEEK");
    }
  });

  it("escapes HTML in recipient names", () => {
    const built = getMarketingTemplate("invite_vision")!.build({
      recipientName: '<img src=x onerror=alert(1)>',
    });
    expect(built.html).not.toContain("<img src=x");
    expect(built.html).toContain("&lt;img");
  });

  it("escapes HTML in org names", () => {
    const built = getMarketingTemplate("org_partnership")!.build({
      orgName: "<script>alert(1)</script> Church",
    });
    expect(built.html).not.toContain("<script>");
    expect(built.html).toContain("&lt;script&gt;");
  });

  it("omits the salutation gracefully when no name is given — no hollow 'Dear friend'", () => {
    const built = getMarketingTemplate("invite_circle")!.build({});
    expect(built.html).not.toContain("Dear friend");
    expect(built.html).not.toContain("Hello,");
    expect(built.html).not.toContain("undefined");
    // Opens directly with the story instead.
    expect(built.html).toContain("There is a chair with your name on it.");
  });

  it("includes the vision language in the founding invitation", () => {
    const built = getMarketingTemplate("invite_vision")!.build({});
    expect(built.html).toContain("Blessed are the meek, for they shall inherit the earth");
    expect(built.html).toContain("Matthew 5:5");
  });

  it("every template ends with a memorable P.S.", () => {
    for (const template of MARKETING_TEMPLATES) {
      const built = template.build({ recipientName: "Sam", orgName: "St Marks" });
      expect(built.html).toContain("P.S.");
    }
  });

  it("looks up templates by key", () => {
    expect(getMarketingTemplate("invite_vision")?.name).toBe("The Vision");
    expect(getMarketingTemplate("nope")).toBeUndefined();
  });

  it("addresses the organisation's leadership when only the org name is known", () => {
    const built = getMarketingTemplate("org_partnership")!.build({ orgName: "St Marks Anglican" });
    expect(built.html).toContain("To the leaders of St Marks Anglican,");
    expect(built.html).not.toContain("Dear friend");
    expect(built.html).toContain("Re: Giving St Marks Anglican a voice beyond your walls");
  });

  it("addresses a named contact personally", () => {
    const built = getMarketingTemplate("org_partnership")!.build({
      orgName: "St Marks",
      recipientName: "Pastor Jo",
    });
    expect(built.html).toContain("Dear Pastor Jo,");
    expect(built.subject).toContain("St Marks");
  });

  it("is a proposal letter: asks little, states safeguards, and signs off formally", () => {
    const built = getMarketingTemplate("org_partnership")!.build({ orgName: "Hills Chapel" });
    expect(built.html).toContain("A proposal for your consideration");
    expect(built.html).toContain("Safeguarding, in plain terms");
    expect(built.html).toContain("Working with Children Check");
    expect(built.html).toContain("With respect and hope");
    expect(built.html).toContain("The Meek Meet team");
    expect(built.html).toContain("What we are asking of you is small");
  });

  it("falls back gracefully with neither org nor name", () => {
    const built = getMarketingTemplate("org_partnership")!.build({});
    expect(built.html).toContain("To the leadership of your community,");
    expect(built.subject).toContain("A proposal");
  });

  it("renders the midnight theme with a navy card and gold accents", () => {
    const built = getMarketingTemplate("invite_vision")!.build({ theme: "midnight" });
    expect(built.html).toContain("#171d30"); // card
    expect(built.html).toContain("#0e1220"); // page
    expect(built.html).toContain("#d9b36c"); // accent
    // Copy is identical across themes.
    expect(built.html).toContain("Blessed are the meek");
  });

  it("renders the terracotta theme with fired-clay accents and its own pitch", () => {
    const built = getMarketingTemplate("invite_circle")!.build({ theme: "terracotta" });
    expect(built.html).toContain("#fff8f2");
    expect(built.html).toContain("#b3532f");
    expect(built.html).toContain("One hour. That's the entire ask.");
  });

  it("defaults to parchment and ignores unknown theme keys", () => {
    const built = getMarketingTemplate("invite_vision")!.build({});
    expect(built.html).toContain("#faf6ee");
    const weird = getMarketingTemplate("invite_vision")!.build({
      theme: "neon" as never,
    });
    expect(weird.html).toContain("#faf6ee");
  });
});
