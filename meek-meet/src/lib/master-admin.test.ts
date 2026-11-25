import { describe, it, expect } from "vitest";
import { isMasterEmail, MASTER_ADMIN_EMAIL } from "./master-admin";
import {
  buildAdminInviteEmail,
  buildAdminGrantedEmail,
} from "./emails/admin-invite";

describe("isMasterEmail", () => {
  it("matches the exact master email", () => {
    expect(isMasterEmail(MASTER_ADMIN_EMAIL)).toBe(true);
    expect(isMasterEmail("meekmeets@gmail.com")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isMasterEmail("MeekMeets@Gmail.COM")).toBe(true);
    expect(isMasterEmail("MEEKMEETS@GMAIL.COM")).toBe(true);
  });

  it("trims whitespace", () => {
    expect(isMasterEmail("  meekmeets@gmail.com ")).toBe(true);
  });

  it.each([
    "other@gmail.com",
    "meekmeets@gmail.com.evil.com",
    "meekmeet@gmail.com",
    "",
    "null",
  ])("rejects %s", (email) => {
    expect(isMasterEmail(email)).toBe(false);
  });

  it("rejects null and undefined", () => {
    expect(isMasterEmail(null)).toBe(false);
    expect(isMasterEmail(undefined)).toBe(false);
  });
});

describe("buildAdminInviteEmail", () => {
  const email = buildAdminInviteEmail({
    inviterName: "Master Admin",
    invitedEmail: "new@example.com",
  });

  it("has a personal subject line", () => {
    expect(email.subject).toBe("Master Admin invited you to be a Meek Meet admin");
  });

  it("contains the CTA button and sign-in link", () => {
    expect(email.html).toContain("ACCEPT YOUR INVITATION");
    expect(email.html).toContain("https://meekmeet.com/login");
  });

  it("mentions the invited email and full admin powers", () => {
    expect(email.html).toContain("new@example.com");
    expect(email.html).toContain("platform administrator");
  });

  it("escapes HTML in the inviter name", () => {
    const evil = buildAdminInviteEmail({
      inviterName: '<script>alert("x")</script>',
      invitedEmail: "new@example.com",
    });
    expect(evil.html).not.toContain("<script>");
    expect(evil.html).toContain("&lt;script&gt;");
  });

  it("escapes HTML in the invited email", () => {
    const evil = buildAdminInviteEmail({
      inviterName: "Master",
      invitedEmail: "x<b>@example.com",
    });
    expect(evil.html).not.toContain("<b>@");
  });

  it("renders as a full HTML document with preheader", () => {
    expect(email.html).toContain("<!DOCTYPE html>");
    expect(email.html).toContain("Meek Meet");
  });
});

describe("buildAdminGrantedEmail", () => {
  const email = buildAdminGrantedEmail({ invitedEmail: "existing@example.com" });

  it("announces granted access", () => {
    expect(email.subject).toContain("admin access");
    expect(email.html).toContain("OPEN THE ADMIN AREA");
    expect(email.html).toContain("https://meekmeet.com/dashboard/admin");
    expect(email.html).toContain("existing@example.com");
  });

  it("escapes HTML in the email address", () => {
    const evil = buildAdminGrantedEmail({ invitedEmail: "a<img>@example.com" });
    expect(evil.html).not.toContain("<img>");
  });
});
