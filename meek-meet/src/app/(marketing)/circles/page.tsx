import { Globe, Video, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getActiveCircles } from "@/lib/public-data";
import CircleCard from "../_components/circle-card";
import SearchForm from "./_components/search-form";

export const metadata = {
  title: "Find Your Circle | Meek Meet",
};

interface Props {
  searchParams: Promise<{ q?: string; location?: string }>;
}

// Sanitize search input to prevent injection and limit length
function sanitizeSearch(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().slice(0, 100);
  // Remove any null bytes or control characters
  const cleaned = trimmed.replace(/[\x00-\x1F\x7F]/g, "");
  return cleaned || undefined;
}

export default async function CirclesPage({ searchParams }: Props) {
  const raw = await searchParams;
  const q = sanitizeSearch(raw.q);
  const location = sanitizeSearch(raw.location);

  // One cached round-trip for everyone; filtering happens in JS below.
  const allCircles = await getActiveCircles();

  const needle = q?.toLowerCase();
  const locNeedle = location?.toLowerCase();
  const filtered = allCircles.filter((c) => {
    if (needle) {
      const haystack = `${c.name ?? ""} ${c.description ?? ""}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    if (locNeedle && !(c.location ?? "").toLowerCase().includes(locNeedle)) {
      return false;
    }
    return true;
  });

  // Surface the global (virtual-first) circle above search results,
  // but only when no search filters are actively narrowing the list.
  const globalCircle =
    !q && !location
      ? (filtered.find((c) => c.kind === "global") ?? null)
      : null;

  const localCircles = filtered.filter((c) => c.id !== globalCircle?.id);

  return (
    <section className="min-h-screen pt-32 pb-20 bg-cream">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-xs tracking-[0.3em] uppercase text-terracotta mb-4 block font-medium">
            Find Your Circle
          </span>
          <h1 className="font-serif text-5xl md:text-6xl text-charcoal mb-6">
            Circles Near You
          </h1>
          <p className="text-lg text-charcoal-muted max-w-2xl mx-auto mb-10">
            Meek Meet is an Australia-first initiative — warm gatherings of faith under
            the new moon, opening across Australia and led by faithful leaders
            from each community. As demand grows, new circles form in new regions,
            online and in person.
          </p>
          <SearchForm />
        </div>

        {globalCircle && (
          <Link
            href={`/circles/${globalCircle.slug}`}
            className="group block bg-midnight rounded-3xl p-8 md:p-10 mb-12 card-warm grain-texture relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-wheat/5 blur-[100px]" />
            <div className="relative flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
              <div className="flex-1">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sage/15 border border-sage/30 text-sage-light text-xs tracking-widest uppercase font-medium mb-4">
                  <Globe className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Join from anywhere — online
                </span>
                <h2 className="font-serif text-3xl md:text-4xl text-cream mb-3 group-hover:text-wheat-light transition-colors duration-300">
                  {globalCircle.name}
                </h2>
                <p className="text-cream/60 leading-relaxed max-w-2xl">
                  {globalCircle.description ||
                    "A warm virtual gathering under the new moon — open to everyone, wherever you are in the world."}
                </p>
              </div>
              <div className="flex-shrink-0 flex items-center gap-3 px-6 py-3 bg-wheat text-midnight text-sm font-medium tracking-wide rounded-full group-hover:bg-wheat-light transition-all">
                <Video className="w-4 h-4" strokeWidth={1.5} />
                Join Online
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" strokeWidth={1.5} />
              </div>
            </div>
          </Link>
        )}

        {localCircles.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
            {localCircles.map((circle, i) => (
              <CircleCard key={circle.id} circle={circle} index={i} />
            ))}
          </div>
        ) : globalCircle ? (
          <p className="text-center text-charcoal-muted max-w-md mx-auto">
            More circles are forming across Australia — join the Global New Moon
            Circle above while one near you takes shape.
          </p>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-wheat-pale rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="font-serif text-2xl text-wheat-dark">?</span>
            </div>
            <h3 className="font-serif text-xl text-charcoal mb-2">
              No circles found
            </h3>
            <p className="text-charcoal-muted max-w-md mx-auto">
              Try adjusting your search terms or clearing the filters to see all available circles.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
