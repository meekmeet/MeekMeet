// The circle topics — one theme per day of the week.
//
// Every circle in the country that gathers on the same weekday sits with the
// same theme; the questions drawn within it are different for every member.
// The day gives the circle its structure; the draw keeps it from ever feeling
// like a repeat. The symbolism is deliberate: the week itself is the liturgy.
//
// HOW THE QUESTIONS ARE MADE (internal — see deficits.ts): the bank is not a
// list of nice questions with tags attached. Every question is authored from
// a (deficit → virtue) pair in the gate: the deficit is the hidden root the
// question probes, the virtue is the direction the answer-space opens. The
// bank is mathematically balanced — 84 questions, exactly 12 per root
// deficit, and every day-topic touches all seven deficits (a rotating
// 2/2/2/2/2/1/1 pattern across the week), so no night and no week is skewed.
// The gate map lives in deficits.ts and its balance is enforced by test.
//
// Questions are written to be SPOKEN — personal, concrete, answerable in a
// few honest sentences — because members read their written answers aloud.

export interface CircleTopicQuestion {
  id: string
  text: string
}

export interface CircleTopic {
  id: string
  /** 0 = Sunday … 6 = Saturday (JavaScript Date#getDay convention). */
  dayOfWeek: number
  name: string
  epithet: string
  /** Why this theme belongs to this day — read aloud by the leader. */
  symbolism: string
  questions: CircleTopicQuestion[]
}

