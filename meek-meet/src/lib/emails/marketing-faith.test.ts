import { describe, it, expect, vi } from "vitest";
import { MockSupabaseClient } from "@/test/mock-supabase";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock("@/lib/resend", () => ({
  getResend: vi.fn(() => ({ emails: { send: sendMock } })),
}));

import { getMarketingTemplate } from "./marketing";
import { generateFlyerSvg } from "@/lib/flyer";
import { sendSequenceStep } from "@/lib/marketing/drip";

// Meek Meet's promise — that the humble inherit the earth — is claimed by
// every major faith. The org letter must SPEAK in the recipient's tradition:
// a different pitch per faith, not the same letter with a swapped quote.

function buildOrg(faith: string | undefined, theme = "parchment") {
  const template = getMarketingTemplate("org_partnership")!;
  return template.build({ orgName: "Test Community", theme: theme as never, faith });
}

// The shell footer deliberately carries the "many names" thread line
// (Matthew 5:5 · Psalm 37:11 · Qur'an 21:105 · …) — the promise framed as
// shared across traditions. Pitch purity is asserted on the body only,
// everything before the footer's comment marker.
function bodyOf(html: string) {
  return html.split("<!-- Footer -->")[0];
}

describe("org letter faith pitches (parchment, day 0)", () => {
  it("christian (default): the congregation letter", () => {
    const { html, subject } = buildOrg(undefined);
    expect(subject).toContain("beyond Sunday");
    expect(html).toContain("Blessed are the meek, for they shall inherit the earth.");
    expect(html).toContain("Matthew 5:5");
    expect(html).toContain("congregations");
    expect(html).toContain("church door");
  });

  it("islamic: ummah language — knowing one another, brothers and sisters", () => {
    const { html, subject } = buildOrg("islamic");
    expect(subject.toLowerCase()).toContain("ummah");
    expect(html).toContain("so that we may know one another");
    expect(html).toContain("Qur'an 49:13");
    expect(html).toContain("brothers and sisters");
    expect(html).toContain("five times a day");
    expect(bodyOf(html)).toContain("the meek shall inherit the earth");
    expect(bodyOf(html)).toContain("saying of Isa");
    expect(bodyOf(html)).not.toContain("congregations");
    expect(bodyOf(html)).not.toContain("Shabbat");
  });

  it("jewish: an argument to be examined — Hillel's questions", () => {
    const { html, subject } = buildOrg("jewish");
    expect(subject.toLowerCase()).toContain("proposition");
    expect(html).toContain("If I am not for myself, who will be for me?");
    expect(html).toContain("Pirkei Avot");
    expect(html).toContain("unanswerable");
    expect(html).toContain("argument for the sake of heaven");
    expect(html).not.toContain("ummah");
    expect(bodyOf(html)).toContain("the meek shall inherit the earth");
    expect(bodyOf(html)).toContain("Psalms, thirty-seven and eleven");
  });

  it("buddhist: the street as sangha, listening as practice", () => {
    const { html, subject } = buildOrg("buddhist");
    expect(subject.toLowerCase()).toContain("sangha");
    expect(html).toContain("Let none deceive another, nor despise anyone anywhere");
    expect(html).toContain("Karaniya Metta Sutta");
    expect(html).toContain("metta with an address");
    expect(bodyOf(html)).toContain("the meek shall inherit the earth");
    expect(bodyOf(html)).toContain("gentleness, not force");
  });

  it("hindu: the street as family — vasudhaiva kutumbakam", () => {
    const { html, subject } = buildOrg("hindu");
    expect(subject.toLowerCase()).toContain("family");
    expect(html).toContain("Vasudhaiva kutumbakam");
    expect(html).toContain("Mahabharata");
    expect(html).toContain("dharma");
    expect(bodyOf(html)).toContain("the meek shall inherit the earth");
    expect(bodyOf(html)).toContain("dharma protects those who protect it");
  });

  it("sikh: the langar widened — seva of the voice", () => {
    const { html, subject } = buildOrg("sikh");
    expect(subject.toLowerCase()).toContain("langar");
    expect(html).toContain("Truth is high, but higher still is truthful living");
    expect(html).toContain("Guru Nanak");
    expect(html).toContain("langar");
    expect(html).toContain("seva");
    expect(bodyOf(html)).toContain("the meek shall inherit the earth");
    expect(bodyOf(html)).toContain("Guru Nanak would have recognised it at once");
  });

  it("interfaith: every faith, one street — the unity mission front and centre", () => {
    const { html, subject } = buildOrg("interfaith");
    expect(subject.toLowerCase()).toContain("every faith");
    expect(html).toContain("the mosque and the synagogue and the temple and the church");
    expect(html).toContain("stops being a slogan");
    expect(bodyOf(html)).toContain("for they shall inherit the earth");
    expect(bodyOf(html)).toContain("shared inheritance, not a brand");
  });

  it("secular: civic voice — the spark restated without scripture", () => {
    const { html, subject } = buildOrg("secular");
    expect(bodyOf(html)).toContain("the meek shall inherit the earth");
    expect(bodyOf(html)).toContain("governed blind");
    expect(html).toContain("one in two hundred");
    expect(subject.toLowerCase()).not.toContain("sunday");
  });

  it("falls back to the christian letter for unknown faith values", () => {
    const { html } = buildOrg("zoroastrian");
    expect(html).toContain("Matthew 5:5");
  });

  it("every letter closes with the many-names thread — the promise framed as shared", () => {
    const { html } = buildOrg("islamic");
    const footer = html.split("<!-- Footer -->")[1];
    expect(footer).toContain("The promise has many names");
    expect(footer).toContain("Qur&rsquo;an 21:105");
    expect(footer).toContain("Psalm 37:11");
    expect(footer).toContain("every faith and none");
  });

  it("midnight and terracotta escalations keep working for every faith", () => {
    for (const faith of ["islamic", "jewish", "secular"]) {
      const midnight = buildOrg(faith, "midnight");
      expect(midnight.subject.toLowerCase()).toContain("second letter");
      const terracotta = buildOrg(faith, "terracotta");
      expect(terracotta.subject.toLowerCase()).toContain("last");
    }
  });

  it("escapes the org name inside every faith's copy", () => {
    const template = getMarketingTemplate("org_partnership")!;
    const { html } = template.build({ orgName: "<script>x</script>", faith: "islamic" });
    expect(html).not.toContain("<script>");
  });
});

