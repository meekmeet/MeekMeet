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

/** The societal family — what holds back the progress of a people. */
export type SocietalDeficitId =
  | "stagnation"
  | "fragmentation"
  | "helplessness"
  | "short_sightedness"
  | "gatekeeping";

export type AnyDeficitId = DeficitId | SocietalDeficitId;

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
  id: AnyDeficitId;
  /** personal = the seven, what holds a person back; societal = the five, what holds a people back. */
  kind: "personal" | "societal";
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
    kind: "personal",
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
    kind: "personal",
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
    kind: "personal",
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
    kind: "personal",
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
    kind: "personal",
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
    kind: "personal",
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
    kind: "personal",
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

/**
 * The five societal deficits — the threshold family. Where the seven hold a
 * PERSON back, these hold a PEOPLE back: the brakes on human progress that
 * the threshold questions (threshold.ts) are authored from. Same shape, same
 * interfaith spine, same rule: invisible to members, visible in The Gate.
 */
export const SOCIETAL_DEFICITS: RootDeficit[] = [
  {
    id: "stagnation",
    kind: "societal",
    name: "Stagnation",
    essence:
      "The settled-for world: 'that's just how things are here.' A culture that has stopped expecting tomorrow to be better than today — behind the rest of the world in ways it no longer even notices, accepting as permanent what elsewhere is already solved.",
    parallels: {
      buddhism: "clinging to the present form — anicca (impermanence) denied",
      islam: "'sufficient for us is what we found our fathers doing' (Qur'an 2:170) — the inherited refusal to look forward",
      judaism: "'nothing new under the sun' read as despair instead of a charge",
      hinduism: "tamas at the scale of a society — inertia become culture",
      sikhism: "the ever-creating Creator (karta purakh) — and a people who stopped creating with him",
      classical: "the late republic looking backward — Rome mourning itself",
    },
    virtue: {
      name: "Momentum",
      essence:
        "The expectation of progress made practical: catching up where we are behind, then going further — small wins compounded until the culture believes in tomorrow again.",
      parallels: {
        buddhism: "the wheel set turning — the dharma that moves",
        islam: "'God does not change the condition of a people until they change what is in themselves' (13:11)",
        judaism: "'go forward' — the sea opens only after the first step in",
        hinduism: "karma yoga at civilisational scale — motion as worship",
        sikhism: "chardhi kala — the ever-rising spirit",
        classical: "the pioneer virtue — the city always building",
      },
    },
  },
  {
    id: "fragmentation",
    kind: "societal",
    name: "Fragmentation",
    essence:
      "The silo: knowledge, people and effort divided against itself. Every field reinventing what the next one knows, every community solving alone what is already solved next door, every congregation certain the others are the problem.",
    parallels: {
      buddhism: "the divided sangha — schism named as the first warning",
      islam: "'hold fast to the rope of God and do not be divided' (3:103)",
      judaism: "sinat chinam — the causeless hatred the sages say felled the Temple",
      hinduism: "duty pursued without union — the kula at war with itself",
      sikhism: "'there is no Hindu, there is no Muslim' — division refused at the root",
      classical: "divide et impera turned inward — a people conquered by its own pieces",
    },
    virtue: {
      name: "Cohesion",
      essence:
        "Many hands, one table: the mosque and the church and the secular club sharing what each holds alone — effort that compounds because it is joined.",
      parallels: {
        buddhism: "the four immeasurables practised together, not alone",
        islam: "the ummah — one body, many members",
        judaism: "kol yisrael areivim — all of one people, responsible for one another",
        hinduism: "vasudhaiva kutumbakam — the world as one family",
        sikhism: "langar — the one table that seats everyone",
        classical: "concordia — the Roman dream that outlived Rome",
      },
    },
  },
  {
    id: "helplessness",
    kind: "societal",
    name: "Helplessness",
    essence:
      "Learned dependency: waiting for permission, for government, for someone. A people who have quietly handed their agency away and now watch their own streets as spectators — certain that change is something that happens to them.",
    parallels: {
      buddhism: "the raft refused — 'be a lamp unto yourself'",
      islam: "the condition unchanged because the selves were (13:11, the other edge)",
      judaism: "'why do you cry out to me? Tell the people to go forward' (Ex 14:15)",
      hinduism: "'lift yourself by yourself' (Gita 6:5)",
      sikhism: "kirat karni denied — dignity traded for waiting",
      classical: "the client at the patron's door — the citizen who forgot he was one",
    },
    virtue: {
      name: "Agency",
      essence:
        "The lamp lit: ordinary people starting without permission — the street fixed by its own residents, the problem owned by whoever saw it first.",
      parallels: {
        buddhism: "self-reliance on the path — the work of crossing is yours",
        islam: "tawakkul after the camel is tied — trust that acts first",
        judaism: "the partnership of creation — 'the work is not yours to finish, nor are you free to desist'",
        hinduism: "svadharma — one's own duty, taken up",
        sikhism: "seva begun without being asked",
        classical: "civitas — the citizen who builds",
      },
    },
  },
  {
    id: "short_sightedness",
    kind: "societal",
    name: "Short-sightedness",
    essence:
      "The election-cycle mind: what wins this year weighed against what our grandchildren need — and the grandchildren lose. The harvest eaten, the seed forgotten, the twenty-year build that no one will start because no one will cut the ribbon.",
    parallels: {
      buddhism: "the unseen long consequence — karmic time ignored",
      islam: "'did they not see what generations before them did?' — the denied lesson",
      judaism: "'choose life, that your descendants may live' (Deut 30:19)",
      hinduism: "dharma owed seven generations forward",
      sikhism: "time held in trust for the ages — the sahib of all seasons",
      classical: "the seed corn eaten — the oldest story of civilisational decline",
    },
    virtue: {
      name: "Foresight",
      essence:
        "The long now: building what you will never cut the ribbon on, planting shade you will never sit in — the future treated as a neighbour who is coming to stay.",
      parallels: {
        buddhism: "the long view of suffering and its ending — across lives",
        islam: "'be in this world as a stranger' — building for a longer home",
        judaism: "the command to plant even as the days end — 'plant a carob tree'",
        hinduism: "the rishi's horizon — thought measured in yugas",
        sikhism: "the langar that outlives its builders",
        classical: "the Roman roads — infrastructure as a love letter to the unborn",
      },
    },
  },
  {
    id: "gatekeeping",
    kind: "societal",
    name: "Gatekeeping",
    essence:
      "The toll booth: knowledge, tools, medicine and opportunity locked behind price, credential and connection — so the people who need them most stand outside doors their own community owns. Access hoarded is progress withheld.",
    parallels: {
      buddhism: "the dharma sold — the teaching that once had no price",
      islam: "'do not devour one another's wealth unjustly' — the hoarded key",
      judaism: "'do not withhold the wages of the hired hand' — the ladder pulled up",
      hinduism: "the ashram gate closed to the low-born — wisdom withheld",
      sikhism: "langar's opposite — the meal served behind a wall",
      classical: "the mysteries kept from the many — knowledge as aristocracy",
    },
    virtue: {
      name: "Open Access",
      essence:
        "The ladder let down: the public library of every tool, the clinic that is actually reachable, the knowledge that moves at the speed of need — progress measured by who it reaches.",
      parallels: {
        buddhism: "the teaching given freely to all who ask",
        islam: "the pursuit of knowledge 'from cradle to grave' — for every believer",
        judaism: "'teach them diligently to your children' — wisdom as public property",
        hinduism: "vidya dadaati vinayam — knowledge that liberates, given freely",
        sikhism: "the langar doors open to all — no one outside the kitchen",
        classical: "the agora — the open square where every citizen speaks",
      },
    },
  },
];