export const CIRCLE_TOPICS: CircleTopic[] = [
  {
    id: 'the-source',
    dayOfWeek: 0,
    name: 'The Source',
    epithet: 'What sustains you',
    symbolism:
      'Sunday is the day of gathering in nearly every tradition — the day set apart. The week begins not with work but with the well it flows from: what sustains you, what you are grateful for, where the sacred shows up in an ordinary life.',
    questions: [
      // pride → humility
      { id: 'src-1', text: 'What do you believe in, in your own words, that you have never said out loud to a room of strangers?' },
      { id: 'src-2', text: 'When did you last pretend to be more certain than you are — and what would it cost to admit the doubt out loud?' },
      // greed → generosity
      { id: 'src-3', text: 'What are you still trying to earn — from God, from people — that was never for sale?' },
      { id: 'src-4', text: 'If you stopped securing your own life for one week, what would you finally give away — time, money, or attention?' },
      // craving → self-mastery
      { id: 'src-5', text: 'What experience do you keep chasing — the retreat, the high, the feeling — hoping this time it will finally last?' },
      { id: 'src-6', text: 'What do you love so tightly that it has stopped being love — a person, a dream, an image of how it should be?' },
      // envy → gratitude & sympathetic joy
      { id: 'src-7', text: 'Whose faith or peace do you quietly compare yours to — and what would change if you celebrated theirs instead?' },
      { id: 'src-8', text: 'What good thing in someone else\'s life do you struggle to be happy about — and what does that struggle tell you?' },
      // gluttony → temperance
      { id: 'src-9', text: 'When you are depleted, what do you reach for first — and is it the thing that actually restores you?' },
      { id: 'src-10', text: 'What comfort has quietly become a cage — something you once chose and now cannot put down?' },
      // wrath → patience & forgiveness
      { id: 'src-11', text: 'Who are you still angry at in your spiritual story — a church, a family, a God — and what would laying it down look like?' },
      // sloth → diligence & love-in-action
      { id: 'src-12', text: 'What practice once put you back together that you have quietly let die — and what would it take to pick it up this week?' },
    ],
  },
  {
    id: 'beginnings',
    dayOfWeek: 1,
    name: 'Beginnings',
    epithet: 'What you carry in, what you leave behind',
    symbolism:
      'Monday is the first sliver of the new moon — the week beginning again. Circles gathering today sit with beginnings: what we carry into a new stretch of time, what we set down, and what we are becoming.',
    questions: [
      // greed → release / open hand
      { id: 'beg-1', text: 'What are you clinging to that is already ending — a role, a plan, a version of yourself?' },
      { id: 'beg-2', text: 'What would you begin this year if it never had to be impressive or profitable to anyone?' },
      // craving → discernment
      { id: 'beg-3', text: 'What new thing are you chasing right now — and is it a calling, or just the next hit of new?' },
      { id: 'beg-4', text: 'When did wanting something badly ever finally satisfy you — and what did the wanting itself cost?' },
      // envy → joy in another's portion
      { id: 'beg-5', text: 'Whose beginning are you watching with a pinch of bitterness — someone who started after you and moved faster?' },
      { id: 'beg-6', text: 'What beginning of yours went unnoticed — and whose applause are you still quietly waiting for?' },
      // gluttony → action over consumption
      { id: 'beg-7', text: 'What do you consume to avoid beginning — the planning, the scrolling, the endless research?' },
      { id: 'beg-8', text: 'What comfort would you have to set down to make room for the thing you say you want to start?' },
      // wrath → forgiveness before the new
      { id: 'beg-9', text: 'What old anger do you carry into every new thing you try — and who does carrying it actually punish?' },
      { id: 'beg-10', text: 'Who would you need to forgive for this next stretch of your life to truly begin?' },
      // pride → humility to attempt
      { id: 'beg-11', text: 'What would you attempt this year if failing carried no shame — and who first taught you that failing was shameful?' },
      // sloth → the first step
      { id: 'beg-12', text: 'What is the first physical step — this week, not someday — of the thing you keep saying you will do?' },
    ],
  },
  {
    id: 'home-and-street',
    dayOfWeek: 2,
    name: 'Home & Street',
    epithet: 'The ground beneath your feet',
    symbolism:
      'Tuesday is deep in the working week — the day the house is felt most: its rent, its repairs, its neighbours, its street. Today the circle sits with the ground beneath our feet: where we live, who we live beside, and what "home" actually means.',
    questions: [
      // sloth → the awakened eye
      { id: 'hom-1', text: 'Who on your street is invisible — the person everyone passes and no one knows — and what would it take to change that?' },
      { id: 'hom-2', text: 'What is the one thing on your street that should be fixed first — and how long has everyone, including you, walked past it?' },
      // craving → contentment
      { id: 'hom-3', text: 'What would your home need to look like before you finally felt you had arrived — and whose eyes is that picture for?' },
      { id: 'hom-4', text: 'What do you want from your neighbourhood that the wanting has replaced actually meeting?' },
      // envy → gratitude for one's own ground
      { id: 'hom-5', text: 'Whose house, street, or life nearby do you compare yours to — and what does the comparing cost you?' },
      { id: 'hom-6', text: 'When a neighbour does well — the renovation, the new car, the good news — what is your first honest feeling, and what would you rather it be?' },
      // gluttony → the open table
      { id: 'hom-7', text: 'What do you consume at home — the food, the screens, the stuff — that fills the silence a neighbour could fill?' },
      { id: 'hom-8', text: 'What comfort of your household would be hardest to share — the space, the table, the quiet — and what would sharing it cost?' },
      // wrath → patience with the difficult neighbour
      { id: 'hom-9', text: 'Who on your street have you written off — the noisy one, the difficult one — and what is the story you tell yourself about them?' },
      { id: 'hom-10', text: 'What conflict near you has outlived its original cause — and what would it take for someone to go first?' },
      // greed → enough
      { id: 'hom-11', text: 'What does "enough house" mean to you — and is the gap between that and where you live a need, or a hunger?' },
      // pride → the unmasked neighbour
      { id: 'hom-12', text: 'What would your neighbours say they know about you — and what would genuinely surprise them to learn?' },
    ],
  },
  {
    id: 'work-and-provision',
    dayOfWeek: 3,
    name: 'Work & Provision',
    epithet: 'What we do, and whether it is enough',
    symbolism:
      'Wednesday is the hinge of the working week — the day labour is felt in the body. Today the circle sits with work and provision: what we do to live, whether it is enough, and what dignity in work actually looks like.',
    questions: [
      // pride → honour for the unseen
      { id: 'wor-1', text: 'Who does the most undervalued work in your community, and what would change if they were honoured properly?' },
      { id: 'wor-2', text: 'What is the hardest part of providing for the people you love — and who knows about it?' },
      // sloth → the gift taken out of the ground
      { id: 'wor-3', text: 'What skill or gift do you have that is currently going unused — and who in your street could use it?' },
      { id: 'wor-4', text: 'What did you want to be at fifteen — and what happened to that person?' },
      // craving → work without performance
      { id: 'wor-5', text: 'What success are you still chasing that, if you are honest, is about being seen — and who are you performing for?' },
      // envy → discernment under comparison
      { id: 'wor-6', text: 'Whose work or career do you envy — and what is the wanting underneath it actually asking for?' },
      { id: 'wor-7', text: 'When a colleague or rival does well, what happens inside you — and what would celebrating them cost?' },
      // gluttony → true rest
      { id: 'wor-8', text: 'What do you consume to survive the workweek — and what is it replacing?' },
      { id: 'wor-9', text: 'What would a real day of rest look like in your life — and what keeps you from taking it?' },
      // wrath → anger as fuel, not poison
      { id: 'wor-10', text: 'Who from your working life do you still hold a grudge against — and who pays for it when you come home?' },
      { id: 'wor-11', text: 'What injustice in your working world makes you angry — and is that anger still fuel, or has it become poison?' },
      // greed → enough
      { id: 'wor-12', text: 'What does "enough" mean to you — enough money, enough time, enough security — and are you there?' },
    ],
  },
  {
    id: 'healing-and-wholeness',
    dayOfWeek: 4,
    name: 'Healing & Wholeness',
    epithet: 'What hurts, and what helps',
    symbolism:
      'Thursday carries the week’s fatigue — the body and the mind are honest by now. Today the circle sits with healing: what hurts, what helps, who is lonely, and what it would take for people to be whole.',
    questions: [
      // pride → the honest answer
      { id: 'hea-1', text: 'How are you — honestly, not politely — and what would that honest answer have cost you to say a year ago?' },
      { id: 'hea-2', text: 'What wound are you still carrying that the people closest to you know nothing about — and what keeps it hidden?' },
      // sloth → care that crosses the room
      { id: 'hea-3', text: 'Who in your life is quietly struggling right now, and what have you done — or could you do this week — about it?' },
      { id: 'hea-4', text: 'What heals you that no doctor prescribes — and when did you last actually give it time?' },
      // greed → the unclenched life
      { id: 'hea-5', text: 'What are you holding so tightly — control, a plan, a grievance — that there is no room left in your hands to heal?' },
      { id: 'hea-6', text: 'What would you have to stop accumulating — achievements, opinions, worries — to have energy left for your own wholeness?' },
      // craving → presence over escape
      { id: 'hea-7', text: 'What escape do you crave when life hurts — and what is it costing the people who are trying to reach you?' },
      // gluttony → the true consolation
      { id: 'hea-8', text: 'What comfort do you run to when you are hurting that leaves you emptier — and what actually helps?' },
      { id: 'hea-9', text: 'What would becoming whole require you to give up — a habit, a crutch, a story about yourself?' },
      // wrath → the rehearsed hurt released
      { id: 'hea-10', text: 'What have you forgiven — or are you still working on forgiving — that changed how you carry yourself?' },
      { id: 'hea-11', text: 'Who hurt you in a way you still rehearse in your head — and what would putting the rehearsal down make room for?' },
      // envy → hope without resentment
      { id: 'hea-12', text: 'Whose recovery or peace do you look at and think "not for me" — and what would it mean to want it without resenting it?' },
    ],
  },
  {
    id: 'family-and-generations',
    dayOfWeek: 5,
    name: 'Family & Generations',
    epithet: 'What we inherit, what we pass on',
    symbolism:
      'Friday gathers families across traditions — the day of congregation, the evening the Sabbath begins. Today the circle sits with generations: the family we were born into, the one we are building, and what we are passing on.',
    questions: [
      // pride → the honest inheritance
      { id: 'fam-1', text: 'What did your family of origin give you that you are grateful for — and what are you determined not to pass on?' },
      { id: 'fam-2', text: 'What is the hardest conversation you need to have with someone in your family — and what is avoiding it costing you?' },
      // sloth → honour for the elders, transmission of the tradition
      { id: 'fam-3', text: 'Who is the elder in your life whose wisdom you draw on — and when did you last actually ask them anything?' },
      { id: 'fam-4', text: 'What tradition, recipe, song, or ritual from your family or faith is quietly dying — and who could carry it if you taught them?' },
      // greed → the gift given now
      { id: 'fam-5', text: 'What does your family need more of right now — time, money, forgiveness, or presence — and which is hardest for you to give?' },
      { id: 'fam-6', text: 'What are you saving for someday that your family needs now?' },
      // craving → loving the real family
      { id: 'fam-7', text: 'What picture of the perfect family do you still measure your real one against — and what has the measuring cost?' },
      { id: 'fam-8', text: 'Who in your family do you love as they are — and who do you love as the person you keep hoping they will become?' },
      // envy → the score put down
      { id: 'fam-9', text: 'Which sibling, cousin, or relative got the version of the family you wanted — and what would it mean to stop keeping that score?' },
      // wrath → the chain broken here
      { id: 'fam-10', text: 'What anger has been handed down your family line — and where could it stop, in your hands, in this generation?' },
      { id: 'fam-11', text: 'Who in your family do you need to forgive — and what is the first small act of that forgiveness?' },
      // gluttony → the table that feeds more than appetite
      { id: 'fam-12', text: 'What does your family consume together — the food, the screens, the busyness — that fills the time but starves the table?' },
    ],
  },
  {
    id: 'justice-and-the-common-good',
    dayOfWeek: 6,
    name: 'Justice & the Common Good',
    epithet: 'The world we are responsible for',
    symbolism:
      'Saturday is the sabbath of action — the day the circle turns outward. Today we sit with justice: the systems we live under, the people they fail, and what ordinary meek people can actually do about it.',
    questions: [
      // sloth → the voice that speaks
      { id: 'jus-1', text: 'What injustice do you see up close — in your street, your workplace, your family — that the news never covers?' },
      { id: 'jus-2', text: 'When did you last speak up about something that mattered — and when did you stay silent, and what did the silence cost?' },
      // pride → the plain word in public
      { id: 'jus-3', text: 'What truth about your area do decision-makers need to hear, said plainly, from someone who actually lives it?' },
      { id: 'jus-4', text: 'What would you say in a public meeting that you have only ever said in private?' },
      // greed → the land kept, not extracted
      { id: 'jus-5', text: 'What does the environment around you — the creek, the trees, the air — need from the people who live near it, and who is speaking for it?' },
      { id: 'jus-6', text: 'What would you honestly be willing to pay — money, time, comfort — for your area to become more just?' },
      // craving → service without the spotlight
      { id: 'jus-7', text: 'When you picture yourself making a difference, whose face is in the picture — the people helped, or your own?' },
      { id: 'jus-8', text: 'What cause do you support more for how it looks than for what it does — and what would giving quietly change?' },
      // envy → joining instead of comparing
      { id: 'jus-9', text: 'Whose influence or platform do you resent — and what would you actually do with their reach if you had it?' },
      { id: 'jus-10', text: 'Who in your community is already doing good work you could join — and what stops you: their methods, or your comparison?' },
      // wrath → the fire banked into building
      { id: 'jus-11', text: 'What injustice makes you so angry you stop thinking clearly — and how could that fire be banked into something that builds?' },
      // gluttony → solidarity over comfort
      { id: 'jus-12', text: 'What comfort are you unwilling to be inconvenienced from — and who is paying the price for that unwillingness?' },
    ],
  },
]

