import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isMasterEmail } from "@/lib/master-admin";
import { buildDeficitMatrix } from "@/lib/deficit-matrix";
import { KeyRound, ArrowRight } from "lucide-react";

// The Gate — the deficit→virtue matrix. MASTER ADMIN ONLY.
// Regular admins are redirected; the gate is the platform's internal grammar
// for how questions are authored and how answers aggregate toward virtue.

export const dynamic = "force-dynamic";

const TRADITION_LABELS: Record<string, string> = {
  buddhism: "Buddhism",
  islam: "Islam",
  judaism: "Judaism",
  hinduism: "Hinduism",
  sikhism: "Sikhism",
  classical: "Classical",
};

export default async function DeficitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isMasterEmail(user.email)) redirect("/dashboard/admin");

  const [{ data: handbooks }, { data: swaps }] = await Promise.all([
    supabase.from("session_handbooks").select("responses"),
    supabase.from("handbook_question_swaps").select("old_question_id"),
  ]);

  const matrix = buildDeficitMatrix(handbooks ?? [], swaps ?? []);
  const totalDrawn = matrix.reduce((s, r) => s + r.drawn, 0);
  const totalAnswered = matrix.reduce((s, r) => s + r.answered, 0);
  const totalSentBack = matrix.reduce((s, r) => s + r.sentBack, 0);

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-2">
        <KeyRound className="w-5 h-5 text-terracotta" strokeWidth={1.5} />
        <span className="text-xs tracking-[0.3em] uppercase text-terracotta font-medium">
          The Gate · Master admin only
        </span>
      </div>
      <h1 className="font-serif text-3xl text-charcoal mb-3">Deficit → Virtue</h1>
      <p className="text-sm text-charcoal-muted leading-relaxed mb-2 max-w-2xl">
        Every question in the circle bank is authored from a root deficit and opens toward
        its virtue pole. Members never see this layer — the question never names the sin,
        the data reveals it. This page is the internal grammar: what each deficit is, what
        every tradition calls it, what it heals into, and how the community&rsquo;s answers
        are moving.
      </p>
      <p className="text-xs text-faint mb-8 max-w-2xl">
        Two families, one gate. <strong>The Seven</strong> hold a person back;{" "}
        <strong>The Five</strong> hold a people back — the threshold family, drawn into
        every handbook on every day. The bank is mathematically balanced (12 questions per
        personal deficit, 4 per societal deficit, every day-topic touching all seven) and
        the balance is enforced by test — no question ships without passing the gate.
      </p>

      {/* The running totals */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { label: "Questions drawn", value: totalDrawn },
          { label: "Answered in writing", value: totalAnswered },
          { label: "Sent back for another", value: totalSentBack },
        ].map((s) => (
          <div key={s.label} className="bg-cream-warm border border-border-soft rounded-xl p-4 text-center">
            <p className="font-serif text-2xl text-charcoal">{s.value}</p>
            <p className="text-xs text-charcoal-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {(
        [
          {
            kind: "personal" as const,
            title: "The Seven — what holds a person back",
            note: "The root deficits of the soul, in every tradition's tongue. The day-topics draw from these.",
          },
          {
            kind: "societal" as const,
            title: "The Five — what holds a people back",
            note: "The threshold family: the brakes on human progress. One threshold question crosses into every handbook, every day.",
          },
        ]
      ).map((section) => (
        <div key={section.kind} className="mb-10">
          <h2 className="font-serif text-2xl text-charcoal mb-1">{section.title}</h2>
          <p className="text-xs text-charcoal-muted mb-5">{section.note}</p>
          <div className="space-y-6">
            {matrix
              .filter((row) => row.deficit.kind === section.kind)
              .map(({ deficit, inBank, drawn, answered, sentBack, answerRate }) => (
          <div key={deficit.id} className="bg-cream-warm border border-border-soft rounded-2xl p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <h2 className="font-serif text-xl text-charcoal">
                {deficit.name}
                <span className="text-sm text-charcoal-muted font-sans ml-3">
                  {inBank} questions in the bank
                </span>
              </h2>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-charcoal-muted">{drawn} drawn</span>
                <span className="text-faint">·</span>
                <span className="text-sage-dark">{answered} answered</span>
                <span className="text-faint">·</span>
                <span className="text-terracotta">{sentBack} sent back</span>
                {answerRate !== null && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-parchment border border-border-warm text-xs text-charcoal">
                    {Math.round(answerRate * 100)}% answered
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm text-charcoal-muted leading-relaxed mb-4">{deficit.essence}</p>

            <div className="flex items-center gap-2 mb-4 text-sm">
              <span className="px-3 py-1 rounded-full bg-terracotta-pale text-terracotta text-xs font-medium">
                {deficit.name}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-faint" strokeWidth={1.5} />
              <span className="px-3 py-1 rounded-full bg-sage/15 text-sage-dark text-xs font-medium">
                {deficit.virtue.name}
              </span>
            </div>
            <p className="text-xs text-charcoal-muted leading-relaxed mb-4 italic">
              {deficit.virtue.essence}
            </p>

            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1.5 border-t border-border-soft pt-4">
              {Object.entries(deficit.parallels).map(([tradition, text]) => (
                <p key={tradition} className="text-xs text-charcoal-muted leading-relaxed">
                  <span className="text-charcoal font-medium">{TRADITION_LABELS[tradition]}:</span>{" "}
                  {text}
                  <span className="text-faint"> → {deficit.virtue.parallels[tradition as keyof typeof deficit.virtue.parallels]}</span>
                </p>
              ))}
                </div>
              </div>
              ))}
          </div>
        </div>
      ))}

      <p className="mt-10 text-xs text-faint leading-relaxed max-w-2xl">
        How to read this: the draw is random, so over time &ldquo;drawn&rdquo; evens out —
        what diverges is <em>answered</em> vs <em>sent back</em>. A deficit whose questions
        are answered at a high rate is one this community is ready to speak about; a deficit
        whose questions keep getting sent back is one the street is not ready to name aloud —
        which is itself the finding. That ratio, per circle and per region, is what the
        anonymised reports carry toward the virtue poles.
      </p>
    </div>
  );
}
