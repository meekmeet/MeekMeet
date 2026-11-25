// Shared email chrome for all Meek Meet transactional and marketing email.
// One design system in three escalating themes (see EMAIL_THEMES): parchment,
// midnight, terracotta. Templates build their copy once and render it through
// `themed(theme)` helpers so a single send can change its entire personality.

const LOGO_URL = "https://www.meekmeet.com/logo.png";
export const SITE_URL = "https://meekmeet.com";

/** The tracked redirect used for every marketing CTA and QR code. */
export function trackedUrl(
  dest: string,
  templateKey: string,
  theme: string,
  sendId?: string
): string {
  const params = new URLSearchParams({ d: dest, tpl: templateKey, t: theme });
  if (sendId) params.set("s", sendId);
  return `${SITE_URL}/api/t?${params.toString()}`;
}

// ── Themes ─────────────────────────────────────────────────────
// Escalation ladder: send parchment first; if no answer, resend in a
// strikingly different theme so the second email doesn't look like the first
// one ignored. Email-client-safe: webfont-free stacks, table layout, inline
// styles only.

export type EmailThemeKey = "parchment" | "midnight" | "terracotta";

export interface EmailTheme {
  key: EmailThemeKey;
  name: string;
  stage: number; // position in the escalation ladder
  description: string;
  pageBg: string;
  cardBg: string;
  cardBorder: string;
  ink: string;
  muted: string;
  faint: string;
  accent: string;
  calloutBg: string;
  calloutBorder: string;
  buttonBg: string;
  buttonInk: string;
  stepNumBg: string;
  stepNumInk: string;
  rule: string;
  headingFont: string;
  bodyFont: string;
}

export const EMAIL_THEMES: Record<EmailThemeKey, EmailTheme> = {
  parchment: {
    key: "parchment",
    name: "Parchment",
    stage: 1,
    description: "Warm and editorial — the first knock on the door.",
    pageBg: "#f3ecdd",
    cardBg: "#faf6ee",
    cardBorder: "#e8e0cc",
    ink: "#2c2c2c",
    muted: "#6b6b6b",
    faint: "#8a8272",
    accent: "#a5854f",
    calloutBg: "#f5efe0",
    calloutBorder: "#d9b36c",
    buttonBg: "#1e2337",
    buttonInk: "#faf6ee",
    stepNumBg: "#d9b36c",
    stepNumInk: "#1e2337",
    rule: "#e8e0cc",
    headingFont: "Georgia,'Times New Roman',serif",
    bodyFont: "Georgia,'Times New Roman',serif",
  },
  midnight: {
    key: "midnight",
    name: "Midnight",
    stage: 2,
    description: "Deep navy and gold — premium, dramatic, impossible to skim.",
    pageBg: "#0e1220",
    cardBg: "#171d30",
    cardBorder: "#2a3350",
    ink: "#ece7da",
    muted: "#aab2c8",
    faint: "#8b93ad",
    accent: "#d9b36c",
    calloutBg: "#1f2740",
    calloutBorder: "#d9b36c",
    buttonBg: "#d9b36c",
    buttonInk: "#1e2337",
    stepNumBg: "#d9b36c",
    stepNumInk: "#1e2337",
    rule: "#2a3350",
    headingFont: "Georgia,'Palatino Linotype','Book Antiqua',serif",
    bodyFont: "Georgia,'Palatino Linotype','Book Antiqua',serif",
  },
  terracotta: {
    key: "terracotta",
    name: "Terracotta",
    stage: 3,
    description: "Bold fired-clay warmth — the final nudge that feels human.",
    pageBg: "#f4e3d8",
    cardBg: "#fff8f2",
    cardBorder: "#e9c9b6",
    ink: "#3a241b",
    muted: "#7a5442",
    faint: "#9a7a68",
    accent: "#b3532f",
    calloutBg: "#f7e6da",
    calloutBorder: "#b3532f",
    buttonBg: "#b3532f",
    buttonInk: "#fff8f2",
    stepNumBg: "#b3532f",
    stepNumInk: "#fff8f2",
    rule: "#e9c9b6",
    headingFont: "Georgia,'Times New Roman',serif",
    bodyFont: "'Source Sans 3','Segoe UI',Arial,sans-serif",
  },
};

