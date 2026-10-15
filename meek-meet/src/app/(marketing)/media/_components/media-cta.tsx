"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { Moon, UserPlus } from "lucide-react";

export default function MediaCTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="relative py-28 bg-cream">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="bg-midnight rounded-3xl p-10 md:p-16 text-center grain-texture relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-wheat/5 blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-sage/5 blur-[100px]" />

          <div className="relative">
            <span className="text-xs tracking-[0.3em] uppercase text-wheat-light mb-4 block font-medium">
              The Next New Moon
            </span>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-cream mb-6">
              Be Part of the Knowledge
              <br />
              Humanity Is Missing
            </h2>
            <p className="text-cream/60 max-w-xl mx-auto mb-10 leading-relaxed">
              Your experience — of faith, of struggle, of hope — is data the world
              has never counted. Gather with us under the next new moon, or shepherd
              a circle of your own.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/circles"
                className="inline-flex items-center gap-2 px-8 py-3 bg-wheat text-midnight font-medium tracking-wide text-sm rounded-full hover:bg-wheat-light transition-all"
              >
                <Moon className="w-4 h-4" strokeWidth={1.5} />
                Join a Circle
              </Link>
              <Link
                href="/shepherd/apply"
                className="inline-flex items-center gap-2 px-8 py-3 border-2 border-wheat/30 text-wheat font-medium tracking-wide text-sm rounded-full hover:border-wheat hover:text-wheat-light transition-all"
              >
                <UserPlus className="w-4 h-4" strokeWidth={1.5} />
                Become a Shepherd
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