export const CIRCLE_TOPIC_COUNT = CIRCLE_TOPICS.length

/** Every question id across every topic — unique across the whole bank. */
export function allTopicQuestionIds(): string[] {
  return CIRCLE_TOPICS.flatMap((t) => t.questions.map((q) => q.id))
}

export function getTopicById(id: string): CircleTopic | null {
  return CIRCLE_TOPICS.find((t) => t.id === id) ?? null
}

export function getTopicForWeekday(dayOfWeek: number): CircleTopic {
  const topic = CIRCLE_TOPICS.find((t) => t.dayOfWeek === dayOfWeek)
  // The bank is total over 0-6; a bad weekday is a programmer error.
  if (!topic) throw new Error(`No circle topic for weekday ${dayOfWeek}`)
  return topic
}

/**
 * The weekday of a date in the circle's home timezone (Australia/Sydney),
 * 0 = Sunday … 6 = Saturday. Circle themes follow the local day, not UTC.
 */
export function sydneyWeekday(date: Date): number {
  const name = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    weekday: 'short',
  }).format(date)
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  }
  const day = map[name]
  if (day === undefined) throw new Error(`Unrecognised weekday: ${name}`)
  return day
}

/** The topic a circle gathering at `date` sits with. */
export function getTopicForDate(date: Date): CircleTopic {
  return getTopicForWeekday(sydneyWeekday(date))
}

export interface DrawOptions {
  /** Question ids already in play — never drawn again for this member. */
  excludeIds?: string[]
  /** Injectable for deterministic tests; defaults to Math.random. */
  random?: () => number
}

/**
 * Draw `count` questions from a topic at random, without replacement.
 * If the pool (after exclusions) is smaller than `count`, the whole pool is
 * returned shuffled. This is the "the questions are never fixed" engine:
 * every member of a circle draws their own set from the day's theme.
 */
export function drawQuestions(
  topic: CircleTopic,
  count: number,
  options: DrawOptions = {}
): CircleTopicQuestion[] {
  const excluded = new Set(options.excludeIds ?? [])
  const pool = topic.questions.filter((q) => !excluded.has(q.id))
  const random = options.random ?? Math.random

  // Fisher–Yates shuffle of a copy.
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, Math.max(0, Math.min(count, shuffled.length)))
}
