import { createClient } from "@/lib/supabase/server";
import { Globe, Video, ArrowRight } from "lucide-react";
import Link from "next/link";
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

  const supabase = await createClient();

  let dbQuery = supabase
    .from("circles")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (q) {
    dbQuery = dbQuery.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
  }
  if (location) {
    dbQuery = dbQuery.ilike("location", `%${location}%`);
  }

  const { data: circles, error } = await dbQuery;

  if (error) {
    console.error("Failed to fetch circles:", error);
  }

  // Surface the global (virtual-first) circle above search results,
  // but only when no search filters are actively narrowing the list.
  let globalCircle: NonNullable<typeof circles>[number] | null = null;
  if (!q && !location) {
    const { data } = await supabase
      .from("circles")
      .select("*")
      .eq("is_active", true)
      .eq("kind", "global")
      .limit(1)
      .maybeSingle();
    globalCircle = data;
  }

  const localCircles = (circles ?? []).filter((c) => c.id !== globalCircle?.id);

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
            Warm gatherings of faith, happening under the new moon across Australia.
            Each circle is shepherded by a faithful leader from your community.
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {localCircles.map((circle, i) => (
              <CircleCard key={circle.id} circle={circle} index={i} />
            ))}
          </div>
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
