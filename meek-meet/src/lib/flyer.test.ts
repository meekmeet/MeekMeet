import { describe, it, expect } from "vitest";

const qrTargets: string[] = [];
vi.mock("qrcode", async (importOriginal) => {
  const mod: Record<string, unknown> = await importOriginal();
  const wrap = (fn: (...args: unknown[]) => unknown) => (...args: unknown[]) => {
    qrTargets.push(String(args[0]));
    return (fn as (...a: unknown[]) => unknown)(...args);
  };
  const defaultMod = (mod.default ?? {}) as Record<string, unknown>;
  return {
    ...mod,
    toDataURL: wrap(mod.toDataURL as never),
    default: { ...defaultMod, toDataURL: wrap((defaultMod.toDataURL ?? mod.toDataURL) as never) },
  };
});

import { generateFlyerSvg, accentForOrg, ORG_ACCENTS } from "./flyer";

describe("generateFlyerSvg", () => {
  it("produces an A4-portrait SVG with the vision text", async () => {
    const svg = await generateFlyerSvg({});
    expect(svg).toContain('width="794" height="1123"');
    expect(svg).toContain("The meek shall inherit the earth");
    expect(svg).toContain("meekmeet.com/circles");
    expect(svg).toContain("Your street has a voice.");
    expect(svg).toContain("Scan to find your circle");
  });

  it("embeds a real QR code pointing at the circles page", async () => {
    const svg = await generateFlyerSvg({});
    expect(svg).toMatch(/xlink:href="data:image\/png;base64,[A-Za-z0-9+/=]{100,}"/);
  });

  it("includes the organisation name, escaped", async () => {
    const svg = await generateFlyerSvg({ orgName: "Holy Cross <script> Church" });
    expect(svg).toContain("Shared with you by");
    expect(svg).toContain("Holy Cross &lt;script&gt; Church");
    expect(svg).not.toContain("<script>");
  });

  it("omits the shared-by line when no org is given", async () => {
    const svg = await generateFlyerSvg({});
    expect(svg).not.toContain("Shared with you by");
  });

  it("walks through the three steps of the vision", async () => {
    const svg = await generateFlyerSvg({});
    expect(svg).toContain("Join a circle near you");
    expect(svg).toContain("Talk about what matters on your street");
    expect(svg).toContain("Your words reach councils, anonymised");
  });
});

describe("flyer tracking and accents", () => {
  it("bakes the theme into the QR target URL", async () => {
    const before = qrTargets.length;
    await generateFlyerSvg({ theme: "midnight" });
    expect(qrTargets.length).toBeGreaterThan(before);
    expect(qrTargets[qrTargets.length - 1]).toContain("meekmeet.com/circles?t=midnight");
  });

  it("derives a stable, distinct accent per organisation", async () => {
    const a1 = accentForOrg("St Marks Anglican");
    const a2 = accentForOrg("St Marks Anglican");
    const others = new Set(
      ["Alpha Church", "Beta Chapel", "Gamma Parish", "Delta Fellowship", "Epsilon Mission"].map(accentForOrg)
    );
    expect(a1).toBe(a2); // deterministic
    expect(a1).not.toBe(ORG_ACCENTS.gold); // orgs get a distinct accent
    expect(others.size).toBeGreaterThan(1); // varies across orgs
  });

  it("uses the org accent for the flyer frame", async () => {
    const svg = await generateFlyerSvg({ orgName: "St Marks Anglican", accent: "#24466e" });
    expect(svg).toContain('stroke="#24466e"');
  });

  it("falls back to gold for anonymous flyers", async () => {
    const svg = await generateFlyerSvg({});
    expect(svg).toContain('stroke="#d9b36c"');
  });
});
