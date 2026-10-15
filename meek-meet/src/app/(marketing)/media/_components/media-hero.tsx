"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import AsciiArt from "../../_components/AsciiArt";

export default function MediaHero() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden grain-texture">
      <div className="absolute inset-0 bg-gradient-to-br from-cream via-cream-warm to-parchment" />

      <div className="absolute top-24 right-16 w-80 h-80 rounded-full bg-wheat-pale/40 blur-3xl" />
      <div className="absolute bottom-24 left-16 w-96 h-96 rounded-full bg-sage-pale/30 blur-3xl" />

      {/* Scripture watermark */}
      <div className="absolute top-36 left-8 md:left-20 scripture-watermark text-2xl md:text-3xl max-w-[220px] hidden lg:block">
        That they all may be one.
      </div>

      {/* ASCII Moon - right side */}
      <div className="absolute top-32 right-8 md:right-16 hidden md:block opacity-70">
        <AsciiArt name="moon" color="wheat" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-36 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-wheat-pale/60 rounded-full mb-10"
        >
          <BookOpen className="w-3.5 h-3.5 text-wheat-dark" strokeWidth={1.5} />
          <span className="text-xs tracking-widest uppercase text-wheat-dark font-medium">
            Media &amp; Mission
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-charcoal leading-[1.08] mb-8"
        >
          The advocate for
          <br />
          <span className="text-gradient-warm italic">human knowledge</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5 }}
          className="text-lg md:text-xl text-charcoal-muted max-w-2xl mx-auto leading-relaxed font-light mb-6"
        >
          Every religion, every culture, every way of life carries a piece of what
          humanity knows. Meek Meet exists so that none of it is lost — and so that
          what we learn together becomes something we can act on together.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.65 }}
          className="text-base md:text-lg text-charcoal-light max-w-2xl mx-auto leading-relaxed mb-10"
        >
          No single faith is the focus here. Everyone is accepted, exactly as they
          arrive. And the struggles we face — loneliness, injustice, the quiet
          weight of simply getting by — were never meant to be carried alone.
          Real problems require connection: people remembering their inner purpose,
          and remembering what humanity can do when it stops dividing itself.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.75 }}
          className="text-xs tracking-[0.25em] uppercase text-sage-dark font-medium mb-10"
        >
          Born in Australia · Expanding as communities form
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/circles"
            className="px-8 py-3 bg-midnight text-cream rounded-full hover:bg-midnight-soft transition-all text-sm tracking-wide font-medium"
          >
            Find a Circle
          </Link>
          <Link
            href="/shepherd/apply"
            className="px-8 py-3 border-2 border-midnight/15 text-charcoal rounded-full hover:border-terracotta hover:text-terracotta transition-all text-sm tracking-wide font-medium"
          >
            Become a Shepherd
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
