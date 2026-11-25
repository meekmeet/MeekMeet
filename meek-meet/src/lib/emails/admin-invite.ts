// Admin invitation email templates, built on the shared Meek Meet email chrome.
// Two sends: an invitation for someone new, and a grant notice for an
// existing user promoted immediately. All interpolations are escaped.

import { escapeHtml } from "@/lib/validation";
import {
  emailShell,
  emailButton,
  emailDivider,
  emailParagraph,
  emailHeading,
  emailCallout,
  emailFinePrint,
  SITE_URL,
} from "./shell";

export const ADMIN_EMAIL_FROM = "Meek Meet <hello@meekmeet.com>";

/** Invite for someone who does not have an account yet. */
export function buildAdminInviteEmail(options: { inviterName: string; invitedEmail: string }): {
  subject: string;
  html: string;
} {
  const safeName = escapeHtml(options.inviterName);
  const safeEmail = escapeHtml(options.invitedEmail);

  const content = `
    ${emailHeading("You've been invited to help lead Meek Meet")}
    ${emailParagraph(`Hello,`)}
    ${emailParagraph(
      `<strong>${safeName}</strong> has invited you to join the Meek Meet leadership team as a <strong>platform administrator</strong>. You will have full access to the admin area — reviewing leader applications, verifying documents, tending circles, and carrying the community's voice to decision-makers.`
    )}
    ${emailCallout(
      `This invitation was sent to <strong>${safeEmail}</strong>. Sign in with that address and your admin access will be waiting.`
    )}
    ${emailButton(`${SITE_URL}/login`, "ACCEPT YOUR INVITATION")}
    ${emailParagraph(
      `If the button doesn't work, copy this link into your browser:<br /><a href="${SITE_URL}/login" style="color:#1e2337; font-size:13px; word-break:break-all;">${SITE_URL}/login</a>`
    )}
    ${emailDivider()}
    ${emailFinePrint(
      "If you weren't expecting this invitation, you can simply ignore this email — nothing happens until you sign in."
    )}
  `;

  return {
    subject: `${safeName} invited you to be a Meek Meet admin`,
    html: emailShell({
      preheader: "You're invited to join the Meek Meet admin team.",
      eyebrow: "An invitation",
      contentHtml: content,
    }),
  };
}

/** Notice for an existing user who was promoted to admin immediately. */
export function buildAdminGrantedEmail(options: { invitedEmail: string }): {
  subject: string;
  html: string;
} {
  const safeEmail = escapeHtml(options.invitedEmail);

  const content = `
    ${emailHeading("Admin access granted")}
    ${emailParagraph(`Hello,`)}
    ${emailParagraph(
      `Your Meek Meet account (<strong>${safeEmail}</strong>) has been granted <strong>platform administrator</strong> access. You now have full access to the admin area — reviewing leader applications, verifying documents, tending circles, and carrying the community's voice to decision-makers.`
    )}
    ${emailButton(`${SITE_URL}/dashboard/admin`, "OPEN THE ADMIN AREA")}
    ${emailDivider()}
    ${emailFinePrint("If this comes as a surprise, please reply to this email and let us know.")}
  `;

  return {
    subject: "You now have admin access to Meek Meet",
    html: emailShell({
      preheader: "Your Meek Meet account now has admin access.",
      eyebrow: "Welcome, leader",
      contentHtml: content,
    }),
  };
}
