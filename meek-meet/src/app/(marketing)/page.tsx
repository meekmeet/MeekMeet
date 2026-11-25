import HeroSection from "./_components/HeroSection";
import FeaturesSection from "./_components/FeaturesSection";
import ManyNamesSection from "./_components/ManyNamesSection";
import NewMoonSection from "./_components/NewMoonSection";

export const metadata = {
  title: "Meek Meet | Blessed Are The Meek",
};

export default function Home() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <ManyNamesSection />
      <section id="new-moon">
        <NewMoonSection />
      </section>
    </>
  );
}
