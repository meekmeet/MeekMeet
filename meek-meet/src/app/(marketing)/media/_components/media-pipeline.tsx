"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Moon, Smartphone, Network, Newspaper, Check, Loader2 } from "lucide-react";
import AsciiArt from "../../_components/AsciiArt";

const steps = [
  {
    number: "01",
    icon: Moon,
    title: "Join a New Moon Meetup",
    description:
      "Circles gather every new moon — and the front door is now virtual. Join the Global New Moon Circle from anywhere in the world, or find a circle near you and sit with your neighbours in person.",
    status: "live" as const,
  },
  {
    number: "02",
    icon: Smartphone,
    title: "Questions Arrive on Your Phone",
    description:
      "During the gathering, seeded questions are sent straight to your phone. No stage, no spotlight — just honest reflection, shared at the pace of the circle, in your own words.",
    status: "live" as const,
  },
  {
    number: "03",
    icon: Network,
    title: "Answers Are Matched Across the Community",
    description:
      "Every answer joins a growing body of human knowledge. Pattern-matching across the community surfaces the concerns many people share but few say out loud — anonymised, aggregated, dignified.",
    status: "progress" as const,
  },
  {
    number: "04",
    icon: Newspaper,
    title: "Unresolved Issues Become Headlines",
    description:
      "The most significant unresolved issues — the ones communities keep circling — become headlines and media stories, pushed into the open so they can finally be worked toward resolution.",
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

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.15 + index * 0.12 }}
              className="group p-8 bg-midnight-warm/60 backdrop-blur-sm rounded-2xl border border-wheat/10 hover:border-wheat/30 transition-all duration-500"
            >
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-wheat/10 rounded-xl group-hover:bg-wheat/20 transition-all duration-500">
                    <step.icon
                      className="w-5 h-5 text-wheat-light group-hover:text-wheat transition-colors duration-500"
                      strokeWidth={1.5}
                    />
                  </div>
                  <div>
                    <span className="font-script text-3xl text-wheat/40 block leading-none">
                      {step.number}
                    </span>
                  </div>
                </div>
                <StatusChip status={step.status} />
              </div>
              <h3 className="font-serif text-2xl text-cream mb-3 group-hover:text-wheat-light transition-colors duration-500">
                {step.title}
              </h3>
              <p className="text-cream/60 leading-relaxed">
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
          Steps one and two are live in Meek Meet today. Steps three and four are
          in active development — this page is our public promise, and we intend to
          keep it.
        </motion.p>
      </div>
    </section>
  );
}