describe("flyer faith variants", () => {
  it("islamic flyer: forest accent, Qur'an line, ummah footer", async () => {
    const svg = await generateFlyerSvg({ faith: "islamic" });
    expect(svg).toContain("#2f5d3a"); // forest frame
    expect(svg).toContain("So that you may know one another");
    expect(svg).toContain("49:13");
    expect(svg).toContain("all of it");
    expect(svg).not.toContain("Blessed are the meek");
  });

  it("jewish flyer: navy accent, Hillel line", async () => {
    const svg = await generateFlyerSvg({ faith: "jewish" });
    expect(svg).toContain("#24466e");
    expect(svg).toContain("Pirkei Avot 1:14");
    expect(svg).not.toContain("Micah 6:8");
  });

  it("sikh flyer: navy accent, Guru Nanak line", async () => {
    const svg = await generateFlyerSvg({ faith: "sikh" });
    expect(svg).toContain("Guru Nanak");
    expect(svg).toContain("listening, serving");
  });

  it("secular flyer: no scripture line, civic footer", async () => {
    const svg = await generateFlyerSvg({ faith: "secular" });
    expect(svg).not.toContain("Blessed are the meek");
    expect(svg).toContain("A warm community</text>");
  });

  it("christian flyer keeps the org letterhead accent when given one", async () => {
    const svg = await generateFlyerSvg({ faith: "christian", accent: "#24466e", orgName: "St Marks" });
    expect(svg).toContain('stroke="#24466e"');
    expect(svg).toContain("Blessed are the meek");
    expect(svg).toContain("Shared with you by St Marks");
  });
});

describe("sendSequenceStep faith pass-through", () => {
  it("hands the sequence's faith to the letter AND the flyer", async () => {
    sendMock.mockResolvedValue({ id: "email-1" });
    const supa = new MockSupabaseClient();
    supa.enqueue({ id: "send-f1" }).enqueue(null).enqueue(null);

    const outcome = await sendSequenceStep(supa as never, {
      id: "seq-f1",
      kind: "org",
      recipient_email: "imam@mosque.example",
      recipient_name: null,
      org_name: "Coast Mosque",
      contact_name: null,
      template_key: "org_partnership",
      current_step: 0,
      faith: "islamic",
    });

    expect(outcome).toMatchObject({ sent: true, step: 1, theme: "parchment" });
    const sent = sendMock.mock.calls[0][0];
    expect(sent.html).toContain("Qur'an 49:13");
    expect(bodyOf(sent.html)).not.toContain("Matthew 5:5");
    // The attached flyer carries the same faith voice.
    const flyer = sent.attachments.find((a: { filename: string }) => a.filename === "meek-meet-flyer.svg");
    const svg = Buffer.from(flyer.content, "base64").toString("utf-8");
    expect(svg).toContain("49:13");
    expect(svg).toContain("#2f5d3a");
  });
});
