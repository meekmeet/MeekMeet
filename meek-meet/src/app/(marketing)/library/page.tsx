import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { SACRED_LIBRARY } from "@/lib/library";

export const metadata: Metadata = {
  title: "The Sacred Library — Meek Meet",
  description:
    "The lesser-known scriptures of the world's great traditions — the Dead Sea Scrolls, Nag Hammadi, the Apocrypha, the Upanishads, the Tao Te Ching and more — free to read, for everyone.",
};

export default function LibraryPage() {
  const totalBooks = SACRED_LIBRARY.reduce((n, e) => n + e.books.length, 0);

  return (
    <main className="min-h-screen bg-cream">
      {/* Hero */}
      <section className="pt-36 pb-16 px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs tracking-[0.3em] uppercase text-terracotta mb-6 font-medium">
            Free for everyone
          </p>
          <h1 className="font-serif text-5xl md:text-6xl text-charcoal mb-6 leading-tight">
            The Sacred Library
          </h1>
          <p className="text-lg text-charcoal-muted leading-relaxed max-w-2xl mx-auto">
            The texts that rarely survive the editing of the mainstream canon —
            scrolls hidden in caves, gospels buried to save them from burning,
            hymns older than empires. {SACRED_LIBRARY.length} collections,{" "}
            {totalBooks} works, gathered here so that anyone, on any phone, can
            read what the world almost forgot.
          </p>
        </div>
      </section>

      {/* Collections */}
      <section className="pb-24 px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-2 gap-4 sm:gap-6">
          {SACRED_LIBRARY.map((entry) => (
            <Link
              key={entry.id}
              href={`/library/${entry.id}`}
              className="group bg-parchment border border-border-warm rounded-2xl p-5 sm:p-8 hover:border-terracotta/50 hover:shadow-lg transition-all duration-300 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <BookOpen
                  className="w-5 h-5 sm:w-6 sm:h-6 text-terracotta"
                  strokeWidth={1.5}
                />
                <span className="text-xs tracking-wider text-charcoal-muted">
                  {entry.era}
                </span>
              </div>
              <h2 className="font-serif text-xl sm:text-2xl text-charcoal mb-1 group-hover:text-terracotta transition-colors">
                {entry.name}
              </h2>
              <p className="text-xs tracking-wide text-charcoal-muted mb-3 sm:mb-4">
                {entry.origin}
              </p>
              <p className="text-sm text-charcoal-muted leading-relaxed mb-4 sm:mb-6 flex-1 line-clamp-3 sm:line-clamp-none">
                {entry.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-charcoal-muted">
                  {entry.books.length}{" "}
                  {entry.books.length === 1 ? "work" : "works"} to read
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm text-terracotta font-medium">
                  Open
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Closing note */}
      <section className="pb-24 px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center border-t border-border-warm pt-12">
          <p className="font-script text-2xl text-wheat-dark/60 leading-relaxed">
            &ldquo;The earth is but one country, and mankind its citizens.&rdquo;
          </p>
          <p className="text-xs text-charcoal-muted mt-3 tracking-wide">
            — Bahá&apos;u&apos;lláh
          </p>
          <p className="text-sm text-charcoal-muted mt-8 leading-relaxed">
            Every passage here is drawn from public-domain translations and
            clearly sourced. These are selected excerpts, curated with care —
            an open door, not the whole house.
          </p>
        </div>
      </section>
    </main>
  );
}
