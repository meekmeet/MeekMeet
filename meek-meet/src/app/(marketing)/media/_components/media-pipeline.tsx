"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Moon, Smartphone, Network, Newspaper, Check, Loader2 } from "lucide-react";
import AsciiArt from "../../_components/AsciiArt";

const steps = [
  {
    number: "01",
    icon: Moon,
    title: "Reserve Your Seat for the New Moon",
    description:
      "Circles gather on the new moon, online and in person, and every new moon lands on a different weekday — so the night never repeats itself. Reserve your seat, and the gathering is yours — no reservation, no participation.",
    status: "live" as const,
  },
  {
    number: "02",
    icon: Smartphone,
    title: "The Summons Arrives Four Days Before",
    description:
      "Your questions for the night's theme arrive by email. You write your answers in your handbook in your own time, then read aloud what you already thought through. Nothing is asked of you on the spot.",
    status: "live" as const,
  },
  {
    number: "03",
    icon: Network,
    title: "Answers Are Matched Across the Community",
    description:
      "Every answer joins a growing body of human knowledge. Patterns surface across circles, suburbs, and faiths — anonymised, aggregated, dignified — the concerns many share but few say out loud.",
    status: "live" as const,
  },
  {
    number: "04",
    icon: Newspaper,
    title: "Unresolved Issues Are Carried Into the Open",
    description:
      "The most significant unresolved issues become evidence: reports land on the desks of councils and decision-makers, and the stories communities keep circling are pushed into the open until they are worked toward resolution.",
    status: "progress" as const,
  },
];

function StatusChip({ status }: { status: "live" | "progress" }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sage/15 border border-sage/30 text-sage-light text-xs tracking-wide font-medium">
        <Check className="w-3 h-3" strokeWidth={2} />
        Live
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-wheat/10 border border-wheat/30 text-wheat-light text-xs tracking-wide font-medium">
      <Loader2 className="w-3 h-3" strokeWidth={2} />
      In progress
    </span>
  );
}

export default function MediaPipeline() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="relative py-28 bg-midnight text-cream overflow-hidden grain-texture">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-wheat/5 blur-[150px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-sage/5 blur-[120px]" />

      {/* ASCII Lamp - right side */}
      <div className="absolute top-24 right-6 md:right-12 hidden md:block">
        <AsciiArt name="lamp" color="wheat" />
      </div>

      {/* ASCII Dove - bottom left */}
      <div className="absolute bottom-16 left-6 md:left-12 hidden md:block">
        <AsciiArt name="dove" color="sage" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <span className="text-xs tracking-[0.3em] uppercase text-wheat-light mb-4 block font-medium">
            From Gathering to Headline
          </span>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-cream mb-6">
            How It Works
          </h2>
          <div className="ornament-divider max-w-xs mx-auto mb-8">
            <span className="text-wheat text-lg">&#10022;</span>
          </div>
          <p className="text-lg text-cream/70 max-w-3xl mx-auto leading-relaxed font-light">
            A quiet pipeline from a circle of strangers to a story the world can no
            longer scroll past. We mark each stage honestly — what exists today, and
            what we are still building.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.15 + index * 0.12 }}
              className="group p-4 sm:p-8 bg-midnight-warm/60 backdrop-blur-sm rounded-2xl border border-wheat/10 hover:border-wheat/30 transition-all duration-500"
            >
              <div className="flex items-start justify-between gap-2 sm:gap-4 mb-3 sm:mb-5">
                <div className="flex items-center gap-2.5 sm:gap-4">
                  <div className="flex-shrink-0 w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center bg-wheat/10 rounded-lg sm:rounded-xl group-hover:bg-wheat/20 transition-all duration-500">
                    <step.icon
                      className="w-4 h-4 sm:w-5 sm:h-5 text-wheat-light group-hover:text-wheat transition-colors duration-500"
                      strokeWidth={1.5}
                    />
                  </div>
                  <div>
                    <span className="font-script text-2xl sm:text-3xl text-wheat/40 block leading-none">
                      {step.number}
                    </span>
                  </div>
                </div>
                <StatusChip status={step.status} />
              </div>
              <h3 className="font-serif text-lg sm:text-2xl text-cream mb-2 sm:mb-3 group-hover:text-wheat-light transition-colors duration-500">
                {step.title}
              </h3>
              <p className="text-cream/60 text-xs sm:text-base leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="text-center text-sm text-cream/40 mt-12 max-w-xl mx-auto leading-relaxed"
        >
          Gathering, summons, handbooks, and community pattern-matching are live
          in Meek Meet today. Carrying unresolved issues to decision-makers is
          in active progress — this page is our public promise, and we intend to
          keep it.
        </motion.p>
      </div>
    </section>
  );
}
