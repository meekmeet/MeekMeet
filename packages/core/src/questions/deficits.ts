// The deficit gate — the subconscious layer beneath the question bank.
//
// INTERNAL ONLY. This module is the platform's private grammar: every circle
// question is written to pass through what holds humanity back (a root
// deficit) and to point, by aggregation, toward what the world needs (the
// virtue pole). Members never see these tags; regular admins never see them;
// they surface only in the master admin's deficit matrix and in the
// aggregation logic that turns anonymised answers into reports of motion
// toward virtue.
//
// The architecture:
//   deficit (the subconscious gate — this file)
//     → question (the conscious instrument — circle-topics.ts)
//       → written answer (the member's truth)
//         → aggregation (deficit ratios per circle / street / region)
//           → report (the motion toward the virtue pole)
//
// Every question in the bank MUST pass the gate: QUESTION_DEFICITS covers
// every circle-topics question id, and the test suite refuses any question
// without a deficit. No question enters the bank without naming what it
// serves. The mapping is deliberately many-to-one and indirect — several
// questions triangulate the same deficit from different angles, and no
// member-facing surface ever names it, or the answers become performances.

export type DeficitId =
  | "pride"
  | "greed"
  | "lust"
  | "envy"
  | "gluttony"
  | "wrath"
  | "sloth";

export interface VirtuePole {
  name: string;
  essence: string;
  parallels: TraditionParallels;
}

export interface TraditionParallels {
  buddhism: string;
  islam: string;
  judaism: string;
  hinduism: string;
  sikhism: string;
  classical: string;
}

export interface RootDeficit {
  id: DeficitId;
  name: string;
  /** What the deficit actually is, beneath its cartoon version. */
  essence: string;
  parallels: TraditionParallels;
  /** Where the aggregation aims: the virtue this deficit's healing grows. */
  virtue: VirtuePole;
}