export const EMAIL_THEME_ORDER: EmailThemeKey[] = ["parchment", "midnight", "terracotta"];

export function getEmailTheme(key: string | undefined | null): EmailTheme {
  if (key && key in EMAIL_THEMES) return EMAIL_THEMES[key as EmailThemeKey];
  return EMAIL_THEMES.parchment;
}

/** The theme for follow-up attempt N (1-based) to the same recipient. */
export function themeForAttempt(attempt: number): EmailTheme {
  return EMAIL_THEMES[EMAIL_THEME_ORDER[Math.max(0, attempt - 1) % EMAIL_THEME_ORDER.length]];
}

// ── Themed helpers ─────────────────────────────────────────────

export interface ThemedEmail {
  button: (href: string, label: string) => string;
  divider: () => string;
  paragraph: (text: string) => string;
  heading: (text: string) => string;
  eyebrow: (text: string) => string;
  callout: (text: string) => string;
  finePrint: (text: string) => string;
  scriptureQuote: (text: string, reference?: string) => string;
  steps: (items: string[]) => string;
  ps: (text: string) => string;
  ornament: () => string;
}

export function themed(t: EmailTheme): ThemedEmail {
  return {
    button(href, label) {
      return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:30px auto;">
    <tr>
      <td style="border-radius:999px; background-color:${t.buttonBg}; mso-padding-alt:14px 40px;">
        <a href="${href}" style="display:inline-block; padding:14px 40px; font-family:${t.bodyFont}; font-size:14px; letter-spacing:0.08em; color:${t.buttonInk}; text-decoration:none; border-radius:999px;">${label}</a>
      </td>
    </tr>
  </table>`;
    },
    divider() {
      return `<hr style="border:0; border-top:1px solid ${t.rule}; margin:30px 0;" />`;
    },
    paragraph(text) {
      return `<p style="font-size:16px; line-height:1.75; margin:0 0 16px;">${text}</p>`;
    },
    heading(text) {
      return `<h1 style="font-family:${t.headingFont}; font-size:27px; line-height:1.35; margin:0 0 22px; font-weight:normal;">${text}</h1>`;
    },
    eyebrow(text) {
      return `<p style="font-family:${t.bodyFont}; font-size:11px; letter-spacing:0.28em; text-transform:uppercase; color:${t.accent}; margin:0 0 10px;">${text}</p>`;
    },
    callout(text) {
      return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${t.calloutBg}; border-left:3px solid ${t.calloutBorder}; border-radius:10px; margin:10px 0 22px;">
    <tr>
      <td style="padding:16px 20px; font-size:14px; line-height:1.65; font-family:${t.bodyFont}; color:${t.muted};">
        ${text}
      </td>
    </tr>
  </table>`;
    },
    finePrint(text) {
      return `<p style="font-size:13px; line-height:1.6; color:${t.faint}; margin:0;">${text}</p>`;
    },
    scriptureQuote(text, reference) {
      return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0;">
    <tr>
      <td align="center" style="padding:22px 18px; border-top:1px solid ${t.rule}; border-bottom:1px solid ${t.rule};">
        <p style="font-family:${t.headingFont}; font-style:italic; font-size:19px; line-height:1.6; color:${t.accent}; margin:0 0 6px;">&ldquo;${text}&rdquo;</p>
        ${reference ? `<p style="font-family:${t.bodyFont}; font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:${t.faint}; margin:0;">${reference}</p>` : ""}
      </td>
    </tr>
  </table>`;
    },
    steps(items) {
      const rows = items
        .map(
          (text, i) => `
    <tr>
      <td valign="top" width="34">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td width="26" height="26" align="center" style="background-color:${t.stepNumBg}; border-radius:999px; font-family:${t.headingFont}; font-size:13px; color:${t.stepNumInk};">${i + 1}</td>
        </tr></table>
      </td>
      <td style="padding-bottom:14px; font-size:15px; line-height:1.65; font-family:${t.bodyFont}; color:${t.ink};">${text}</td>
    </tr>`
        )
        .join("");
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 10px;">${rows}</table>`;
    },
    ps(text) {
      return `<p style="font-family:${t.headingFont}; font-style:italic; font-size:15px; line-height:1.7; color:${t.muted}; margin:18px 0 0;"><strong style="color:${t.accent};">P.S.</strong> ${text}</p>`;
    },
    ornament() {
      return `<p align="center" style="margin:24px 0; color:${t.accent}; font-size:15px; letter-spacing:8px;">&#8258;</p>`;
    },
  };
}

