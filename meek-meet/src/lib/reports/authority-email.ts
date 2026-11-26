import { escapeHtml } from "@/lib/validation";
import type { ReportContent } from "@/lib/reports/generate-report";

export interface AuthorityLetterInput {
  authorityName: string;
  circleName: string;
  circleLocation: string;
  content: Partial<ReportContent>;
  summary: string;
  reportId: string;
  generatedAt: string; // ISO
}

export interface AuthorityLetter {
  subject: string;
  html: string;
  reference: string;
}

const MEEK_MEET_ABN = "96 557 008 393";

function referenceFor(reportId: string, generatedAt: string): string {
  const day = generatedAt.slice(0, 10).replace(/-/g, "");
  const suffix = reportId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `MM-${day}-${suffix}`;
}

function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * The Community Voice Letter: the report a council or member of parliament
 * receives. Enterprise discipline: reference number, letterhead with ABN,
 * executive summary, evidence, methodology and data integrity, a clear ask,
 * and a way to reply. No em dashes, ever.
 */
export function buildAuthorityLetter(input: AuthorityLetterInput): AuthorityLetter {
  const reference = referenceFor(input.reportId, input.generatedAt);
  const authority = escapeHtml(input.authorityName);
  const circleName = escapeHtml(input.circleName);
  const circleLocation = escapeHtml(input.circleLocation);
  const content = input.content;
  const summary = escapeHtml(input.summary || content.rawSummary || "");

  const themes = content.topThemes ?? [];
  const consensus = content.consensusItems ?? [];
  const quotes = content.anonymisedQuotes ?? [];
  const sentiment = content.sentimentSummary;
  const windowLabel =
    content.timeWindow === "last_30_days"
      ? "the last 30 days"
      : content.timeWindow === "last_90_days"
        ? "the last 90 days"
        : "all meetings to date";

  const themesRows = themes
    .map(
      (t) => `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #ece4d2;font-weight:bold;color:#2c2c2c;">${escapeHtml(t.theme)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #ece4d2;color:#6b6b6b;text-transform:capitalize;">${escapeHtml(t.sentiment)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #ece4d2;color:#6b6b6b;text-align:right;">${t.count} mention${t.count === 1 ? "" : "s"}</td>
      </tr>`
    )
    .join("");

  const consensusHtml = consensus
    .map(
      (c) => `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #ece4d2;color:#2c2c2c;">${escapeHtml(c.statement)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #ece4d2;color:#6b6b6b;text-align:right;white-space:nowrap;">${c.agreementLevel}% agreement</td>
      </tr>`
    )
    .join("");

  const quotesHtml = quotes
    .slice(0, 4)
    .map(
      (q) => `<p style="margin:0 0 10px;font-style:italic;color:#4a4a4a;">&ldquo;${escapeHtml(q)}&rdquo;</p>`
    )
    .join("");

  const sentimentLine = sentiment
    ? `${sentiment.positive} positive, ${sentiment.neutral} neutral, ${sentiment.negative} concerned (${escapeHtml(sentiment.dominant)} overall)`
    : "Not yet measured";

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f3eee2;font-family:Georgia,'Times New Roman',serif;color:#2c2c2c;">
  <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
    <!-- Letterhead -->
    <div style="background:#1d2433;border-radius:12px 12px 0 0;padding:28px 32px;color:#f5f0e6;">
      <p style="margin:0;font-size:20px;letter-spacing:6px;text-transform:uppercase;">Meek Meet</p>
      <p style="margin:6px 0 0;font-size:12px;color:#c9a25e;letter-spacing:2px;">Community Voice &middot; Blessed are the meek</p>
    </div>
    <div style="background:#fffdf8;border:1px solid #e5dcc8;border-top:0;border-radius:0 0 12px 12px;padding:32px;">

      <p style="margin:0 0 4px;font-size:12px;color:#6b6b6b;letter-spacing:1px;text-transform:uppercase;">Reference ${reference}</p>
      <p style="margin:0 0 24px;font-size:13px;color:#6b6b6b;">${formatLongDate(input.generatedAt)}</p>

      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
        To the honourable members and officers of<br/>
        <strong>${authority}</strong>
      </p>

      <p style="margin:0 0 24px;font-size:15px;line-height:1.7;">
        <strong>${circleName}</strong>, gathering in ${circleLocation}, has been meeting in circle
        through the Meek Meet platform. Before each gathering, every participant writes
        answers to questions of community life: safety, housing, loneliness, the care of
        the land, and the strength of the street. In the circle they read what they wrote.
        This letter carries what they said, anonymised and weighed, for your consideration.
      </p>

      <!-- At a glance -->
      <div style="background:#f5efe0;border-radius:10px;padding:20px 24px;margin:0 0 24px;">
        <p style="margin:0 0 12px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#8a6a3a;">At a glance &middot; ${windowLabel}</p>
        <table role="presentation" width="100%" style="border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="padding:4px 0;color:#6b6b6b;">Responses collected</td>
            <td style="padding:4px 0;text-align:right;font-weight:bold;">${content.responseCount ?? 0}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#6b6b6b;">Gatherings held</td>
            <td style="padding:4px 0;text-align:right;font-weight:bold;">${content.meetingCount ?? 0}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#6b6b6b;">Sentiment</td>
            <td style="padding:4px 0;text-align:right;font-weight:bold;">${sentimentLine}</td>
          </tr>
        </table>
      </div>

      <!-- Executive summary -->
      <h2 style="font-size:17px;margin:0 0 10px;">Summary</h2>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.7;">${summary}</p>

      ${
        themesRows
          ? `<h2 style="font-size:17px;margin:0 0 4px;">What the circle raised</h2>
      <table role="presentation" width="100%" style="border-collapse:collapse;font-size:14px;margin:0 0 24px;">
        ${themesRows}
      </table>`
          : ""
      }

      ${
        consensusHtml
          ? `<h2 style="font-size:17px;margin:0 0 4px;">Where the circle agrees</h2>
      <table role="presentation" width="100%" style="border-collapse:collapse;font-size:14px;margin:0 0 24px;">
        ${consensusHtml}
      </table>`
          : ""
      }

      ${
        quotesHtml
          ? `<h2 style="font-size:17px;margin:0 0 10px;">In their own words</h2>
      <div style="border-left:3px solid #c9a25e;padding-left:16px;margin:0 0 24px;">${quotesHtml}</div>`
          : ""
      }

      <!-- Methodology -->
      <h2 style="font-size:17px;margin:0 0 10px;">Method and data integrity</h2>
      <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;line-height:1.7;color:#4a4a4a;">
        <li>Every response is anonymised before aggregation. No name, email, or identifying detail reaches this report.</li>
        <li>Answers are written individually before each gathering, then read aloud, so what you read is considered, not performed.</li>
        <li>Themes are counted across responses, not drawn from a single voice. A theme appears only where it repeats.</li>
        <li>Every circle leader is identity verified, holds a current Working With Children Check and a National Police Check.</li>
        <li>Gatherings follow the new moon rhythm and a consistent question discipline, so results across months can be compared fairly.</li>
      </ul>

      <!-- The ask -->
      <div style="background:#1d2433;color:#f5f0e6;border-radius:10px;padding:20px 24px;margin:0 0 24px;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#c9a25e;">What we ask</p>
        <p style="margin:0;font-size:15px;line-height:1.7;">
          That this report be tabled, acknowledged, and answered. These are the measured
          words of your quietest constituents, delivered with care. A short reply to
          <strong>hello@meekmeet.com</strong>, even to name the right officer to speak with,
          keeps the circle's trust alive.
        </p>
      </div>

      <p style="margin:0 0 4px;font-size:15px;">With respect and hope,</p>
      <p style="margin:0 0 24px;font-size:15px;"><strong>Meek Meet &middot; Community Voice</strong><br/>
        <span style="font-size:13px;color:#6b6b6b;">hello@meekmeet.com &middot; meekmeet.com</span></p>

      <hr style="border:0;border-top:1px solid #e8e0cc;margin:0 0 12px;" />
      <p style="margin:0;font-size:11px;line-height:1.6;color:#8a8a8a;">
        Meek Meet is a registered Australian sole trader, ABN ${MEEK_MEET_ABN}, based in New South Wales.
        This report is generated and sent by the community's request. Replies are read by the Meek Meet
        administration and shared with the circle in aggregate. Reference ${reference}.
      </p>
    </div>
  </div>
</body></html>`;

  const subject = `Community Voice Report, ${input.circleLocation.replace(/[<>"']/g, "")} (ref ${reference})`;

  return { subject, html, reference };
}
