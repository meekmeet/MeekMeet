// The Threshold — the question that crosses every day.
//
// One threshold question is drawn into every member's handbook, whatever the
// weekday, whatever the topic. It is not a topic and it never rotates: it is
// the standing appointment every circle keeps with the future — the balance
// point between the issues (the day's theme) and the solution (what carries
// us forward). Its questions are authored from the SOCIETAL deficits in
// deficits.ts (stagnation, fragmentation, helplessness, short-sightedness,
// gatekeeping) and point toward momentum, cohesion, agency, foresight and
// open access — the speeding-up of human progress, in technology, science,
// housing, health, travel, and access to all of it.
//
// Like everything in the gate: members never see the mapping; the question
// never names the deficit; the data reveals it.

import type { CircleTopic } from './circle-topics'

/**
 * A pseudo-topic so the threshold bank reuses the same draw machinery as the
 * day topics. It is NOT part of CIRCLE_TOPICS and has no weekday — it crosses
 * all of them. dayOfWeek: -1 marks it as day-less.
 */
export const THRESHOLD_TOPIC: CircleTopic = {
  id: 'the-threshold',
  dayOfWeek: -1,
  name: 'The Threshold',
  epithet: 'What carries us forward',
  symbolism:
    'Every circle, every day, sits with one question that crosses all the others — the threshold question. It does not ask what is wrong with us; it asks what is holding back what is possible: the technology we could reach, the science we could use, the homes we could build, the progress we keep postponing.',
  questions: [
    // stagnation → momentum
    { id: 'thr-1', text: 'In what way is our country behind the rest of the world that we urgently need to catch up on — and why does catching up matter?' },
    { id: 'thr-2', text: 'What have you accepted as "just how things are" that people somewhere else have already fixed?' },
    { id: 'thr-3', text: 'What could your town have within five years that it does not have now — and what is actually stopping it?' },
    { id: 'thr-4', text: 'Where have you seen genuine momentum — a place or project that started moving — and what set it in motion?' },
    // fragmentation → cohesion
    { id: 'thr-5', text: 'Which two groups in your community should be talking to each other and are not — and what would happen if they did?' },
    { id: 'thr-6', text: 'What problem in your area is being worked on separately by people who do not know about each other?' },
    { id: 'thr-7', text: 'What do the churches, mosques, schools, and clubs each hold separately that would be stronger shared?' },
    { id: 'thr-8', text: 'When did you last see strangers combine their skills for something none of them could do alone?' },
    // helplessness → agency
    { id: 'thr-9', text: 'What do people in your community wait for "someone" to fix — and who, actually, is the someone?' },
    { id: 'thr-10', text: 'What could your circle do with no permission and no budget that would genuinely matter?' },
    { id: 'thr-11', text: 'What skill does your neighbourhood lack that someone living nearby already has?' },
    { id: 'thr-12', text: 'When did you last see an ordinary person change something simply by starting?' },
    // short-sightedness → foresight
    { id: 'thr-13', text: 'What decision being made in your area right now will your grandchildren either thank or curse us for?' },
    { id: 'thr-14', text: 'What should we start building in the next ten years that no election cycle is long enough to finish?' },
    { id: 'thr-15', text: 'What are we not teaching the young now that they will desperately need in twenty years?' },
    { id: 'thr-16', text: 'What would you plant — literally or otherwise — whose shade you will never sit in?' },
    // gatekeeping → open access
    { id: 'thr-17', text: 'What knowledge, tool, or opportunity near you is locked behind a price or a credential — keeping it from the people who need it most?' },
    { id: 'thr-18', text: 'Where has technology genuinely opened a door in your life — and who in your street is still standing outside it?' },
    { id: 'thr-19', text: 'What does your community have access to on paper that it cannot actually reach in practice — the clinic, the course, the service?' },
    { id: 'thr-20', text: 'If every public building opened its doors and equipment after hours, what would your community become?' },
  ],
}

export function allThresholdQuestionIds(): string[] {
  return THRESHOLD_TOPIC.questions.map((q) => q.id)
}
