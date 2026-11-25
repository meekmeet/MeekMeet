import { describe, it, expect, vi, afterEach } from "vitest";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock("@/lib/resend", () => ({
  getResend: vi.fn(() => ({ emails: { send: sendMock } })),
}));

import { DRIP_STEPS, stepForIndex, openerTemplateFor, sendSequenceStep } from "./drip";
import { MARKETING_TEMPLATES } from "@/lib/emails/marketing";

afterEach(() => {
  vi.clearAllMocks();
  sendMock.mockReset().mockResolvedValue({ id: "email-1" });
});

describe("DRIP_STEPS", () => {
  it("ladders parchment → midnight → terracotta over 0/7/14 days", () => {
    expect(DRIP_STEPS.map((s) => s.theme)).toEqual(["parchment", "midnight", "terracotta"]);
    expect(DRIP_STEPS.map((s) => s.delayDays)).toEqual([0, 7, 14]);
    expect(DRIP_STEPS.map((s) => s.step)).toEqual([1, 2, 3]);
  });

  it("clamps out-of-range step indexes", () => {
    expect(stepForIndex(-1).theme).toBe("parchment");
    expect(stepForIndex(99).theme).toBe("terracotta");
  });
});

describe("openerTemplateFor", () => {
  it("always uses the org proposal for organisations", () => {
    expect(openerTemplateFor("anyone@example.com", "org")).toBe("org_partnership");
  });

  it("rotates person openers deterministically", () => {
    const a = openerTemplateFor("sam@example.com", "person");
    expect(a === "invite_vision" || a === "invite_circle").toBe(true);
    expect(openerTemplateFor("sam@example.com", "person")).toBe(a); // deterministic
    expect(openerTemplateFor("SAM@example.com", "person")).toBe(a); // case-insensitive
  });

  it("produces both openers across a spread of emails", () => {
    const openers = new Set(
      Array.from({ length: 20 }, (_, i) => openerTemplateFor(`person${i}@example.com`, "person"))
    );
    expect(openers.size).toBe(2);
  });
});

function makeService(queue: Array<{ data: unknown; error: unknown }>) {
  const updates: { table: string; values: Record<string, unknown>; eq: Record<string, unknown> }[] = [];
  const inserts: { table: string; row: Record<string, unknown> }[] = [];
  const client = {
    from: vi.fn((table: string) => {
      const chain: Record<string, unknown> = {};
      const next = {
        insert: (row: Record<string, unknown>) => {
          inserts.push({ table, row });
          return {
            select: () => ({ single: () => Promise.resolve(queue.shift() ?? { data: { id: "send-1" }, error: null }) }),
          };
        },
        update: (values: Record<string, unknown>) => {
          updates.push({ table, values, eq: {} });
          return { eq: () => ({ eq: () => Promise.resolve({ error: null }) }) };
        },
        select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
      };
          return next;
    }),
  };
  return { client, updates, inserts };
}