export const ALL_DEFICITS: RootDeficit[] = [...ROOT_DEFICITS, ...SOCIETAL_DEFICITS];

export function getDeficitById(id: string): RootDeficit | null {
  return ALL_DEFICITS.find((d) => d.id === id) ?? null;
}

// ── The gate map ───────────────────────────────────────────────
// Every circle-topics question id → the root deficit it was AUTHORED from.
// The bank is written from the gate, not tagged after the fact: each
// question is built from a (deficit → virtue) pair under the bridge rule —
// chamber one names the hidden root, chamber two turns the answer toward
// what the circle, the street, or the country can do. The distribution is
// mathematically perfect (147 questions: 21 per deficit, exactly 3 per
// deficit within every day-topic) and enforced by test: a question without
// a deficit, or a skewed week, cannot ship.
export const QUESTION_DEFICITS: Record<string, DeficitId> = {
  // The Source (Sunday) — 3 each: pride, greed, craving, envy, gluttony,
  // wrath, sloth
  "src-1": "pride",     // the unspoken conviction → said plainly for the street
  "src-2": "pride",     // performed certainty → admitted doubt that frees another
  "src-3": "pride",     // the cost of faith → worth it if one finds footing
  "src-4": "greed",     // earning the unearnable → the freed energy
  "src-5": "greed",     // self-securing → the open hand felt on the street
  "src-6": "greed",     // more than enough → whose week it would change
  "src-7": "lust",      // the chased experience → what outlasts the feeling
  "src-8": "lust",      // love clenched into possession → held lightly, given
  "src-9": "lust",      // wanting past the got → wanting what outlasts us
  "src-10": "envy",     // the compared faith → celebrated instead
  "src-11": "envy",     // the begrudged good → the energy redeployed
  "src-12": "envy",     // envying the street's missing gift → championing it
  "src-13": "gluttony", // the depletion reach → the hour given to a neighbour
  "src-14": "gluttony", // the comfort become cage → the hours released
  "src-15": "gluttony", // the private consumption → the table that feeds two
  "src-16": "wrath",    // anger in the spiritual story → freed to build
  "src-17": "wrath",    // the grievance taught by example → a better inheritance
  "src-18": "wrath",    // the awaited apology → the released years
  "src-19": "sloth",    // the let-die practice → the street waiting for it
  "src-20": "sloth",    // the abandoned showing-up → the noticed absence
  "src-21": "sloth",    // the smallest deferred love → named and done
  // Beginnings (Monday) — 3 each
  "beg-1": "greed",     // clinging to the ending → what it frees for others
  "beg-2": "greed",     // the unimpressive beginning → the suburb's gain
  "beg-3": "greed",     // the reserve held for someday → a tenth at work now
  "beg-4": "lust",      // the chase of new → discerned by what it does for others
  "beg-5": "lust",      // wanting that never satisfied → its cost to the watchers
  "beg-6": "lust",      // the restarted start → finishing as a gift
  "beg-7": "envy",      // the faster starter → asking instead of comparing
  "beg-8": "envy",      // the unnoticed beginning → the first to notice another's
  "beg-9": "envy",      // spectating a neighbour's start → one hour a week
  "beg-10": "gluttony", // consumption as avoidance → the imperfect first step
  "beg-11": "gluttony", // the comfort set down → who benefits when you do
  "beg-12": "gluttony", // research as hiding → learning by doing it badly once
  "beg-13": "wrath",    // old anger carried forward → who it punishes
  "beg-14": "wrath",    // the forgiveness that unlocks the new
  "beg-15": "wrath",    // the burning failure → fire that warms, not scorches
  "beg-16": "pride",    // shame that forbids → the attempt the suburb remembers
  "beg-17": "pride",    // the shame lesson → given back
  "beg-18": "pride",    // too qualified to start → seen starting badly
  "beg-19": "sloth",    // someday → the first physical step
  "beg-20": "sloth",    // the street's own beginning → who stands beside you
  "beg-21": "sloth",    // the year of about-to → said out loud in the circle
  // Home & Street (Tuesday) — 3 each
  "hom-1": "sloth",     // the invisible neighbour → changed this month
  "hom-2": "sloth",     // the walked-past problem → the first fix
  "hom-3": "sloth",     // the unsaid street knowledge → said to who should hear
  "hom-4": "lust",      // the arrival picture → whose eyes it serves
  "hom-5": "lust",      // wanting the neighbourhood → actually meeting it
  "hom-6": "lust",      // the dreamed-of elsewhere → loving here for a year
  "hom-7": "envy",      // the compared house → the cost of comparing
  "hom-8": "envy",      // the neighbour's good news → the honest feeling
  "hom-9": "envy",      // the coveted neighbour's gift → asking them to teach
  "hom-10": "gluttony", // consumption filling silence → the neighbour
  "hom-11": "gluttony", // the unshareable comfort → the open table
  "hom-12": "gluttony", // the wasted surplus → the family going without
  "hom-13": "wrath",    // the written-off neighbour → the story examined
  "hom-14": "wrath",    // the outlived conflict → someone going first
  "hom-15": "wrath",    // the daily irritation never named → why them not you
  "hom-16": "greed",    // enough house → need vs hunger
  "hom-17": "greed",    // the empty room → the one who is cramped
  "hom-18": "greed",    // the street's pooled plenty → what you'd stop buying
  "hom-19": "pride",    // the known self → the surprising truth
  "hom-20": "pride",    // the unshared skill → the street allowed to benefit
  "hom-21": "pride",    // asking as normal → the offer in return
  // Work & Provision (Wednesday) — 3 each
  "wor-1": "pride",     // the status ladder → the undervalued honoured
  "wor-2": "pride",     // the hidden struggle → known by someone
  "wor-3": "pride",     // the unclapped work → clapping for the invisible
  "wor-4": "sloth",     // the buried gift → put to use on the street
  "wor-5": "sloth",     // the abandoned calling → what happened
  "wor-6": "sloth",     // the hard-won lesson → offered freely to the new
  "wor-7": "lust",      // success as being-seen → the performance named
  "wor-8": "lust",      // the invisible title → what the answer tells you
  "wor-9": "lust",      // the endless upgrade → the work never made better
  "wor-10": "envy",     // the envied career → the want beneath it
  "wor-11": "envy",     // the rival's success → the cost of celebrating
  "wor-12": "envy",     // the better rival → learned from, not measured against
  "wor-13": "gluttony", // surviving the week → what it replaces
  "wor-14": "gluttony", // rest refused → the real sabbath
  "wor-15": "gluttony", // the unneeded purchase → the hours spent differently
  "wor-16": "wrath",    // the working grudge → who pays at home
  "wor-17": "wrath",    // anger as fuel → or as poison
  "wor-18": "wrath",    // the watched unfairness → the silence's victim
  "wor-19": "greed",    // enough — money, time, security → arrived?
  "wor-20": "greed",    // the doubled income → what the community gains
  "wor-21": "greed",    // the unshared money wisdom → the drowning neighbour
  // Healing & Wholeness (Thursday) — 3 each
  "hea-1": "pride",     // the polite mask → the honest answer
  "hea-2": "pride",     // the hidden wound → witnessed
  "hea-3": "pride",     // the pretended fine → who deserves the truth
  "hea-4": "sloth",     // the quiet struggle → the visit made
  "hea-5": "sloth",     // the unprescribed healing → the neighbour who needs it
  "hea-6": "sloth",     // the months-deferred check-in → who waits on it
  "hea-7": "greed",     // the clenched grip → room to heal
  "hea-8": "greed",     // accumulation → energy for wholeness
  "hea-9": "greed",     // the kept comfort → the faster healing given away
  "hea-10": "lust",     // the craved escape → the cost to the reachers
  "hea-11": "lust",     // the isolating reach → the harder one that works
  "hea-12": "lust",     // the pain carried alone → carried together
  "hea-13": "gluttony", // the emptying comfort → what actually helps
  "hea-14": "gluttony", // wholeness → the thing given up
  "hea-15": "gluttony", // the binge → what it stands guard over
  "hea-16": "wrath",    // forgiveness → how it changed the carrying
  "hea-17": "wrath",    // the rehearsed hurt → the rehearsal put down
  "hea-18": "wrath",    // anger at the self → gentleness that frees others
  "hea-19": "envy",     // "not for me" → wanting without resenting
  "hea-20": "envy",     // the disqualified pain → allowed to matter
  "hea-21": "envy",     // the envied strength → learnable; yours unseen
  // Family & Generations (Friday) — 3 each
  "fam-1": "pride",     // the inheritance → what stops with you
  "fam-2": "pride",     // the avoided conversation → its cost
  "fam-3": "pride",     // the shame carried alone → said in the circle
  "fam-4": "sloth",     // the elder unasked → asked
  "fam-5": "sloth",     // the dying tradition → taught forward
  "fam-6": "sloth",     // the unrecorded story → recorded before it is lost
  "fam-7": "greed",     // the family's need → the hardest gift given
  "fam-8": "greed",     // saved for someday → needed now, on the street too
  "fam-9": "greed",     // the non-money inheritance → built for someone
  "fam-10": "lust",     // the perfect-family picture → the real one
  "fam-11": "lust",     // loved as they are → or as hoped
  "fam-12": "lust",     // the family success chase → who is exhausted by it
  "fam-13": "envy",     // the family score → put down
  "fam-14": "envy",     // the watched other family → building your own
  "fam-15": "envy",     // what theirs had → what yours can give
  "fam-16": "wrath",    // the handed-down anger → stopped in your hands
  "fam-17": "wrath",    // the needed forgiveness → the first small act
  "fam-18": "wrath",    // the argument older than its reason → first to put down
  "fam-19": "gluttony", // the shared consumption → the starved table
  "fam-20": "gluttony", // the dark screens → who resists and why
  "fam-21": "gluttony", // the table ritual → brought back
  // Justice & the Common Good (Saturday) — 3 each
  "jus-1": "sloth",     // the uncovered injustice → seen and said
  "jus-2": "sloth",     // the silence → its cost counted
  "jus-3": "sloth",     // the unknown-to-power knowledge → put in front of them
  "jus-4": "pride",     // the plain truth → said to power
  "jus-5": "pride",     // the private word → said in public
  "jus-6": "pride",     // the standing-protecting silence → spent anyway
  "jus-7": "greed",     // the extracted land → spoken for
  "jus-8": "greed",     // justice's price → honestly named
  "jus-9": "greed",     // the commons used by few → opened to the many
  "jus-10": "lust",     // the difference pictured → whose face
  "jus-11": "lust",     // the cause as image → the quiet giving
  "jus-12": "lust",     // the posted-but-never-acted → the smallest real act
  "jus-13": "envy",     // the resented platform → the reach imagined
  "jus-14": "envy",     // the comparison → the joining
  "jus-15": "envy",     // the criticised good work → offered strength
  "jus-16": "wrath",    // the blinding anger → banked into building
  "jus-17": "wrath",    // the despised public figure → prayed for, studied
  "jus-18": "wrath",    // the unaddressed old wrong → who still carries it
  "jus-19": "gluttony", // the defended comfort → who pays for it
  "jus-20": "gluttony", // the distant true cost → seen
  "jus-21": "gluttony", // the month of giving up → the street's family breathing
};

