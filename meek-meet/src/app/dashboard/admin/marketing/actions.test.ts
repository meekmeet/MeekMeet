import { describe, it, expect, vi, beforeEach } from "vitest";
import { MockSupabaseClient, makeAuthUser } from "@/test/mock-supabase";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/audit", () => ({ auditEvent: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/resend", () => ({
  getResend: vi.fn(() => ({ emails: { send: sendMock } })),
}));

import { createClient } from "@/lib/supabase/server";
import {
  sendPersonInvite,
  sendOrganisationFlyer,
  getMarketingHistory,
  previewMarketingTemplate,
  previewDripSequence,
  getMarketingTemplates,
} from "./actions";

const mockSupa = new MockSupabaseClient();
const admin = makeAuthUser();

function asAdmin() {
  mockSupa.asUser(admin);
  mockSupa.enqueue({ id: admin.id, role: "admin" });
}

function asNonAdmin() {
  mockSupa.asUser(admin);
  mockSupa.enqueue({ id: admin.id, role: "member" });
}

beforeEach(() => {
  vi.clearAllMocks();
  sendMock.mockReset().mockResolvedValue({ id: "email-1" });
  mockSupa.results.length = 0;
  mockSupa.tables.length = 0;
  vi.mocked(createClient).mockResolvedValue(mockSupa as never);
});