describe("sendSequenceStep", () => {
  const sequence = {
    id: "seq-1",
    kind: "person" as const,
    recipient_email: "sam@example.com",
    recipient_name: "Sam",
    org_name: null,
    contact_name: null,
    template_key: "invite_vision",
    current_step: 0,
  };

  it("sends step 1 in parchment and schedules step 2 seven days out", async () => {
    const { client, updates, inserts } = makeService([]);
    const before = Date.now();
    const outcome = await sendSequenceStep(client as never, sequence);

    expect(outcome).toMatchObject({ sent: true, step: 1, theme: "parchment" });
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(inserts[0].table).toBe("marketing_sends");
    expect(inserts[0].row).toMatchObject({ sequence_id: "seq-1", step: 1, theme: "parchment", status: "pending" });

    const seqUpdate = updates.find((u) => u.table === "marketing_sequences");
    expect(seqUpdate?.values.current_step).toBe(1);
    const nextRun = Date.parse(String(seqUpdate?.values.next_run_at));
    expect(nextRun - before).toBeGreaterThan(6 * 24 * 3600 * 1000);
    expect(nextRun - before).toBeLessThan(8 * 24 * 3600 * 1000);
  });

  it("completes after step 3", async () => {
    const { client, updates } = makeService([]);
    const outcome = await sendSequenceStep(client as never, { ...sequence, current_step: 2 });
    expect(outcome.step).toBe(3);
    expect(outcome.theme).toBe("terracotta");
    const seqUpdate = updates.find((u) => u.table === "marketing_sequences");
    expect(seqUpdate?.values.status).toBe("completed");
  });

  it("marks failed sends and still advances the ladder", async () => {
    sendMock.mockRejectedValueOnce(new Error("smtp down"));
    const { client, updates } = makeService([]);
    const outcome = await sendSequenceStep(client as never, sequence);
    expect(outcome.sent).toBe(false);
    expect(outcome.error).toBe("smtp down");
    const sendUpdate = updates.find((u) => u.table === "marketing_sends");
    expect(sendUpdate?.values.status).toBe("failed");
  });

  it("throws when the template is missing", async () => {
    const { client } = makeService([]);
    await expect(
      sendSequenceStep(client as never, { ...sequence, template_key: "nope" })
    ).rejects.toThrow("Sequence template missing");
  });

  it("walks a full ladder: parchment → midnight → terracotta → completed", async () => {
    const themes: string[] = [];
    const colors: string[] = [];
    const subjects: string[] = [];
    let current: typeof sequence = sequence;
    let guard = 0;

    while (guard++ < 5) {
      const { client, updates } = makeService([]);
      const outcome = await sendSequenceStep(client as never, current);
      themes.push(outcome.theme);
      const call = sendMock.mock.calls[sendMock.mock.calls.length - 1][0];
      colors.push(call.html);
      subjects.push(call.subject);
      current = { ...current, current_step: outcome.step };

      const seqUpdate = updates.find((u) => u.table === "marketing_sequences");
      if (seqUpdate?.values.status === "completed") break;
    }

    expect(themes).toEqual(["parchment", "midnight", "terracotta"]);
    // The visual identity escalates each step.
    expect(colors[0]).toContain("#faf6ee");
    expect(colors[1]).toContain("#171d30");
    expect(colors[2]).toContain("#fff8f2");
    // AND the pitch escalates — three different emails, not one re-skinned.
    expect(subjects[0]).toBe("Someone on your street hasn't been asked — until now");
    expect(subjects[1]).toBe("We wrote to you once. Here's what silence costs.");
    expect(subjects[2]).toBe("The last note we'll send");
    expect(new Set(subjects).size).toBe(3);
  });

  it("every pitch is free of template leakage and stray braces", async () => {
    for (const template of MARKETING_TEMPLATES) {
      for (const theme of ["parchment", "midnight", "terracotta"] as const) {
        const { html, subject } = template.build({
          theme,
          recipientName: "Sam",
          orgName: "St Marks",
        });
        // No un-interpolated template expressions or stray braces in output.
        expect(html).not.toContain("${");
        expect(subject).not.toContain("${");
        const text = html.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");
        expect(text).not.toMatch(/(^|\s)\}(\s|$)/);
        expect(text).not.toMatch(/(^|\s)\{(\s|$)/);
        // The theme's identity is actually applied.
        expect(html).toContain(
          theme === "midnight" ? "#171d30" : theme === "terracotta" ? "#fff8f2" : "#faf6ee"
        );
        // Personalisation landed, escaped.
        expect(html).toContain("Sam");
      }
    }
  });

  it("carries a tracked CTA with the send id in every drip step", async () => {
    const { client } = makeService([]);
    await sendSequenceStep(client as never, sequence);
    const html = sendMock.mock.calls[0][0].html as string;
    expect(html).toMatch(/\/api\/t\?[^"']*s=send-1/);
    expect(html).toContain("tpl=invite_vision");
  });
});