/**
 * The threshold gate map: every threshold question (threshold.ts) → the
 * societal deficit it was authored from. Balanced 4 per societal deficit and
 * test-enforced, exactly like the personal gate.
 */
export const THRESHOLD_DEFICITS: Record<string, SocietalDeficitId> = {
  // Stagnation → Momentum
  "thr-1": "stagnation",  // where we are behind → why catching up matters
  "thr-2": "stagnation",  // "just how things are" → already solved elsewhere
  "thr-3": "stagnation",  // five years out → what actually stops it
  "thr-4": "stagnation",  // seen momentum → what set it moving
  // Fragmentation → Cohesion
  "thr-5": "fragmentation",  // the two groups not talking → if they did
  "thr-6": "fragmentation",  // the same problem solved separately
  "thr-7": "fragmentation",  // what each holds alone → shared
  "thr-8": "fragmentation",  // strangers combining → seen once
  // Helplessness → Agency
  "thr-9": "helplessness",   // waiting for "someone" → who is the someone
  "thr-10": "helplessness",  // no permission, no budget → done anyway
  "thr-11": "helplessness",  // the skill the street lacks → held nearby
  "thr-12": "helplessness",  // the ordinary person who simply started
  // Short-sightedness → Foresight
  "thr-13": "short_sightedness",  // this decision → the grandchildren's verdict
  "thr-14": "short_sightedness",  // the ten-year build → no cycle long enough
  "thr-15": "short_sightedness",  // untaught now → desperately needed later
  "thr-16": "short_sightedness",  // the shade you will never sit in
  // Gatekeeping → Open Access
  "thr-17": "gatekeeping",  // locked behind price or credential
  "thr-18": "gatekeeping",  // technology's open door → who is still outside
  "thr-19": "gatekeeping",  // access on paper → unreachable in practice
  "thr-20": "gatekeeping",  // the doors opened after hours → what we'd become
};

/**
 * The gate: the deficit a question was authored from, or null if the
 * question is not in the gated banks (e.g. a leader's custom question —
 * those answer to the leader, not to the gate).
 */
export function getDeficitForQuestion(questionId: string): RootDeficit | null {
  const id = QUESTION_DEFICITS[questionId] ?? THRESHOLD_DEFICITS[questionId];
  return id ? getDeficitById(id) : null;
}

/** Deficit ids actually used by the day-topic bank, with their question counts. */
export function deficitDistribution(): Record<DeficitId, number> {
  const counts = Object.fromEntries(
    ROOT_DEFICITS.map((d) => [d.id, 0])
  ) as Record<DeficitId, number>;
  for (const id of Object.values(QUESTION_DEFICITS)) counts[id]++;
  return counts;
}

/** Societal deficit ids used by the threshold bank, with question counts. */
export function thresholdDeficitDistribution(): Record<SocietalDeficitId, number> {
  const counts = Object.fromEntries(
    SOCIETAL_DEFICITS.map((d) => [d.id, 0])
  ) as Record<SocietalDeficitId, number>;
  for (const id of Object.values(THRESHOLD_DEFICITS)) counts[id]++;
  return counts;
}
