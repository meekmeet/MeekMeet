import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Code of Love — Meek Meet",
  description:
    "The covenant every Meek Meet member keeps: how we listen, speak, and care for one another in circle.",
};

const pledges = [
  {
    title: "We listen first",
    body: "Every person in the circle is heard before anyone is answered. We listen to understand, not to reply — quick to listen, slow to speak.",
  },
  {
    title: "We speak gently and truthfully",
    body: "Honesty without cruelty. We share our own experience — \"I feel\", \"I have seen\" — rather than pronouncing judgement on others.",
  },
  {
    title: "What is shared in circle stays in circle",
    body: "Personal stories belong to the person who shared them. We never repeat another member's words outside the circle without their blessing. Reports that leave the circle are always anonymised.",
  },
  {
    title: "Every faith is a guest of honour",
    body: "Christian is the spark, and the table is set for everyone — every faith and none. We do not proselytise in circle, and we do not mock. We ask, we learn, we honour.",
  },
  {
    title: "The meek go first",
    body: "The quietest voice in the room carries the most weight here. We make space for those who find speaking hard, and we never mistake volume for wisdom.",
  },
  {
    title: "We keep each other safe",
    body: "No harassment, no hate, no pressure. Safeguarding concerns are raised immediately with the shepherd or through the platform's reporting tools. Children and vulnerable people are protected above all else.",
  },
  {
    title: "We show up",
    body: "A circle is a promise made monthly. We come as we are, on time, prepared to give what we can — presence, attention, and patience.",
  },
  {
    title: "We carry it home",
    body: "What we practise in circle — gentleness, unity, courage — we practise on our streets. The circle ends; the love does not.",
  },
];

export default function CodeOfLovePage() {
  return (
    <main className="min-h-screen pt-28 pb-20 bg-cream">
      <div className="max-w-3xl mx-auto px-6 lg:px-8">
        <span className="text-xs tracking-[0.3em] uppercase text-terracotta mb-4 block font-medium">
          Our Covenant
        </span>
        <h1 className="font-serif text-4xl md:text-5xl text-charcoal mb-6">
          The Code of Love
        </h1>
        <p className="text-lg text-charcoal-muted leading-relaxed mb-4">
          Meek Meet runs on one covenant. It is short enough to memorise and
          serious enough to sign your name to. When you join a circle, this is
          what you are agreeing to — alongside our{" "}
          <a href="/terms" className="text-terracotta hover:underline">
            Terms of Service
          </a>
          .
        </p>
        <p className="font-script text-2xl text-wheat-dark/70 mb-12">
          &ldquo;Love is patient, love is kind... it always protects, always
          trusts, always hopes, always perseveres.&rdquo; — 1 Corinthians 13
        </p>

        <div className="space-y-8">
          {pledges.map((pledge, i) => (
            <div
              key={pledge.title}
              className="bg-cream-warm rounded-2xl border border-border-soft p-7"
            >
              <h2 className="font-serif text-2xl text-charcoal mb-3">
                {i + 1}. {pledge.title}
              </h2>
              <p className="text-charcoal-muted leading-relaxed">{pledge.body}</p>
            </div>
          ))}
        </div>

        <p className="text-sm text-charcoal-muted mt-12 leading-relaxed">
          Breaches of this covenant are handled gently but seriously — first in
          conversation with your shepherd, and where safety is at stake,
          immediately through our{" "}
          <a href="/child-safety" className="text-terracotta hover:underline">
            safeguarding channels
          </a>
          . Questions?{" "}
          <a href="mailto:hello@meekmeet.com" className="text-terracotta hover:underline">
            hello@meekmeet.com
          </a>
        </p>
      </div>
    </main>
  );
}