describe("marketing actions", () => {
  it("rejects invalid recipient emails before any work", async () => {
    await expect(
      sendPersonInvite({ recipientEmail: "nope", templateKey: "invite_vision" })
    ).rejects.toThrow("Invalid email address");
    expect(mockSupa.auth.getUser).not.toHaveBeenCalled();
  });

  it("rejects unknown templates", async () => {
    await expect(
      sendPersonInvite({ recipientEmail: "a@b.co", templateKey: "nope" })
    ).rejects.toThrow("Choose a valid invitation template");
  });

  it("rejects org templates for person invites", async () => {
    await expect(
      sendPersonInvite({ recipientEmail: "a@b.co", templateKey: "org_partnership" })
    ).rejects.toThrow("Choose a valid invitation template");
  });

  it("throws for non-admins", async () => {
    asNonAdmin();
    await expect(
      sendPersonInvite({ recipientEmail: "a@b.co", templateKey: "invite_vision" })
    ).rejects.toThrow("Not authorized");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("sends a person invite and logs it with a tracked CTA", async () => {
    asAdmin();
    mockSupa.enqueue({ id: "send-42" }); // log insert returns the send id
    mockSupa.enqueue(null); // status update
    const result = await sendPersonInvite({
      recipientEmail: "sam@example.com",
      recipientName: "Sam",
      templateKey: "invite_vision",
    });
    expect(result).toEqual({ success: true, template: "The Vision" });
    const sent = sendMock.mock.calls[0][0];
    expect(sent.to).toBe("sam@example.com");
    expect(sent.html).toContain("Dear Sam");
    expect(sent.html).toContain("Blessed are the meek, for they shall inherit the earth");
    // The CTA carries the tracked redirect with this send's id.
    expect(sent.html).toContain("/api/t?");
    expect(sent.html).toContain("s=send-42");
    expect(sent.html).toContain("tpl=invite_vision");
    expect(mockSupa.tables[1]).toBe("marketing_sends");
    expect(mockSupa.tables[2]).toBe("marketing_sends");
  });

  it("passes the selected theme through to the send and the log", async () => {
    asAdmin();
    mockSupa.enqueue({ id: "send-43" });
    mockSupa.enqueue(null);
    await sendPersonInvite({
      recipientEmail: "sam@example.com",
      templateKey: "invite_circle",
      theme: "midnight",
    });
    const sent = sendMock.mock.calls[0][0];
    expect(sent.html).toContain("#171d30"); // midnight card colour
    expect(sent.html).toContain("t=midnight");
  });

  it("defaults invalid themes to parchment", async () => {
    asAdmin();
    mockSupa.enqueue({ id: "send-44" });
    mockSupa.enqueue(null);
    await sendPersonInvite({
      recipientEmail: "sam@example.com",
      templateKey: "invite_circle",
      theme: "neon",
    });
    const sent = sendMock.mock.calls[0][0];
    expect(sent.html).toContain("t=parchment");
  });

  it("logs and reports failures, updating the pending row to failed", async () => {
    asAdmin();
    mockSupa.enqueue({ id: "send-45" }); // log insert
    mockSupa.enqueue(null); // failed status update
    sendMock.mockRejectedValueOnce(new Error("smtp down"));
    await expect(
      sendPersonInvite({ recipientEmail: "sam@example.com", templateKey: "invite_circle" })
    ).rejects.toThrow("Email failed to send: smtp down");
    expect(mockSupa.from).toHaveBeenCalledWith("marketing_sends");
  });

  it("throws when the log insert fails and never sends", async () => {
    asAdmin();
    mockSupa.enqueue(null, { message: "rls violation" });
    await expect(
      sendPersonInvite({ recipientEmail: "sam@example.com", templateKey: "invite_circle" })
    ).rejects.toThrow("rls violation");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("sends an org flyer with SVG + QR attachments and logs it", async () => {
    asAdmin();
    mockSupa.enqueue({ id: "send-46" }); // log insert
    mockSupa.enqueue(null); // status update
    const result = await sendOrganisationFlyer({
      orgName: "St Marks Anglican",
      contactEmail: "office@stmarks.example",
      contactName: "Rector Jo",
    });
    expect(result).toEqual({ success: true, org: "St Marks Anglican" });
    const sent = sendMock.mock.calls[0][0];
    expect(sent.to).toBe("office@stmarks.example");
    expect(sent.html).toContain("St Marks Anglican");
    expect(sent.subject).toContain("proposal");
    expect(sent.html).toContain("council");
    const filenames = sent.attachments.map((a: { filename: string }) => a.filename);
    expect(filenames).toContain("meek-meet-flyer.svg");
    expect(filenames).toContain("meek-meet-qr.png");
    const svg = Buffer.from(
      sent.attachments.find((a: { filename: string }) => a.filename === "meek-meet-flyer.svg").content,
      "base64"
    ).toString("utf-8");
    expect(svg).toContain("St Marks Anglican");
    expect(svg).toContain("meekmeet.com/circles");
  });

  it("sends the org proposal in the selected theme with an org accent", async () => {
    asAdmin();
    mockSupa.enqueue({ id: "send-47" });
    mockSupa.enqueue(null);
    await sendOrganisationFlyer({
      orgName: "St Marks Anglican",
      contactEmail: "office@stmarks.example",
      theme: "midnight",
    });
    const sent = sendMock.mock.calls[0][0];
    expect(sent.html).toContain("#171d30"); // midnight chrome
    expect(sent.subject).toContain("second letter");
    expect(sent.html).toContain("To the leaders of St Marks Anglican,");
    // The proposal letter's CTA is the reply; tracking rides the flyer QR.
    const svg = Buffer.from(
      sent.attachments.find((a: { filename: string }) => a.filename === "meek-meet-flyer.svg").content,
      "base64"
    ).toString("utf-8");
    expect(svg).toContain("St Marks Anglican");
  });

  it("requires org name and valid contact email for flyers", async () => {
    await expect(
      sendOrganisationFlyer({ orgName: "", contactEmail: "office@x.example" })
    ).rejects.toThrow("Organisation is required");
    await expect(
      sendOrganisationFlyer({ orgName: "Church", contactEmail: "nope" })
    ).rejects.toThrow("Invalid contact email");
  });

  it("returns history for admins", async () => {
    asAdmin();
    mockSupa.enqueue([{ id: "m1", kind: "person_invite", recipient_email: "sam@example.com" }]);
    const history = await getMarketingHistory();
    expect(history).toHaveLength(1);
    expect(mockSupa.tables[1]).toBe("marketing_sends");
  });

  it("throws history errors", async () => {
    asAdmin();
    mockSupa.enqueue(null, { message: "db error" });
    await expect(getMarketingHistory()).rejects.toThrow("db error");
  });

  it("previews templates with and without a name", async () => {
    const withName = await previewMarketingTemplate("invite_vision", "Sam");
    expect(withName.html).toContain("Blessed are the meek");
    expect(withName.html).toContain("Dear Sam");
    const without = await previewMarketingTemplate("invite_vision");
    expect(without.html).not.toContain("Dear friend");
    expect(without.html).toContain("Blessed are the meek");
    await expect(previewMarketingTemplate("nope")).rejects.toThrow("Unknown template");
  });

  it("previews the org letter in the selected faith", async () => {
    const islamic = await previewMarketingTemplate("org_partnership", undefined, "Coast Mosque", "parchment", "islamic");
    expect(islamic.html).toContain("Qur'an 49:13");
    // The spark shines through every pitch — the islamic body names the
    // saying of Isa openly, as a bridge, not a concealment.
    expect(islamic.html.split("<!-- Footer -->")[0]).toContain("the meek shall inherit the earth");
    const jewish = await previewMarketingTemplate("org_partnership", undefined, "Shul", "parchment", "jewish");
    expect(jewish.html).toContain("Pirkei Avot");
    expect(jewish.subject.toLowerCase()).toContain("proposition");
  });

  it("previews the full drip ladder — every step in its real theme", async () => {
    const steps = await previewDripSequence({ kind: "person", templateKey: "invite_vision", recipientName: "Sam" });
    expect(steps).toHaveLength(3);
    expect(steps.map((s) => s.theme)).toEqual(["parchment", "midnight", "terracotta"]);
    expect(steps.map((s) => s.delayDays)).toEqual([0, 7, 14]);
    expect(steps[0].when).toBe("now");
    expect(steps[1].when).toBe("day 7");
    expect(steps[2].when).toBe("day 14");
    // Each step is a genuinely different escalation, not a re-skin.
    expect(steps[0].subject).not.toBe(steps[1].subject);
    expect(steps[1].html).not.toBe(steps[2].html);
    expect(steps[0].html).toContain("Dear Sam");
    // No flyer on person steps.
    expect(steps.every((s) => s.flyerSvg === undefined)).toBe(true);
    await expect(
      previewDripSequence({ kind: "person", templateKey: "nope" })
    ).rejects.toThrow("Choose a valid invitation template");
  });

  it("previews the org drip ladder with a flyer attachment per step, faith-aware", async () => {
    const steps = await previewDripSequence({
      kind: "org",
      orgName: "Coast Mosque",
      recipientName: "Imam",
      faith: "islamic",
    });
    expect(steps).toHaveLength(3);
    for (const s of steps) {
      expect(s.flyerSvg).toBeTruthy();
      expect(s.flyerSvg).toContain("Coast Mosque");
      expect(s.flyerSvg).toContain("49:13");
      expect(s.html).not.toContain("Dear friend");
    }
    // Org steps open with the org_partnership letter regardless of templateKey.
    expect(steps[0].subject.toLowerCase()).toContain("coast mosque");
    // Flyers escalate themes with the ladder.
    expect(steps[0].flyerSvg).not.toBe(steps[1].flyerSvg);
  });

  it("exposes template metadata for the picker", async () => {
    const templates = await getMarketingTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(4);
    expect(templates.every((t) => t.key && t.name && t.description)).toBe(true);
  });
});
