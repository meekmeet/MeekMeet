import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  SACRED_LIBRARY,
  getLibraryEntry,
  getBook,
  chapterNumbers,
  isSourceLine,
  stripSourceBrackets,
} from "@/lib/library";

interface PageParams {
  params: Promise<{ tradition: string; book: string }>;
}

export function generateStaticParams() {
  return SACRED_LIBRARY.flatMap((entry) =>
    entry.books.map((b) => ({ tradition: entry.id, book: b.id }))
  );
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { tradition, book } = await params;
  const entry = getLibraryEntry(tradition);
  const bookMeta = entry?.books.find((b) => b.id === book);
  if (!entry || !bookMeta) return { title: "The Sacred Library — Meek Meet" };
  return {
    title: `${bookMeta.name} — ${entry.name} — Meek Meet`,
    description: bookMeta.note,
  };
}

export default async function BookReaderPage({ params }: PageParams) {
  const { tradition, book } = await params;
  const entry = getLibraryEntry(tradition);
  const bookMeta = entry?.books.find((b) => b.id === book);
  if (!entry || !bookMeta) notFound();

  const text = getBook(entry.id, bookMeta.id);
  const chapters = chapterNumbers(text);

  const bookIndex = entry.books.findIndex((b) => b.id === bookMeta.id);
  const prevBook = bookIndex > 0 ? entry.books[bookIndex - 1] : null;
  const nextBook = bookIndex < entry.books.length - 1 ? entry.books[bookIndex + 1] : null;

  return (
    <main className="min-h-screen bg-cream">
      <article className="pt-36 pb-24 px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <Link
            href={`/library/${entry.id}`}
            className="inline-flex items-center gap-2 text-sm text-charcoal-muted hover:text-terracotta transition-colors mb-10"
          >
            <ArrowLeft className="w-4 h-4" />
            {entry.name}
          </Link>

          <header className="mb-14 text-center">
            <p className="text-xs tracking-[0.3em] uppercase text-terracotta mb-4 font-medium">
              {entry.name}
            </p>
            <h1 className="font-serif text-4xl md:text-5xl text-charcoal leading-tight mb-4">
              {bookMeta.name}
            </h1>
            <p className="text-sm text-charcoal-muted leading-relaxed max-w-xl mx-auto">
              {bookMeta.note}
            </p>
          </header>

          {chapters.map((chapter) => (
            <section key={chapter} className="mb-12">
              {chapters.length > 1 && (
                <p className="text-xs tracking-[0.25em] uppercase text-charcoal-muted text-center mb-8">
                  {chapter}
                </p>
              )}
              {text.chapters[chapter].map((paragraph, i) =>
                isSourceLine(paragraph) ? (
                  <h2
                    key={i}
                    className="font-serif text-xl text-terracotta text-center mt-10 mb-5"
                  >
                    {stripSourceBrackets(paragraph)}
                  </h2>
                ) : (
                  <p
                    key={i}
                    className="font-serif text-lg text-charcoal leading-[1.9] mb-5"
                  >
                    {paragraph}
                  </p>
                )
              )}
            </section>
          ))}

          <footer className="mt-16 pt-10 border-t border-border-warm">
            <p className="text-xs text-charcoal-muted text-center mb-10 leading-relaxed">
              Selected excerpts from public-domain translations, curated for the
              Meek Meet Sacred Library. An open door, not the whole house.
            </p>
            <div className="flex items-stretch justify-between gap-4">
              {prevBook ? (
                <Link
                  href={`/library/${entry.id}/${prevBook.id}`}
                  className="group flex-1 bg-parchment border border-border-warm rounded-xl p-4 hover:border-terracotta/50 transition-colors"
                >
                  <span className="flex items-center gap-1.5 text-xs text-charcoal-muted mb-1">
                    <ArrowLeft className="w-3 h-3" /> Previous
                  </span>
                  <span className="font-serif text-sm text-charcoal group-hover:text-terracotta transition-colors">
                    {prevBook.name}
                  </span>
                </Link>
              ) : (
                <div className="flex-1" />
              )}
              {nextBook ? (
                <Link
                  href={`/library/${entry.id}/${nextBook.id}`}
                  className="group flex-1 bg-parchment border border-border-warm rounded-xl p-4 text-right hover:border-terracotta/50 transition-colors"
                >
                  <span className="flex items-center justify-end gap-1.5 text-xs text-charcoal-muted mb-1">
                    Next <ArrowRight className="w-3 h-3" />
                  </span>
                  <span className="font-serif text-sm text-charcoal group-hover:text-terracotta transition-colors">
                    {nextBook.name}
                  </span>
                </Link>
              ) : (
                <div className="flex-1" />
              )}
            </div>
          </footer>
        </div>
      </article>
    </main>
  );
}
