// The circle topics — one theme per day of the week.
//
// Every circle in the country that gathers on the same weekday sits with the
// same theme; the questions drawn within it are different for every member.
// The day gives the circle its structure; the draw keeps it from ever feeling
// like a repeat. The symbolism is deliberate: the week itself is the liturgy.
//
// HOW THE QUESTIONS ARE MADE (internal — see deficits.ts): the bank is not a
// list of nice questions with tags attached. Every question is authored from
// a (deficit → virtue) pair in the gate, under THE BRIDGE RULE: a question
// passes the gate only if it crosses from the personal root to the productive
// turn. Chamber one names what holds YOU back (the deficit); chamber two
// lands on what the circle, the street, or the country can actually DO with
// the answer (the virtue made civic). A question that ends inside the person
// is therapy, not a circle — it fails the gate. A question with no inner root
// is a survey — it fails too. The personal is the engine; the productive is
// the direction.
//
// The bank is mathematically balanced — 147 questions: 21 per day-topic,
// exactly 3 per root deficit within every topic, and exactly 21 per deficit
// across the week, so no night and no week is skewed. The gate map lives in
// deficits.ts and its balance is enforced by test.
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
      // pride → humility (the plain word, given away)
      { id: 'src-1', text: 'What do you believe in, in your own words, that you have never said out loud to a room of strangers — and who in your street might need to hear it said plainly?' },
      { id: 'src-2', text: 'When did you last pretend to be more certain than you are — and what would admitting the doubt out loud make possible for someone else who is pretending too?' },
      { id: 'src-3', text: 'What has your faith, or your honest lack of it, actually cost you — and what might it be worth if one person found their footing because you said it truthfully?' },
      // greed → generosity (the open hand)
      { id: 'src-4', text: 'What are you still trying to earn — from God, from people — that was never for sale, and what would you do with the energy if you stopped?' },
      { id: 'src-5', text: 'If you stopped securing your own life for one week, what would you finally give away — time, money, or attention — and who in your street would feel it first?' },
      { id: 'src-6', text: 'What do you have more than enough of — and whose week would change if it started moving?' },
      // craving → self-mastery (what outlasts the feeling)
      { id: 'src-7', text: 'What experience do you keep chasing — the retreat, the high, the feeling — hoping this time it will last, and what could you build instead that would outlast the feeling?' },
      { id: 'src-8', text: 'What do you love so tightly that it has stopped being love — and what would holding it more lightly free you to give?' },
      { id: 'src-9', text: 'What do you want right now that you would simply want past if you got it — and what do you want for your community that would still matter in twenty years?' },
      // envy → gratitude & sympathetic joy
      { id: 'src-10', text: 'Whose faith or peace do you quietly compare yours to — and what would change for both of you if you celebrated theirs instead?' },
      { id: 'src-11', text: 'What good thing in someone else\'s life do you struggle to be happy about — and what would you build with that energy if you stopped auditing them?' },
      { id: 'src-12', text: 'Whose gifts do you envy that your own street is actually missing — and what stops you from championing theirs instead of resenting it?' },
      // gluttony → temperance (the hour given back)
      { id: 'src-13', text: 'When you are depleted, what do you reach for first — and what would your street look like if even one evening a week, that hour went to a neighbour instead?' },
      { id: 'src-14', text: 'What comfort has quietly become a cage — and what could you do with the hours it holds if you opened the door?' },
      { id: 'src-15', text: 'What do you consume in private that you would never offer a guest — and what would change if your table had to feed two?' },
      // wrath → patience & forgiveness
      { id: 'src-16', text: 'Who are you still angry at in your spiritual story — a church, a family, a God — and what would laying it down free you to build?' },
      { id: 'src-17', text: 'What grievance do you carry that your children or neighbours are quietly learning from you — and what do you want them to inherit instead?' },
      { id: 'src-18', text: 'Whose apology are you waiting for that you could stop waiting for — and what would the released years be good for?' },
      // sloth → diligence & love-in-action
      { id: 'src-19', text: 'What practice once put you back together that you have quietly let die — and who in your street is waiting, without knowing it, for you to pick it back up?' },
      { id: 'src-20', text: 'What have you stopped showing up for — and who noticed your absence and said nothing?' },
      { id: 'src-21', text: 'What is the smallest act of love you could do this week that you keep deferring — and who exactly is it for?' },
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
      { id: 'beg-1', text: 'What are you clinging to that is already ending — a role, a plan, a version of yourself — and who could use what it frees up?' },
      { id: 'beg-2', text: 'What would you begin this year if it never had to be impressive or profitable — and what would your suburb gain if you began it anyway?' },
      { id: 'beg-3', text: 'What are you holding in reserve — money, skill, time — for a someday that keeps not arriving, and what would putting a tenth of it to work this month change?' },
      // craving → discernment
      { id: 'beg-4', text: 'What new thing are you chasing right now — and is it a calling, or just the next hit of new — and how would you tell the difference by what it does for anyone else?' },
      { id: 'beg-5', text: 'When did wanting something badly ever finally satisfy you — and what did the wanting itself cost the people watching you chase?' },
      { id: 'beg-6', text: 'What are you about to start that you have started before — and what would finishing it, this time, hand to the people around you?' },
      // envy → joy in another's portion
      { id: 'beg-7', text: 'Whose beginning are you watching with a pinch of bitterness — someone who started after you and moved faster — and what would you learn from them if you asked instead of compared?' },
      { id: 'beg-8', text: 'What beginning of yours went unnoticed — and whose beginning could you be the first to notice this month?' },
      { id: 'beg-9', text: 'Who in your street is starting something right now that you could strengthen with one hour a week — and what is keeping you spectating?' },
      // gluttony → action over consumption
      { id: 'beg-10', text: 'What do you consume to avoid beginning — the planning, the scrolling, the endless research — and what would the first imperfect step look like this week?' },
      { id: 'beg-11', text: 'What comfort would you have to set down to make room for the thing you say you want to start — and who benefits when you finally do?' },
      { id: 'beg-12', text: 'What have you read, watched, or saved about the thing you want to do — and how much of it would you have learned by simply doing it badly once?' },
      // wrath → forgiveness before the new
      { id: 'beg-13', text: 'What old anger do you carry into every new thing you try — and who does carrying it actually punish?' },
      { id: 'beg-14', text: 'Who would you need to forgive for this next stretch of your life to truly begin — and what would beginning look like if you did?' },
      { id: 'beg-15', text: 'What failure still burns when you remember it — and what could that fire warm instead of scorch?' },
      // pride → humility to attempt
      { id: 'beg-16', text: 'What would you attempt this year if failing carried no shame — and which of those attempts would your suburb still be talking about in ten years?' },
      { id: 'beg-17', text: 'Who first taught you that failing was shameful — and what would you attempt now if you gave that lesson back?' },
      { id: 'beg-18', text: 'What are you too experienced, too qualified, or too old to be seen starting — and who needs to see you start it badly and keep going?' },
      // sloth → the first step
      { id: 'beg-19', text: 'What is the first physical step — this week, not someday — of the thing you keep saying you will do?' },
      { id: 'beg-20', text: 'What beginning belongs to your street, not just to you — something only your neighbourhood could start — and who would you need beside you?' },
      { id: 'beg-21', text: 'What have you been about to do for over a year — and what would you need to say out loud in this circle to finally be past the about?' },
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
      { id: 'hom-1', text: 'Who on your street is invisible — the person everyone passes and no one knows — and what would it take to change that this month?' },
      { id: 'hom-2', text: 'What is the one thing on your street that should be fixed first — and how long has everyone, including you, walked past it?' },
      { id: 'hom-3', text: 'What do you know about your street\'s problems that you have never written down or said aloud — and who should hear it?' },
      // craving → contentment
      { id: 'hom-4', text: 'What would your home need to look like before you finally felt you had arrived — and whose eyes is that picture for?' },
      { id: 'hom-5', text: 'What do you want from your neighbourhood that the wanting has replaced actually meeting?' },
      { id: 'hom-6', text: 'What house, street, or suburb do you dream of instead — and what would loving the one you are in for one year actually require?' },
      // envy → gratitude for one's own ground
      { id: 'hom-7', text: 'Whose house, street, or life nearby do you compare yours to — and what does the comparing cost you?' },
      { id: 'hom-8', text: 'When a neighbour does well — the renovation, the new car, the good news — what is your first honest feeling, and what would you rather it be?' },
      { id: 'hom-9', text: 'What has a neighbour built or grown that you quietly wish was yours — and what would you ask them to teach you if envy were not in the way?' },
      // gluttony → the open table
      { id: 'hom-10', text: 'What do you consume at home — the food, the screens, the stuff — that fills the silence a neighbour could fill?' },
      { id: 'hom-11', text: 'What comfort of your household would be hardest to share — the space, the table, the quiet — and what would sharing it cost?' },
      { id: 'hom-12', text: 'What does your household throw away, waste, or leave unused that another family on your street is going without?' },
      // wrath → patience with the difficult neighbour
      { id: 'hom-13', text: 'Who on your street have you written off — the noisy one, the difficult one — and what is the story you tell yourself about them?' },
      { id: 'hom-14', text: 'What conflict near you has outlived its original cause — and what would it take for someone to go first?' },
      { id: 'hom-15', text: 'What irritates you daily about your street that you have never once tried to fix or even name to anyone — and why them and not you?' },
      // greed → enough
      { id: 'hom-16', text: 'What does "enough house" mean to you — and is the gap between that and where you live a need, or a hunger?' },
      { id: 'hom-17', text: 'What space in your home sits empty or underused while someone you know is cramped, couch-surfing, or priced out?' },
      { id: 'hom-18', text: 'If your street pooled what it already has — tools, space, skills, time — what would you all stop needing to buy?' },
      // pride → the unmasked neighbour
      { id: 'hom-19', text: 'What would your neighbours say they know about you — and what would genuinely surprise them to learn?' },
      { id: 'hom-20', text: 'What are you quietly good at that your street has never been allowed to benefit from?' },
      { id: 'hom-21', text: 'What would you ask for help with if your street were the kind of place where asking was normal — and what would you offer in return?' },
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
      { id: 'wor-3', text: 'What work do you do that no one claps for — and who else does invisible work you could start clapping for?' },
      // sloth → the gift taken out of the ground
      { id: 'wor-4', text: 'What skill or gift do you have that is currently going unused — and who in your street could use it?' },
      { id: 'wor-5', text: 'What did you want to be at fifteen — and what happened to that person?' },
      { id: 'wor-6', text: 'What have you learned the hard way that someone starting out is about to learn painfully — and when did you last offer it freely?' },
      // craving → work without performance
      { id: 'wor-7', text: 'What success are you still chasing that, if you are honest, is about being seen — and who are you performing for?' },
      { id: 'wor-8', text: 'What would you do for work if the title and the salary were invisible to everyone but you — and what does that answer tell you about your current week?' },
      { id: 'wor-9', text: 'What do you keep upgrading — the car, the phone, the wardrobe — that never once made the work itself better?' },
      // envy → discernment under comparison
      { id: 'wor-10', text: 'Whose work or career do you envy — and what is the wanting underneath it actually asking for?' },
      { id: 'wor-11', text: 'When a colleague or rival does well, what happens inside you — and what would celebrating them cost?' },
      { id: 'wor-12', text: 'Who in your field is doing it better than you — and what would you build if you learned from them instead of measuring yourself against them?' },
      // gluttony → true rest
      { id: 'wor-13', text: 'What do you consume to survive the workweek — and what is it replacing?' },
      { id: 'wor-14', text: 'What would a real day of rest look like in your life — and what keeps you from taking it?' },
      { id: 'wor-15', text: 'What does your work buy that your life does not actually need — and what would those hours be worth spent differently?' },
      // wrath → anger as fuel, not poison
      { id: 'wor-16', text: 'Who from your working life do you still hold a grudge against — and who pays for it when you come home?' },
      { id: 'wor-17', text: 'What injustice in your working world makes you angry — and is that anger still fuel, or has it become poison?' },
      { id: 'wor-18', text: 'What unfairness have you watched at work and said nothing about — and who was harmed by your silence?' },
      // greed → enough
      { id: 'wor-19', text: 'What does "enough" mean to you — enough money, enough time, enough security — and are you there?' },
      { id: 'wor-20', text: 'If your income doubled tomorrow, what is the first thing your community would gain — and if the honest answer is nothing, what does that tell you?' },
      { id: 'wor-21', text: 'What do you know about money, work, or trade that someone in your street is drowning for lack of — and why have they never heard it from you?' },
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
      { id: 'hea-3', text: 'What are you pretending is fine that is quietly shaping how you treat everyone — and who deserves to know the truth?' },
      // sloth → care that crosses the room
      { id: 'hea-4', text: 'Who in your life is quietly struggling right now, and what have you done — or could you do this week — about it?' },
      { id: 'hea-5', text: 'What heals you that no doctor prescribes — and who within a walk of your home needs exactly that, and has no idea you know it?' },
      { id: 'hea-6', text: 'What check-in have you been meaning to make for months — and who is waiting on the other end of it?' },
      // greed → the unclenched life
      { id: 'hea-7', text: 'What are you holding so tightly — control, a plan, a grievance — that there is no room left in your hands to heal?' },
      { id: 'hea-8', text: 'What would you have to stop accumulating — achievements, opinions, worries — to have energy left for your own wholeness?' },
      { id: 'hea-9', text: 'What do you keep for yourself that would heal someone else faster than it is helping you?' },
      // craving → presence over escape
      { id: 'hea-10', text: 'What escape do you crave when life hurts — and what is it costing the people who are trying to reach you?' },
      { id: 'hea-11', text: 'When you hurt, what do you reach for that leaves you further from people — and what is the harder reach that actually works?' },
      { id: 'hea-12', text: 'What pain do you carry alone that someone in your street is also carrying — and what would it mean to carry it together instead?' },
      // gluttony → the true consolation
      { id: 'hea-13', text: 'What comfort do you run to when you are hurting that leaves you emptier — and what actually helps?' },
      { id: 'hea-14', text: 'What would becoming whole require you to give up — a habit, a crutch, a story about yourself?' },
      { id: 'hea-15', text: 'What do you binge — food, news, noise, work — when you are overwhelmed, and what is the binge standing guard over?' },
      // wrath → the rehearsed hurt released
      { id: 'hea-16', text: 'What have you forgiven — or are you still working on forgiving — that changed how you carry yourself?' },
      { id: 'hea-17', text: 'Who hurt you in a way you still rehearse in your head — and what would putting the rehearsal down make room for?' },
      { id: 'hea-18', text: 'What anger about your own body, mind, or story are you still holding — and what would gentleness toward yourself make possible for others?' },
      // envy → hope without resentment
      { id: 'hea-19', text: 'Whose recovery or peace do you look at and think "not for me" — and what would it mean to want it without resenting it?' },
      { id: 'hea-20', text: 'Who do you compare your struggles to, deciding yours do not count — and what would change if your pain was allowed to matter too?' },
      { id: 'hea-21', text: 'Whose strength do you envy that you could actually learn — and who is quietly envying a strength you do not even notice in yourself?' },
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
      { id: 'fam-3', text: 'What in your family story are you ashamed of that someone else in your family is carrying alone, certain they are the only one?' },
      // sloth → honour for the elders, transmission of the tradition
      { id: 'fam-4', text: 'Who is the elder in your life whose wisdom you draw on — and when did you last actually ask them anything?' },
      { id: 'fam-5', text: 'What tradition, recipe, song, or ritual from your family or faith is quietly dying — and who could carry it if you taught them?' },
      { id: 'fam-6', text: 'What story from your family or community deserves to be recorded before it is lost — and who would you sit down with to record it?' },
      // greed → the gift given now
      { id: 'fam-7', text: 'What does your family need more of right now — time, money, forgiveness, or presence — and which is hardest for you to give?' },
      { id: 'fam-8', text: 'What are you saving for someday that your family needs now — and what on your street is waiting on exactly the same excuse?' },
      { id: 'fam-9', text: 'What inheritance do you want to leave that is not money — and who are you building it for?' },
      // craving → loving the real family
      { id: 'fam-10', text: 'What picture of the perfect family do you still measure your real one against — and what has the measuring cost?' },
      { id: 'fam-11', text: 'Who in your family do you love as they are — and who do you love as the person you keep hoping they will become?' },
      { id: 'fam-12', text: 'What family version of success do you keep chasing — the house, the wedding, the reunion photo — and who in your real family is exhausted by the chase?' },
      // envy → the score put down
      { id: 'fam-13', text: 'Which sibling, cousin, or relative got the version of the family you wanted — and what would it mean to stop keeping that score?' },
      { id: 'fam-14', text: 'Whose family do you watch from the outside and ache over — and what would you build with your own if you stopped watching theirs?' },
      { id: 'fam-15', text: 'What did another family give their children that yours could not — and what can you give yours that no one gave you?' },
      // wrath → the chain broken here
      { id: 'fam-16', text: 'What anger has been handed down your family line — and where could it stop, in your hands, in this generation?' },
      { id: 'fam-17', text: 'Who in your family do you need to forgive — and what is the first small act of that forgiveness?' },
      { id: 'fam-18', text: 'What argument in your family is older than its reason — and what would you lose if you were the first to put it down?' },
      // gluttony → the table that feeds more than appetite
      { id: 'fam-19', text: 'What does your family consume together — the food, the screens, the busyness — that fills the time but starves the table?' },
      { id: 'fam-20', text: 'What would your family do together if the screens went dark one evening a week — and who would resist most, and why?' },
      { id: 'fam-21', text: 'What family ritual around a table — yours or one you have seen — fed more than appetite, and what would it take to bring one back?' },
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
      { id: 'jus-3', text: 'What do you know about your area\'s needs that the people with power do not — and what would it take to put it in front of them?' },
      // pride → the plain word in public
      { id: 'jus-4', text: 'What truth about your area do decision-makers need to hear, said plainly, from someone who actually lives it?' },
      { id: 'jus-5', text: 'What would you say in a public meeting that you have only ever said in private?' },
      { id: 'jus-6', text: 'What opinion about your community do you keep to yourself because saying it out loud might cost you standing?' },
      // greed → the land kept, not extracted
      { id: 'jus-7', text: 'What does the environment around you — the creek, the trees, the air — need from the people who live near it, and who is speaking for it?' },
      { id: 'jus-8', text: 'What would you honestly be willing to pay — money, time, comfort — for your area to become more just?' },
      { id: 'jus-9', text: 'What does your community own together — the hall, the park, the reserve — that is used by few or wasted, while many go without?' },
      // craving → service without the spotlight
      { id: 'jus-10', text: 'When you picture yourself making a difference, whose face is in the picture — the people helped, or your own?' },
      { id: 'jus-11', text: 'What cause do you support more for how it looks than for what it does — and what would giving quietly change?' },
      { id: 'jus-12', text: 'What issue do you post about but never act on — and what is the smallest real act that would close that gap?' },
      // envy → joining instead of comparing
      { id: 'jus-13', text: 'Whose influence or platform do you resent — and what would you actually do with their reach if you had it?' },
      { id: 'jus-14', text: 'Who in your community is already doing good work you could join — and what stops you: their methods, or your comparison?' },
      { id: 'jus-15', text: 'Whose good work do you criticise from a distance that you have never once offered to strengthen?' },
      // wrath → the fire banked into building
      { id: 'jus-16', text: 'What injustice makes you so angry you stop thinking clearly — and how could that fire be banked into something that builds?' },
      { id: 'jus-17', text: 'Who do you despise in the public life of your country — and what would change if you prayed for them, or simply studied what made them?' },
      { id: 'jus-18', text: 'What wrong from years ago in your community is still unaddressed — and who is carrying it while everyone else has moved on?' },
      // gluttony → solidarity over comfort
      { id: 'jus-19', text: 'What comfort are you unwilling to be inconvenienced from — and who is paying the price for that unwillingness?' },
      { id: 'jus-20', text: 'What do you consume — the imports, the cheap goods, the endless feed — whose true cost lands on people you will never meet?' },
      { id: 'jus-21', text: 'What would your household give up for one month if it meant your street\'s most stretched family could breathe?' },
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