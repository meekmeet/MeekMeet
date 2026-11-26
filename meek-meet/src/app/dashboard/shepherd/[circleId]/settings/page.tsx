"use client";

import { useState, useTransition, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateCircle } from "../actions";

export default function SettingsPage() {
  const params = useParams();
  const circleId = typeof params.circleId === "string" ? params.circleId : null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [meetingPlace, setMeetingPlace] = useState("");
  const [meetingAddress, setMeetingAddress] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [zoomRoomUrl, setZoomRoomUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the circle's current values — the form edits, never blanks.
  useEffect(() => {
    if (!circleId) return;
    const supabase = createClient();
    supabase
      .from("circles")
      .select("name, description, location, meeting_place, meeting_address, image_url, zoom_room_url")
      .eq("id", circleId)
      .single()
      .then(({ data }) => {
        if (data) {
          setName((data.name as string) ?? "");
          setDescription((data.description as string) ?? "");
          setLocation((data.location as string) ?? "");
          setMeetingPlace((data.meeting_place as string) ?? "");
          setMeetingAddress((data.meeting_address as string) ?? "");
          setImageUrl((data.image_url as string) ?? "");
          setZoomRoomUrl((data.zoom_room_url as string) ?? "");
        }
        setLoading(false);
      });
  }, [circleId]);

  const handleSave = () => {
    if (!circleId) return;
    setError(null);

    startTransition(async () => {
      try {
        await updateCircle(circleId, {
          name,
          description,
          location,
          meetingPlace,
          meetingAddress,
          imageUrl,
          zoomRoomUrl,
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  };

  return (
    <div className="max-w-2xl">
      <h2 className="font-serif text-2xl text-charcoal mb-6">Circle Settings</h2>

      {loading ? (
        <div className="flex items-center gap-3 text-charcoal-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading your circle…
        </div>
      ) : (
      <div className="bg-cream-warm rounded-2xl border border-border-soft p-8 space-y-6">
        {error && (
          <div className="p-3 bg-terracotta-pale rounded-xl text-sm text-terracotta">
            {error}
          </div>
        )}

        {/* Name */}
        <div className="space-y-2">
          <label className="text-sm text-charcoal-light font-medium">Circle Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-cream border border-border-soft rounded-xl focus:border-terracotta focus:outline-none transition-colors text-sm"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm text-charcoal-light font-medium">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 bg-cream border border-border-soft rounded-xl focus:border-terracotta focus:outline-none transition-colors text-sm resize-none"
          />
        </div>

        {/* Location */}
        <div className="space-y-2">
          <label className="text-sm text-charcoal-light font-medium flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />
            General Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Suburb / City / State"
            className="w-full px-4 py-3 bg-cream border border-border-soft rounded-xl focus:border-terracotta focus:outline-none transition-colors text-sm"
          />
        </div>

        {/* Meeting Place */}
        <div className="space-y-2">
          <label className="text-sm text-charcoal-light font-medium">Meeting Place</label>
          <input
            type="text"
            value={meetingPlace}
            onChange={(e) => setMeetingPlace(e.target.value)}
            placeholder="e.g., St. Marks Community Hall"
            className="w-full px-4 py-3 bg-cream border border-border-soft rounded-xl focus:border-terracotta focus:outline-none transition-colors text-sm"
          />
        </div>

        {/* Meeting Address */}
        <div className="space-y-2">
          <label className="text-sm text-charcoal-light font-medium">Meeting Address</label>
          <input
            type="text"
            value={meetingAddress}
            onChange={(e) => setMeetingAddress(e.target.value)}
            placeholder="Full street address"
            className="w-full px-4 py-3 bg-cream border border-border-soft rounded-xl focus:border-terracotta focus:outline-none transition-colors text-sm"
          />
        </div>

        {/* Image URL */}
        <div className="space-y-2">
          <label className="text-sm text-charcoal-light font-medium">Cover Image URL</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-4 py-3 bg-cream border border-border-soft rounded-xl focus:border-terracotta focus:outline-none transition-colors text-sm"
          />
          <p className="text-xs text-charcoal-muted">Leave empty for a default background.</p>
        </div>

        {/* Standing room */}
        <div className="space-y-2">
          <label className="text-sm text-charcoal-light font-medium">
            The Circle&apos;s Room (video link)
          </label>
          <input
            type="url"
            value={zoomRoomUrl}
            onChange={(e) => setZoomRoomUrl(e.target.value)}
            placeholder="https://zoom.us/j/…  or your Google Meet link"
            className="w-full px-4 py-3 bg-cream border border-border-soft rounded-xl focus:border-terracotta focus:outline-none transition-colors text-sm"
          />
          <p className="text-xs text-charcoal-muted">
            Your circle&apos;s standing room. Digital meetings without their own link
            use this one — the circle always has a door to walk through.
          </p>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={isPending || !circleId}
          className="w-full py-3 bg-midnight text-cream rounded-full hover:bg-midnight-soft transition-all text-sm tracking-wide font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Saved
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
      )}
    </div>
  );
}
