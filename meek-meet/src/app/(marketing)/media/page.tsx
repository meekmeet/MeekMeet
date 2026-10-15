import MediaHero from "./_components/media-hero";
import MediaPipeline from "./_components/media-pipeline";
import MediaBeliefs from "./_components/media-beliefs";
import MediaCTA from "./_components/media-cta";

export const metadata = {
  title: "Media & Mission | Meek Meet",
  description:
    "Meek Meet is an advocate for human knowledge — gathering people of all faiths, cultures and ways of life, and turning shared struggles into stories too significant to ignore.",
};

export default function MediaPage() {
  return (
    <>
      <MediaHero />
      <MediaPipeline />
      <MediaBeliefs />
      <MediaCTA />
    </>
  );
}
