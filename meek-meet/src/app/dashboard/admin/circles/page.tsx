import { createClient } from "@/lib/supabase/server";
import { MapPin, Users } from "lucide-react";
import CircleOrganizerButton from "./_components/circle-organizer-button";

export default async function AdminCirclesPage() {
  const supabase = await createClient();

  const [{ data: circles }, { data: links }] = await Promise.all([
    supabase
      .from("circles")
      .select("id, name, location, kind, is_active, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("circle_shepherds").select("circle_id"),
  ]);

  // Global (virtual-first) circles listed first, then newest locals.
  const sortedCircles = (circles ?? []).sort((a, b) => {
    if (a.kind === b.kind) return 0;
    return a.kind === "global" ? -1 : 1;
  });

  const shepherdCounts = new Map<string, number>();
  for (const link of links ?? []) {
    shepherdCounts.set(link.circle_id, (shepherdCounts.get(link.circle_id) ?? 0) + 1);
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-charcoal mb-2">Circles</h1>
      <p className="text-charcoal-muted mb-8">
        Every circle across the community.
      </p>

      <div className="mb-8">
        <CircleOrganizerButton />
      </div>

      {!circles || circles.length === 0 ? (
        <div className="text-center py-20 bg-cream-warm rounded-2xl border border-border-soft">
          <p className="text-charcoal-muted">No circles yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedCircles.map((circle) => (
            <div
              key={circle.id}
              className="bg-cream-warm rounded-2xl border border-border-soft p-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-charcoal font-medium">{circle.name}</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        circle.kind === "global"
                          ? "bg-sky-pale text-midnight"
                          : "bg-wheat-pale text-wheat-dark"
                      }`}
                    >
                      {circle.kind === "global" ? "Global" : "Local"}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        circle.is_active
                          ? "bg-sage-pale text-sage-dark"
                          : "bg-terracotta-pale text-terracotta"
                      }`}
                    >
                      {circle.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-sage" strokeWidth={1.5} />
                    <span className="text-sm text-charcoal">{circle.location ?? "—"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm text-charcoal-muted">
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-wheat-dark" strokeWidth={1.5} />
                    {shepherdCounts.get(circle.id) ?? 0}{" "}
                    {(shepherdCounts.get(circle.id) ?? 0) === 1 ? "shepherd" : "shepherds"}
                  </span>
                  <span>
                    Created{" "}
                    {new Date(circle.created_at).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