// ── Shell ──────────────────────────────────────────────────────

export function emailShell(options: {
  preheader: string;
  eyebrow?: string;
  contentHtml: string;
  theme?: EmailThemeKey;
}): string {
  const t = getEmailTheme(options.theme);
  const h = themed(t);
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light" />
    <title>Meek Meet</title>
  </head>
  <body style="margin:0; padding:0; background-color:${t.pageBg};">
    <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${options.preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${t.pageBg};">
      <tr>
        <td align="center" style="padding:36px 16px 48px;">
          <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="max-width:580px; width:100%;">

            <!-- Wordmark header -->
            <tr>
              <td align="center" style="padding-bottom:22px;">
                <img src="${LOGO_URL}" alt="Meek Meet" width="56" height="56" style="display:inline-block; border-radius:14px;" />
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:28px;">
                <span style="font-family:${t.headingFont}; font-size:21px; letter-spacing:0.22em; color:${t.key === "midnight" ? "#ece7da" : "#1e2337"};">MEEK&nbsp;MEET</span>
              </td>
            </tr>

            <!-- Card -->
            <tr>
              <td style="background-color:${t.cardBg}; border:1px solid ${t.cardBorder}; border-radius:22px; padding:44px 42px; font-family:${t.bodyFont}; color:${t.ink};">
                ${options.eyebrow ? h.eyebrow(options.eyebrow) : ""}
                ${options.contentHtml}
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="padding-top:30px; font-family:${t.bodyFont}; font-size:12px; color:${t.faint}; line-height:2;">
                <em style="font-size:14px; color:${t.accent};">&ldquo;Blessed are the meek, for they shall inherit the earth.&rdquo;</em><br />
                <span style="font-size:11px; color:${t.faint};">The promise has many names &mdash; Matthew 5:5 &middot; Psalm 37:11 &middot; Qur&rsquo;an 21:105 &middot; Tao Te Ching 66</span>
                <br />
                <a href="${SITE_URL}" style="color:${t.muted}; text-decoration:underline;">meekmeet.com</a>
                &nbsp;&middot;&nbsp;
                <a href="${SITE_URL}/about" style="color:${t.muted}; text-decoration:underline;">our vision</a>
                &nbsp;&middot;&nbsp;
                <a href="${SITE_URL}/circles" style="color:${t.muted}; text-decoration:underline;">find a circle</a>
                <br />
                Meek Meet &middot; A warm community of every faith and none
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
}

// ── Parchment-default helpers (back-compat for transactional email) ──

const p = themed(EMAIL_THEMES.parchment);
export const emailButton = p.button;
export const emailDivider = p.divider;
export const emailParagraph = p.paragraph;
export const emailHeading = p.heading;
export const emailEyebrow = p.eyebrow;
export const emailCallout = p.callout;
export const emailFinePrint = p.finePrint;
export const emailScriptureQuote = p.scriptureQuote;
export const emailSteps = p.steps;
export const emailPS = p.ps;
export const emailOrnament = p.ornament;
