// Printable flyer generator for organisation outreach. Produces a fully
// self-contained SVG (QR embedded as a PNG data URL) that churches and
// organisations can print from the email attachment.

import QRCode from "qrcode";
import { escapeHtml } from "@/lib/validation";
import { SITE_URL } from "./emails/shell";

// Church-appropriate accent palette for the flyer frame and highlights.
// Auto-selected by org name (deterministic), or chosen explicitly.
export const ORG_ACCENTS = {
  gold: "#d9b36c",
  navy: "#24466e",
  terracotta: "#b3532f",
  forest: "#2f5d3a",
  plum: "#5d2f52",
} as const;

export type OrgAccentKey = keyof typeof ORG_ACCENTS;

export function accentForOrg(orgName: string): string {
  const keys = Object.keys(ORG_ACCENTS) as OrgAccentKey[];
  let hash = 0;
  for (let i = 0; i < orgName.length; i++) {
    hash = (hash << 5) - hash + orgName.charCodeAt(i);
    hash |= 0;
  }
  // Skip "gold" for explicit orgs — they should feel distinct from the default.
  const distinct = keys.filter((k) => k !== "gold");
  return ORG_ACCENTS[distinct[Math.abs(hash) % distinct.length]];
}

// Flyer voice per tradition: accent colour, subtitle, scripture line, the
// gathering descriptor, and the footer. The flyer adjusts with the lead.
const FLYER_FAITH: Record<string, { accent: string; subtitle: string; scripture: string | null; gather: string; footer: string }> = {
  christian: {
    accent: "",
    subtitle: "The meek shall inherit the earth",
    scripture: "Blessed are the meek, for they shall inherit the earth.",
    gather: "Neighbours gathering in small circles — listening, praying,",
    footer: "A warm community of faith",
  },
  islamic: {
    accent: ORG_ACCENTS.forest,
    subtitle: "So that you may know one another",
    scripture: "We created you into nations and tribes so that you may know one another. — Qur'an 49:13",
    gather: "Neighbours gathering in small circles — listening, honouring,",
    footer: "A warm community of faith — all of it",
  },
  jewish: {
    accent: ORG_ACCENTS.navy,
    subtitle: "If not now, when?",
    scripture: "If I am not for myself, who will be for me? If not now, when? — Hillel, Pirkei Avot 1:14",
    gather: "Neighbours gathering in small circles — listening, arguing,",
    footer: "A warm community of faith",
  },
  buddhist: {
    accent: ORG_ACCENTS.plum,
    subtitle: "Let none despise anyone anywhere",
    scripture: "Let none deceive another, nor despise anyone anywhere. — Karaniya Metta Sutta",
    gather: "Neighbours gathering in small circles — listening, attending,",
    footer: "A warm community of faith",
  },
  hindu: {
    accent: ORG_ACCENTS.terracotta,
    subtitle: "The world is one family",
    scripture: "One should never do to another what one regards as injurious to one's own self. — Mahabharata",
    gather: "Neighbours gathering in small circles — listening, caring,",
    footer: "A warm community of faith",
  },
  sikh: {
    accent: ORG_ACCENTS.navy,
    subtitle: "Higher still is truthful living",
    scripture: "Truth is high, but higher still is truthful living. — Guru Nanak",
    gather: "Neighbours gathering in small circles — listening, serving,",
    footer: "A warm community of faith",
  },
  interfaith: {
    accent: ORG_ACCENTS.gold,
    subtitle: "One street, every faith",
    scripture: "Every faith agrees: the humble shall inherit the earth.",
    gather: "Neighbours gathering in small circles — listening, together,",
    footer: "A warm community of every faith and none",
  },
  secular: {
    accent: ORG_ACCENTS.navy,
    subtitle: "Your street has a voice",
    scripture: null,
    gather: "Neighbours gathering in small circles — listening, talking,",
    footer: "A warm community",
  },
};

export interface FlyerOptions {
  orgName?: string;
  /** Accent colour override (hex); defaults to gold, or org-derived. */
  accent?: string;
  /** Theme tag baked into the QR code for per-theme conversion tracking. */
  theme?: string;
  /** The tradition the flyer speaks to — adjusts accent, subtitle, scripture. */
  faith?: string;
}

