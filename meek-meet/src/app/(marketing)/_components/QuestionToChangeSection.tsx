"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { CircleDot, PenLine, Layers3, Landmark } from "lucide-react";
import FunnelCanvas from "./FunnelCanvas";

const STAGES = [
  {
    icon: CircleDot,
    step: "01",
    title: "The Question",
    description:
      "Drawn from the night's theme, authored to cross from what holds a person back to what a community can do. Never repeated, never fixed.",
  },
  {
    icon: PenLine,
    step: "02",
    title: "The Answer",
    description:
      "Written in the handbook before the circle, read aloud inside it. Every answer is thought through, never ambushed on the spot.",
  },
  {
    icon: Layers3,
    step: "03",
    title: "The Pattern",
    description:
      "Answers aggregate across circles, suburbs, and faiths, anonymised and weighed. The street's quiet consensus becomes evidence.",
  },
  {
    icon: Landmark,
    step: "04",
    title: "The Change",
    description:
      "Reports land on the desks of councils, members, and decision-makers. The meek do not shout. They prove.",
  },
];

export default function QuestionToChangeSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="engine" className="relative py-28 bg-midnight text-cream overflow-hidden grain-texture">
      {/* New-moon ambience: a dark disc eclipsing a faint halo */}
      <div className="absolute top-16 right-10 md:right-24 w-40 h-40 md:w-56 md:h-56 rounded-full border border-wheat/10" aria-hidden="true" />
      <div className="absolute top-16 right-10 md:right-24 w-40 h-40 md:w-56 md:h-56 rounded-full bg-midnight shadow-[0_0_80px_20px_rgba(224,185,110,0.12)]" aria-hidden="true" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-wheat/5 blur-[150px]" aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <span className="text-xs tracking-[0.3em] uppercase text-wheat-light mb-4 block font-medium">
            The Engine
          </span>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-cream mb-6">
            From a question to a change.
          </h2>
          <p className="text-lg text-cream/70 max-w-3xl mx-auto leading-relaxed font-light">
            Every answer travels the same path. A question is drawn. An answer is written.
            Answers gather into patterns across circles and suburbs. Patterns become
            anonymised evidence, and evidence reaches the people with the power to act.
            Nothing is shouted. Everything is proven.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 1, delay: 0.2 }}
          className="max-w-2xl mx-auto mb-4"
        >
          <FunnelCanvas />
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 max-w-5xl mx-auto">
          {STAGES.map((stage, index) => (
            <motion.div
              key={stage.step}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.12 }}
              className="group p-4 sm:p-6 bg-midnight-warm/60 backdrop-blur-sm rounded-2xl border border-wheat/10 hover:border-wheat/30 transition-all duration-500"
            >
              <div className="flex items-center gap-2.5 mb-3">
                <stage.icon className="w-4 h-4 text-wheat-light" strokeWidth={1.5} />
                <span className="font-script text-2xl text-wheat/50">{stage.step}</span>
              </div>
              <h3 className="font-serif text-lg sm:text-xl text-cream mb-2 group-hover:text-wheat-light transition-colors duration-500">
                {stage.title}
              </h3>
              <p className="text-cream/60 text-xs sm:text-sm leading-relaxed">
                {stage.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="text-center font-script text-2xl md:text-3xl text-wheat/40 mt-14"
        >
          &ldquo;You number my wanderings; put my tears into Your bottle.&rdquo;
          <span className="block text-sm font-sans text-cream/40 mt-1 tracking-wide">Psalm 56:8</span>
        </motion.p>
      </div>
    </section>
  );
}