export const ROOT_DEFICITS: RootDeficit[] = [
  {
    id: "pride",
    name: "Pride",
    essence:
      "The managed self: image over truth, status over love, self-sufficiency over trust. In community life it appears as the polite mask, the unspoken conviction, the struggle nobody admits to, and the institution that never asks.",
    parallels: {
      buddhism: "māna (conceit) and mada (the intoxication of self)",
      islam: "kibr (arrogance — 'no one who has a grain of it enters the garden')",
      judaism: "gaavah (haughtiness — the trait the sages say drives one from the world)",
      hinduism: "mada and ahaṃkāra (ego — among the six enemies, the shadripu)",
      sikhism: "ahankar (ego — one of the Five Thieves)",
      classical: "superbia — the root of the deadly seven",
    },
    virtue: {
      name: "Humility",
      essence:
        "The unmanaged self: truth told plainly, help received as readily as given, conviction spoken without armour.",
      parallels: {
        buddhism: "anattā lived — selflessness in practice",
        islam: "tawadu' (humility before God and people)",
        judaism: "anavah (the humility of Moses, the meekest of men)",
        hinduism: "daivi sampad — the divine quality of humility (Gita 16)",
        sikhism: "nimrata (humility — the first of the Five Virtues)",
        classical: "humilitas — and fortitude in speech",
      },
    },
  },
  {
    id: "greed",
    name: "Greed",
    essence:
      "The clenched hand: accumulation as safety, an 'enough' that never arrives. In community life it appears as the housing squeeze, the undervalued worker, the surplus never shared, the street that has everything but each other.",
    parallels: {
      buddhism: "lobha (greed — the first of the three poisons)",
      islam: "bukhl (miserliness) and hirs (the grasping for more)",
      judaism: "betza (the desire for gain — the profit that corrupts judgement)",
      hinduism: "lobha (greed — among the shadripu)",
      sikhism: "lobh (greed — one of the Five Thieves)",
      classical: "avaritia — the sin of the clenched fist",
    },
    virtue: {
      name: "Generosity",
      essence:
        "The open hand: enough that is shared becomes more; the street's wealth measured in what circulates, not what is held.",
      parallels: {
        buddhism: "dāna pāramitā — generosity, the first perfection",
        islam: "sadaqah and zakah — giving as purification of wealth",
        judaism: "tzedakah and chesed — justice-giving and loving-kindness",
        hinduism: "dāna — the divine quality of charity (Gita 16)",
        sikhism: "vand chakna — sharing what one earns with others",
        classical: "liberalitas — the free hand",
      },
    },
  },
  {
    id: "lust",
    name: "Craving",
    essence:
      "Wanting that consumes: the person, the thing, the moment — wanted, not loved. In public life craving rarely appears naked; it wears greed's and gluttony's clothes, which is why the bank probes it through them.",
    parallels: {
      buddhism: "kāma-taṇhā (sensual craving — the thirst that binds)",
      islam: "shahwa unchecked — the nafs al-ammara, the commanding self",
      judaism: "taavah (inordinate desire — the appetite that masters)",
      hinduism: "kāma (desire — chief of the shadripu)",
      sikhism: "kaam (lust — one of the Five Thieves)",
      classical: "luxuria — desire that uses rather than loves",
    },
    virtue: {
      name: "Self-Mastery",
      essence:
        "The governed desire: wanting without consuming, delighting without possessing — the heart that can hold things lightly.",
      parallels: {
        buddhism: "virāga (dispassion — the fading of thirst)",
        islam: "'iffa (chastity and self-restraint)",
        judaism: "kedushah (holiness — the set-apart life)",
        hinduism: "brahmacharya (mastery of desire)",
        sikhism: "sanyam (restraint — discipline of the senses)",
        classical: "temperantia — desire ordered to love",
      },
    },
  },
  {
    id: "envy",
    name: "Envy",
    essence:
      "The bent eye: another's good read as one's own loss. The quiet assassin of gratitude — it cannot celebrate, only compare, and it isolates the envious inside their own accounting.",
    parallels: {
      buddhism: "macchariya (stinginess of spirit — envy at another's fortune)",
      islam: "hasad (envy — 'do not envy one another', the Prophet said)",
      judaism: "kinah (envy — which, with lust and honour, removes one from the world)",
      hinduism: "matsarya (envy — among the shadripu)",
      sikhism: "matsar (envy — the comparing mind)",
      classical: "invidia — sorrow at another's good",
    },
    virtue: {
      name: "Gratitude & Sympathetic Joy",
      essence:
        "The straight eye: another's good celebrated as good, one's own portion received with thanks — the arithmetic of abundance.",
      parallels: {
        buddhism: "mudita — joy in the joy of others, one of the four immeasurables",
        islam: "shukr (thankfulness — 'if you are grateful, I will surely increase you')",
        judaism: "hakarat hatov (recognition of the good — the habit of thanks)",
        hinduism: "santosha (contentment — the divine quality of satisfaction)",
        sikhism: "santokh (contentment — one of the Five Virtues)",
        classical: "gratitudo — the virtue that envy's poison cannot touch",
      },
    },
  },
  {
    id: "gluttony",
    name: "Gluttony",
    essence:
      "The false consolation: consuming to fill what only meaning fills — food, drink, comfort, distraction, the scroll at midnight. Its modern form is the comfort that quietly becomes a cage.",
    parallels: {
      buddhism: "the craving for taste and comfort — taṇhā in the kitchen",
      islam: "israf (excess — 'eat and drink, but do not waste')",
      judaism: "the boundary of kashrut — eating itself made holy or not",
      hinduism: "ati-bhoga (overindulgence — the senses fed past fullness)",
      sikhism: "the call to sahj (balance) — 'through desire the world is consumed'",
      classical: "gula — the appetite that swallows the appetite for life",
    },
    virtue: {
      name: "Temperance",
      essence:
        "The measured life: pleasure received with thanks and released on time — the middle way that leaves room for everything else.",
      parallels: {
        buddhism: "majjhimā paṭipadā — the middle way",
        islam: "wasatiyya — 'the balanced community' (Qur'an 2:143)",
        judaism: "shevil ha-zahav — the golden mean of Maimonides",
        hinduism: "mitahara (measured nourishment — Gita 6:17)",
        sikhism: "santokh (contentment that needs no more)",
        classical: "temperantia — the well-mixed life",
      },
    },
  },
  {
    id: "wrath",
    name: "Wrath",
    essence:
      "The fire that forgets its target: resentment inherited, nursed, and handed down — in families, between neighbours, across generations. Anger is information; wrath is information set alight.",
    parallels: {
      buddhism: "dosa (hatred — the second poison; 'hatred ceases not by hatred')",
      islam: "ghadab (anger — 'the strong one is not the wrestler, but who masters himself')",
      judaism: "ka'as (anger — which Maimonides ranks the worst of traits)",
      hinduism: "krodha (anger — among the shadripu)",
      sikhism: "krodh (anger — one of the Five Thieves)",
      classical: "ira — the vengeance that calls itself justice",
    },
    virtue: {
      name: "Patience & Forgiveness",
      essence:
        "The banked fire: slow to anger, quick to pardon — the chain of inheritance broken in one person's hands.",
      parallels: {
        buddhism: "khanti pāramitā — patience, the perfection that outlasts harm",
        islam: "sabr and 'afw — patience and the pardon that is better",
        judaism: "erekh apayim — slow to anger, the very attribute of God (Ex 34:6)",
        hinduism: "kshama (forgiveness — the divine quality that adorns the strong)",
        sikhism: "kshama and daya — forgiveness and compassion",
        classical: "mansuetudo — strength that has mastered itself",
      },
    },
  },
  {
    id: "sloth",
    name: "Acedia",
    essence:
      "Not laziness — the noonday demon. Numbness, despair, the retreat from what calls us: the unseeing eye that walks past the neighbour, the gift left buried, the silence that watches injustice pass. The deficit of a distracted age.",
    parallels: {
      buddhism: "moha (delusion — the root poison) and thīna-middha (sloth-torpor)",
      islam: "ghafla (heedlessness — the sleeping heart)",
      judaism: "the sluggard of Proverbs (atzel) — 'a little sleep, and poverty comes'",
      hinduism: "tamas (inertia — the guna of darkness and drift)",
      sikhism: "manmukh — the mind turned away, asleep in maya",
      classical: "acedia — the sorrow of the world that does not work",
    },
    virtue: {
      name: "Diligence & Love-in-Action",
      essence:
        "The awakened eye: seeing the neighbour and crossing the street, the gift taken out of the ground, the small act done now — love with its sleeves rolled.",
      parallels: {
        buddhism: "viriya pāramitā (energy) flowering as mettā in action",
        islam: "'amal — deed over word; the faith that works",
        judaism: "zerizut (alacrity — the quality of Abraham, who ran to do good)",
        hinduism: "karma yoga — the discipline of selfless action",
        sikhism: "seva and kirat karni — selfless service and honest labour",
        classical: "industria joined to caritas — diligence with a heart",
      },
    },
  },
];