export async function generateFlyerSvg(options: FlyerOptions): Promise<string> {
  const voice = FLYER_FAITH[(options.faith ?? "christian").toLowerCase()] ?? FLYER_FAITH.christian;
  // Faith voice takes the frame unless an accent is explicitly requested;
  // Christians keep the personalised org letterhead accent.
  const accent =
    options.accent && (options.faith ?? "christian").toLowerCase() === "christian"
      ? options.accent
      : voice.accent ||
        options.accent ||
        (options.orgName ? accentForOrg(options.orgName) : ORG_ACCENTS.gold);
  const joinUrl = `${SITE_URL}/circles?t=${encodeURIComponent(options.theme ?? "parchment")}`;
  const qrDataUrl = await QRCode.toDataURL(joinUrl, {
    margin: 1,
    width: 360,
    color: { dark: "#1e2337", light: "#faf6ee" },
  });

  const orgLine = options.orgName
    ? `<text x="397" y="206" text-anchor="middle" font-family="Georgia, serif" font-size="20" fill="#6b6b6b">Shared with you by ${escapeHtml(options.orgName)}</text>`
    : "";

  const scriptureLine = voice.scripture
    ? `<text x="397" y="386" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="16" fill="#a5854f">${escapeHtml(voice.scripture)}</text>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="794" height="1123" viewBox="0 0 794 1123">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#faf6ee"/>
      <stop offset="1" stop-color="#f3ecdd"/>
    </linearGradient>
  </defs>

  <rect width="794" height="1123" fill="url(#bg)"/>
  <rect x="28" y="28" width="738" height="1067" fill="none" stroke="${accent}" stroke-width="2" rx="18"/>

  <text x="397" y="120" text-anchor="middle" font-family="Georgia, serif" font-size="34" letter-spacing="6" fill="#1e2337">MEEK MEET</text>
  <text x="397" y="164" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="24" fill="#5a5344">${escapeHtml(voice.subtitle)}</text>
  ${orgLine}

  <text x="397" y="290" text-anchor="middle" font-family="Georgia, serif" font-size="42" fill="#2c2c2c">Your street has a voice.</text>
  <text x="397" y="336" text-anchor="middle" font-family="Georgia, serif" font-size="42" fill="#2c2c2c">Come and be heard.</text>

  ${scriptureLine}

  <text x="397" y="428" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="#5a5344">${escapeHtml(voice.gather)}</text>
  <text x="397" y="454" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="#5a5344">and speaking with one voice to those who make decisions.</text>

  <g font-family="Georgia, serif" font-size="18" fill="#2c2c2c">
    <circle cx="150" cy="510" r="17" fill="#1e2337"/>
    <text x="150" y="516" text-anchor="middle" font-size="16" fill="#faf6ee">1</text>
    <text x="182" y="516">Join a circle near you</text>

    <circle cx="150" cy="566" r="17" fill="#1e2337"/>
    <text x="150" y="572" text-anchor="middle" font-size="16" fill="#faf6ee">2</text>
    <text x="182" y="572">Talk about what matters on your street</text>

    <circle cx="150" cy="622" r="17" fill="#1e2337"/>
    <text x="150" y="628" text-anchor="middle" font-size="16" fill="#faf6ee">3</text>
    <text x="182" y="628">Your words reach councils, anonymised</text>
  </g>

  <rect x="257" y="664" width="280" height="280" rx="16" fill="#faf6ee" stroke="#e8e0cc"/>
  <image x="269" y="676" width="256" height="256" xlink:href="${qrDataUrl}"/>
  <text x="397" y="984" text-anchor="middle" font-family="Georgia, serif" font-size="20" fill="#1e2337">Scan to find your circle</text>
  <text x="397" y="1016" text-anchor="middle" font-family="'Source Sans 3', sans-serif" font-size="17" fill="#6b6b6b">meekmeet.com/circles · free to join</text>

  <text x="397" y="1048" text-anchor="middle" font-family="Georgia, serif" font-size="13" fill="#8a8272">${escapeHtml(voice.footer)}</text>
  <text x="397" y="1072" text-anchor="middle" font-family="Georgia, serif" font-size="10.5" fill="#a39a86">One promise, many names — Matthew 5:5 · Psalm 37:11 · Qur&#039;an 21:105 · Tao Te Ching 66</text>
</svg>
`;
}
