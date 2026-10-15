"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Infinity as InfinityIcon, HeartHandshake, BookOpen, Mountain, ChartColumn } from "lucide-react";

const beliefs = [
  {
    icon: InfinityIcon,
    title: "All Faiths and None",
    description:
      "Christians, Muslims, Buddhists, Hindus, Jews, Sikhs, secular humanists, the searching and the certain — every seat at the circle is equal. No tradition speaks for everyone, and no one is asked to leave theirs at the door.",
  },
  {
    icon: HeartHandshake,
    title: "The Dignity of Every Person",
    description:
      "The meek are not the loud, the powerful or the well-connected. They are everyone the world forgot to ask. Every voice is received with the same weight, and every answer is protected with the same care.",
  },
  {
    icon: BookOpen,
    title: "Knowledge Over Ideology",
    description:
      "We are an advocate for human knowledge, not a champion of any creed. When millions of lived experiences point the same way, that pattern is worth more than any argument. We follow what people actually live.",
  },
  {
    icon: Mountain,
    title: "Perseverance",
    description:
      "The struggles that matter most are rarely resolved in a season. Housing, loneliness, injustice, care for the old and the young — we return to them, new moon after new moon, for as long as it takes.",
  },
  {
    icon: ChartColumn,
    title: "Community That Measures Its Impact",
    description:
      "Warmth is not the finish line. A circle that gathers but changes nothing has only half its purpose. We count what communities carry, we publish what they share, and we hold ourselves to visible outcomes.",
  },
];

export default function MediaBeliefs() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="relative py-28 bg-cream-warm grain-texture">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <span className="text-xs tracking-[0.3em] uppercase text-terracotta mb-4 block font-medium">
            What We Believe
          </span>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-charcoal mb-6">
            The Ground We Stand On
          </h2>
          <div className="ornament-divider max-w-xs mx-auto mb-8">
            <span className="text-wheat text-lg">&#10022;</span>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {beliefs.map((belief, index) => (
            <motion.div
              key={belief.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.15 + index * 0.1 }}
              className={`bg-white rounded-2xl border border-border-soft p-8 card-warm ${
                index === beliefs.length - 1 ? "md:col-span-2 lg:col-span-1" : ""
              }`}
            >
              <div className="w-12 h-12 flex items-center justify-center bg-terracotta-pale rounded-xl mb-5">
                <belief.icon className="w-5 h-5 text-terracotta" strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-2xl text-charcoal mb-3">
                {belief.title}
              </h3>
              <p className="text-charcoal-muted leading-relaxed">
                {belief.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