export function getDeficitById(id: string): RootDeficit | null {
  return ROOT_DEFICITS.find((d) => d.id === id) ?? null;
}

// ── The gate map ───────────────────────────────────────────────
// Every circle-topics question id → the root deficit it was AUTHORED from.
// The bank is written from the gate, not tagged after the fact: each
// question is built from a (deficit → virtue) pair — the deficit is the
// hidden root, the virtue pole is the direction the answer-space opens.
// The distribution is mathematically balanced (12 questions per deficit,
// every day-topic touching all seven) and enforced by test: a question
// without a deficit, or a skewed week, cannot ship.
export const QUESTION_DEFICITS: Record<string, DeficitId> = {
  // The Source (Sunday) — pairs: pride×2, greed×2, craving×2, envy×2,
  // gluttony×2, wrath×1, sloth×1
  "src-1": "pride",     // the unspoken conviction → humility's plain speech
  "src-2": "pride",     // performed certainty → admitted doubt
  "src-3": "greed",     // earning the unearnable → grace received
  "src-4": "greed",     // self-securing → the open hand
  "src-5": "lust",      // the chased experience → what finally lasts
  "src-6": "lust",      // love clenched into possession → holding lightly
  "src-7": "envy",      // comparison of faiths → celebrating another's peace
  "src-8": "envy",      // the begrudged good → the examined hunger
  "src-9": "gluttony",  // the false consolation → what restores
  "src-10": "gluttony", // the comfort become cage → set down
  "src-11": "wrath",    // anger in the spiritual story → laid down
  "src-12": "sloth",    // the let-die practice → picked up this week
  // Beginnings (Monday) — pairs: greed×2, craving×2, envy×2, gluttony×2,
  // wrath×2, pride×1, sloth×1
  "beg-1": "greed",     // clinging to the ending → release
  "beg-2": "greed",     // the impressive beginning → the honest one
  "beg-3": "lust",      // the chase of new → the calling discerned
  "beg-4": "lust",      // wanting that never satisfied → its cost seen
  "beg-5": "envy",      // the faster starter → bitterness named
  "beg-6": "envy",      // the overlooked beginning → the applause released
  "beg-7": "gluttony",  // consumption as avoidance → the beginning made
  "beg-8": "gluttony",  // the comfort set down → room for the wanted thing
  "beg-9": "wrath",     // old anger carried forward → who it punishes
  "beg-10": "wrath",    // the forgiveness that unlocks the new
  "beg-11": "pride",    // shame that forbids → the attempt anyway
  "beg-12": "sloth",    // someday → the first physical step
  // Home & Street (Tuesday) — pairs: sloth×2, craving×2, envy×2,
  // gluttony×2, wrath×2, greed×1, pride×1
  "hom-1": "sloth",     // the invisible neighbour → the awakened eye
  "hom-2": "sloth",     // the walked-past problem → the first fix
  "hom-3": "lust",      // the arrival picture → whose eyes it serves
  "hom-4": "lust",      // wanting the neighbourhood → actually meeting it
  "hom-5": "envy",      // the compared house → the cost of comparing
  "hom-6": "envy",      // the neighbour's good news → the honest feeling
  "hom-7": "gluttony",  // consumption filling silence → the neighbour
  "hom-8": "gluttony",  // the unshareable comfort → the open table
  "hom-9": "wrath",     // the written-off neighbour → the story examined
  "hom-10": "wrath",    // the outlived conflict → someone going first
  "hom-11": "greed",    // enough house → need vs hunger
  "hom-12": "pride",    // the known self → the surprising truth
  // Work & Provision (Wednesday) — pairs: pride×2, sloth×2, craving×1,
  // envy×2, gluttony×2, wrath×2, greed×1
  "wor-1": "pride",     // the status ladder → the undervalued honoured
  "wor-2": "pride",     // the hidden struggle → known by someone
  "wor-3": "sloth",     // the buried gift → put to use
  "wor-4": "sloth",     // the abandoned calling → what happened
  "wor-5": "lust",      // success as being-seen → the performance named
  "wor-6": "envy",      // the envied career → the want beneath it
  "wor-7": "envy",      // the rival's success → the cost of celebrating
  "wor-8": "gluttony",  // surviving the week → what it replaces
  "wor-9": "gluttony",  // rest refused → the real sabbath
  "wor-10": "wrath",    // the working grudge → who pays at home
  "wor-11": "wrath",    // anger as fuel → or as poison
  "wor-12": "greed",    // enough — money, time, security → arrived?
  // Healing & Wholeness (Thursday) — pairs: pride×2, sloth×2, greed×2,
  // craving×1, gluttony×2, wrath×2, envy×1
  "hea-1": "pride",     // the polite mask → the honest answer
  "hea-2": "pride",     // the hidden wound → witnessed
  "hea-3": "sloth",     // the quiet struggle → the visit made
  "hea-4": "sloth",     // the unprescribed healing → given time
  "hea-5": "greed",     // the clenched grip → room to heal
  "hea-6": "greed",     // accumulation → energy for wholeness
  "hea-7": "lust",      // the craved escape → the cost to the reachers
  "hea-8": "gluttony",  // the emptying comfort → what actually helps
  "hea-9": "gluttony",  // wholeness → the thing given up
  "hea-10": "wrath",    // forgiveness → how it changed the carrying
  "hea-11": "wrath",    // the rehearsed hurt → the rehearsal put down
  "hea-12": "envy",     // "not for me" → wanting without resenting
  // Family & Generations (Friday) — pairs: pride×2, sloth×2, greed×2,
  // craving×2, envy×1, wrath×2, gluttony×1
  "fam-1": "pride",     // the inheritance → what stops with you
  "fam-2": "pride",     // the avoided conversation → its cost
  "fam-3": "sloth",     // the elder unasked → asked
  "fam-4": "sloth",     // the dying tradition → taught forward
  "fam-5": "greed",     // the family's need → the hardest gift given
  "fam-6": "greed",     // saved for someday → needed now
  "fam-7": "lust",      // the perfect-family picture → the real one
  "fam-8": "lust",      // loved as they are → or as hoped
  "fam-9": "envy",      // the family score → put down
  "fam-10": "wrath",    // the handed-down anger → stopped in your hands
  "fam-11": "wrath",    // the needed forgiveness → the first small act
  "fam-12": "gluttony", // the shared consumption → the starved table
  // Justice & the Common Good (Saturday) — pairs: sloth×2, pride×2,
  // greed×2, craving×2, envy×2, wrath×1, gluttony×1
  "jus-1": "sloth",     // the uncovered injustice → seen and said
  "jus-2": "sloth",     // the silence → its cost counted
  "jus-3": "pride",     // the plain truth → said to power
  "jus-4": "pride",     // the private word → said in public
  "jus-5": "greed",     // the extracted land → spoken for
  "jus-6": "greed",     // justice's price → honestly named
  "jus-7": "lust",      // the difference pictured → whose face
  "jus-8": "lust",      // the cause as image → the quiet giving
  "jus-9": "envy",      // the resented platform → the reach imagined
  "jus-10": "envy",     // the comparison → the joining
  "jus-11": "wrath",    // the blinding anger → banked into building
  "jus-12": "gluttony", // the defended comfort → who pays for it
};

/**
 * The gate: the deficit a question was written to probe, or null if the
 * question is not in the gated bank (e.g. a leader's custom question —
 * those answer to the leader, not to the gate).
 */
export function getDeficitForQuestion(questionId: string): RootDeficit | null {
  const id = QUESTION_DEFICITS[questionId];
  return id ? getDeficitById(id) : null;
}

/** Deficit ids actually used by the bank, with their question counts. */
export function deficitDistribution(): Record<DeficitId, number> {
  const counts = Object.fromEntries(
    ROOT_DEFICITS.map((d) => [d.id, 0])
  ) as Record<DeficitId, number>;
  for (const id of Object.values(QUESTION_DEFICITS)) counts[id]++;
  return counts;
}
