import { describe, it, expect } from "vitest";
import {
  emailShell,
  emailButton,
  emailCallout,
  emailEyebrow,
  emailFinePrint,
  SITE_URL,
  EMAIL_THEMES,
  EMAIL_THEME_ORDER,
  getEmailTheme,
  themeForAttempt,
  themed,
} from "./shell";

describe("email themes", () => {
  it("orders the escalation ladder parchment → midnight → terracotta", () => {
    expect(EMAIL_THEME_ORDER).toEqual(["parchment", "midnight", "terracotta"]);
    expect(EMAIL_THEMES.parchment.stage).toBe(1);
    expect(EMAIL_THEMES.midnight.stage).toBe(2);
    expect(EMAIL_THEMES.terracotta.stage).toBe(3);
  });

  it("suggests the next theme for each follow-up attempt", () => {
    expect(themeForAttempt(1).key).toBe("parchment");
    expect(themeForAttempt(2).key).toBe("midnight");
    expect(themeForAttempt(3).key).toBe("terracotta");
    // And cycles if someone keeps not answering.
    expect(themeForAttempt(4).key).toBe("parchment");
  });

  it("falls back to parchment for unknown keys", () => {
    expect(getEmailTheme("neon").key).toBe("parchment");
    expect(getEmailTheme(null).key).toBe("parchment");
    expect(getEmailTheme(undefined).key).toBe("parchment");
  });

  it("midnight and terracotta differ from parchment in every major token", () => {
    for (const key of ["midnight", "terracotta"] as const) {
      const t = EMAIL_THEMES[key];
      expect(t.pageBg).not.toBe(EMAIL_THEMES.parchment.pageBg);
      expect(t.cardBg).not.toBe(EMAIL_THEMES.parchment.cardBg);
      expect(t.buttonBg).not.toBe(EMAIL_THEMES.parchment.buttonBg);
      expect(t.ink).not.toBe(EMAIL_THEMES.parchment.ink);
    }
  });

  it("every theme has an email-safe heading and body font stack", () => {
    for (const key of EMAIL_THEME_ORDER) {
      const t = EMAIL_THEMES[key];
      expect(t.headingFont).toContain("serif");
      expect(t.bodyFont.length).toBeGreaterThan(10);
    }
  });
});

describe("themed helpers", () => {
  it("renders midnight-styled button, quote, and steps", () => {
    const h = themed(EMAIL_THEMES.midnight);
    expect(h.button("https://x.test", "GO")).toContain("#d9b36c");
    expect(h.scriptureQuote("Verse", "Ref")).toContain("#d9b36c");
    expect(h.steps(["one"])).toContain("#d9b36c");
    expect(h.steps(["one"])).toContain("one");
    expect(h.ps("note")).toContain("P.S.");
  });

  it("keeps the parchment defaults identical to the legacy exports", () => {
    expect(emailButton("https://x.test", "GO")).toBe(themed(EMAIL_THEMES.parchment).button("https://x.test", "GO"));
  });
});

describe("emailShell", () => {
  const html = emailShell({
    preheader: "Hidden preview text",
    eyebrow: "An invitation",
    contentHtml: "<p>Body</p>",
  });

  it("renders a full HTML document with the hidden preheader", () => {
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Hidden preview text");
    expect(html).toContain("<p>Body</p>");
  });

  it("includes the Meek Meet logo and wordmark", () => {
    expect(html).toContain('src="https://www.meekmeet.com/logo.png"');
    expect(html).toContain("MEEK&nbsp;MEET");
  });

  it("includes the promise, the many-names thread, and real footer links", () => {
    expect(html).toContain("Blessed are the meek");
    expect(html).toContain("The promise has many names");
    expect(html).toContain("Psalm 37:11");
    expect(html).toContain("Qur&rsquo;an 21:105");
    expect(html).toContain("A warm community of every faith and none");
    expect(html).toContain(`href="${SITE_URL}"`);
    expect(html).toContain(`${SITE_URL}/about`);
    expect(html).toContain(`${SITE_URL}/circles`);
  });

  it("renders the eyebrow label", () => {
    expect(html).toContain(emailEyebrow("An invitation").trim());
  });

  it("helpers compose inside the shell", () => {
    const full = emailShell({
      preheader: "p",
      contentHtml:
        emailCallout("note") +
        emailButton("https://example.com", "GO") +
        emailFinePrint("fine"),
    });
    expect(full).toContain("note");
    expect(full).toContain("https://example.com");
    expect(full).toContain(">GO</a>");
    expect(full).toContain("fine");
  });
});
