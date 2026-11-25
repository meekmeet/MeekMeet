"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import AsciiArt from "./AsciiArt";

// The thread that ties every outreach email and every flyer back to the site:
// "the meek shall inherit the earth" is not a Christian slogan — it is a
// promise each tradition arrived at on its own. Christianity is the spark;
// the table is set for everyone. Sources are chosen for accuracy of citation.
const THREAD = [
  {
    tradition: "Christianity",
    note: "the spark",
    quote: "Blessed are the meek, for they shall inherit the earth.",
    ref: "Matthew 5:5",
  },
  {
    tradition: "Judaism",
    note: "the verse Matthew was quoting",
    quote:
      "But the meek shall inherit the land, and delight themselves in abundant peace.",
    ref: "Psalm 37:11",
  },
  {
    tradition: "Islam",
    note: "as foretold in the Psalms",
    quote: "Indeed, My righteous servants shall inherit the earth.",
    ref: "Qur\u2019an 21:105",
  },
  {
    tradition: "Hinduism",
    note: "humility as clear sight",
    quote:
      "The humble sage sees with equal vision a learned priest, a cow, an elephant, a dog, and an outcast.",
    ref: "Bhagavad Gita 5:18",
  },
  {
    tradition: "Buddhism",
    note: "gentleness as strength",
    quote:
      "Conquer anger with love. Conquer evil with good. Conquer the stingy with a gift, and the liar with truth.",
    ref: "Dhammapada 17:223",
  },
  {
    tradition: "Sikhism",
    note: "the founder's own company",
    quote:
      "Lowest of the low \u2014 Nanak keeps the company of the lowest, and envies not the great.",
    ref: "Japji Sahib 27",
  },
  {
    tradition: "Taoism",
    note: "power by staying low",
    quote:
      "The sea rules a hundred rivers because it stays below them. So the sage leads by placing himself behind.",
    ref: "Tao Te Ching 66",
  },
  {
    tradition: "Bah\u00e1\u2019\u00ed",
    note: "the unity underneath",
    quote: "The earth is but one country, and mankind its citizens.",
    ref: "Bah\u00e1\u2019u\u2019ll\u00e1h",
  },
  {
    tradition: "Indigenous wisdom",
    note: "stewardship, not ownership",
    quote:
      "We do not inherit the earth from our ancestors; we borrow it from our children.",
    ref: "Traditional teaching",
  },
];

export default function ManyNamesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="many-names" className="relative py-28 bg-parchment grain-texture overflow-hidden">
      {/* ASCII Olive branch - top left */}
      <div className="absolute top-16 left-4 md:left-10 hidden md:block">
        <AsciiArt name="olive" color="sage" />
      </div>

      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <span className="text-xs tracking-[0.3em] uppercase text-terracotta mb-4 block font-medium">
            One Promise, Many Names
          </span>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-charcoal mb-6">
            The promise belongs to no one faith.
          </h2>
          <div className="ornament-divider max-w-xs mx-auto mb-8">
            <span className="text-wheat text-lg">&#10022;</span>
          </div>
          <p className="text-lg text-charcoal-muted max-w-3xl mx-auto leading-relaxed font-light">
            Meek Meet begins at Matthew 5:5 &mdash; the spark. But the promise it carries is
            older and wider than any single tradition. Every faith arrived at it on its own,
            in its own words. Christian is the spark. The table is set for everyone.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {THREAD.map((entry, index) => (
            <motion.figure
              key={entry.tradition}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.08 * index }}
              className="bg-cream rounded-2xl border border-wheat/25 shadow-sm p-7 flex flex-col"
            >
              <figcaption className="mb-4">
                <span className="text-xs tracking-[0.2em] uppercase text-terracotta font-medium">
                  {entry.tradition}
                </span>
                <span className="block text-[11px] text-charcoal-muted mt-1 italic">
                  {entry.note}
                </span>
              </figcaption>
              <blockquote className="font-serif text-lg text-charcoal leading-relaxed flex-1">
                &ldquo;{entry.quote}&rdquo;
              </blockquote>
              <p className="text-xs text-sage-dark tracking-wide mt-4">&mdash; {entry.ref}</p>
            </motion.figure>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-center font-script text-2xl md:text-3xl text-wheat-dark/70 mt-14"
        >
          Different words. One promise. Every street.
        </motion.p>
      </div>
    </section>
  );
}
