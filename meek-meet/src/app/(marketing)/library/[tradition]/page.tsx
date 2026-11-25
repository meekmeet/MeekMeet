import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { SACRED_LIBRARY, getLibraryEntry, getTraditionMeta } from "@/lib/library";

export function generateStaticParams() {
  return SACRED_LIBRARY.map((entry) => ({ tradition: entry.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tradition: string }>;
}): Promise<Metadata> {
  const { tradition } = await params;
  const entry = getLibraryEntry(tradition);
  if (!entry) return { title: "The Sacred Library — Meek Meet" };
  return {
    title: `${entry.name} — The Sacred Library — Meek Meet`,
    description: entry.description,
  };
}

export default async function TraditionPage({
  params,
}: {
  params: Promise<{ tradition: string }>;
}) {
  const { tradition } = await params;
  const entry = getLibraryEntry(tradition);
  if (!entry) notFound();
  const meta = getTraditionMeta(entry.id);

  return (
    <main className="min-h-screen bg-cream">
      <section className="pt-36 pb-12 px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/library"
            className="inline-flex items-center gap-2 text-sm text-charcoal-muted hover:text-terracotta transition-colors mb-10"
          >
            <ArrowLeft className="w-4 h-4" />
            The Sacred Library
          </Link>
          <p className="text-xs tracking-[0.3em] uppercase text-terracotta mb-4 font-medium">
            {entry.era} · {entry.origin}
          </p>
          <h1 className="font-serif text-4xl md:text-5xl text-charcoal mb-6 leading-tight">
            {entry.name}
          </h1>
          <p className="text-lg text-charcoal-muted leading-relaxed mb-8">
            {entry.description}
          </p>
          <div className="bg-parchment border-l-4 border-terracotta rounded-r-xl p-6">
            <h2 className="text-xs tracking-[0.2em] uppercase text-terracotta mb-3 font-medium">
              Why it matters
            </h2>
            <p className="text-charcoal leading-relaxed">{entry.whyItMatters}</p>
          </div>
          <p className="text-sm text-charcoal-muted mt-6 italic">
            {meta.translation}. {meta.note}
          </p>
        </div>
      </section>

      <section className="pb-24 px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xs tracking-[0.2em] uppercase text-charcoal-muted mb-6 font-medium">
            Begin reading
          </h2>
          <div className="space-y-4">
            {entry.books.map((book) => (
              <Link
                key={book.id}
                href={`/library/${entry.id}/${book.id}`}
                className="group flex items-start gap-5 bg-parchment border border-border-warm rounded-2xl p-6 hover:border-terracotta/50 hover:shadow-md transition-all duration-300"
              >
                <BookOpen
                  className="w-5 h-5 text-terracotta mt-1 shrink-0"
                  strokeWidth={1.5}
                />
                <div className="flex-1">
                  <h3 className="font-serif text-xl text-charcoal mb-1 group-hover:text-terracotta transition-colors">
                    {book.name}
                  </h3>
                  <p className="text-sm text-charcoal-muted leading-relaxed">
                    {book.note}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-charcoal-muted group-hover:text-terracotta group-hover:translate-x-1 transition-all mt-1 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
