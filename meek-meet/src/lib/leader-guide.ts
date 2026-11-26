// The leader's training — the corpus every leader reads before their first
// circle and returns to after every circle. This is doctrine: copy changes
// here are doctrine changes. The facilitator is a leader, never a shepherd;
// every member is a shepherd of the street. The structure is strict and the
// room inside it is alive. Sessions have no set time.

export interface LeaderGuideChapter {
  id: string;
  title: string;
  body: string;
}

export const LEADER_GUIDE_INTRO =
  "Read this before your first circle, and return to it after every circle. It is short on purpose. What it asks of you is not.";

export const LEADER_GUIDE: LeaderGuideChapter[] = [
  {
    id: "why",
    title: "Why Meek Meet exists",
    body: "Somewhere on your street someone is carrying something no one has ever asked them about. The nurse whose streetlight flickers. The grandfather who watches the bus route change. The young mother who has never once been asked what would make her street better, only what would make it quieter. Meek Meet exists to ask them. Small circles gather, each led by one person who simply holds the room. What the circles say is gathered, anonymised, and carried to the people with the power to act. The name is a promise with many names: the meek shall inherit the earth. Matthew 5:5 says it, and Psalms 37:11 before it, and the Qur'an after it, and the Tao Te Ching, and the Guru Granth Sahib. Every tradition claims it. No tradition has built the room where it happens. You are building it.",
  },
  {
    id: "circle",
    title: "What a circle is",
    body: "A circle is six to twelve neighbours who meet to be asked. There is no reservation without participation: people reserve a seat in advance, and four days before the circle each reserved member receives their handbook — the questions, drawn by lot from the night's theme, plus one threshold question that crosses every day. They answer in writing before they arrive. On the night, nobody is put on the spot: each member reads what they have already written. The handbook seals two hours before the circle. A member who has not answered by then is not admitted, kindly and without argument — the door is the price of the door, and it keeps every seat worth sitting in.",
  },
  {
    id: "charge",
    title: "The leader's charge",
    body: "You are called the leader because someone must keep the order of the room. You are not above the circle; you are first among shepherds. Every member is a shepherd — of the neighbours and friends not yet in the room. Your charge is short: hold the order, never the clock. Who speaks, who is next, that every voice lands. You read last, because the leader who speaks first teaches the room to wait for permission, and the leader who speaks last teaches the room that every voice outranks theirs. You never rush a silence and you never fill one.",
  },
  {
    id: "room",
    title: "Holding the room",
    body: "The rules of speech are few and absolute. No interruptions. No fixing another person's answer. No advice unless it is plainly asked for. After each reader, let one breath of silence pass before the next name. If someone begins to advise, thank them warmly and return the turn to the reader: we are here to hear, not to repair each other. If one voice is taking the air, thank it and pass the turn — gently, always gently, and without apology. Nervous readers read best when the room is still; give them your face, not your notes.",
  },
  {
    id: "open-floor",
    title: "The open floor",
    body: "The structure is strict and the room inside it is alive. When the written questions are spent, call on the circle: what is still burning? If a thread deserves the whole room, draw one more question aloud from the night's theme and put it to them. The questions are a floor, not a ceiling — the circle may rise above them, but it never falls below them. You decide when the circle has said what it came to say. Err toward one question too many; nobody has ever left a circle angry that it listened to them once more.",
  },
  {
    id: "every-faith",
    title: "Every faith and none",
    body: "The circle gathers in the open. Christian, Muslim, Jewish, Hindu, Sikh, Buddhist, and none — the promise has many names and the room belongs to all of them. The spark of the name is Christian and we never hide it; it is the bridge, not the wall. Your job is hospitality: no member may leave a circle feeling that their tradition was the guest and another was the host. If a debate about doctrine begins, bless it and park it: the circle discusses the street, not the scriptures. The scriptures are why we dare.",
  },
  {
    id: "crisis",
    title: "When someone carries a crisis",
    body: "Sometimes a member reads an answer that is a cry — grief, violence, despair, danger. Do not counsel in the room and do not carry it alone. Acknowledge it with one sentence, honour it with silence, and let the circle hold them. After the close, mark it in your leader room and carry it to us. We have the paths — services, elders, follow-ups — and we will walk them with you. The circle hears; the platform carries.",
  },
  {
    id: "online",
    title: "The online room",
    body: "An online circle is a circle with a door instead of a street. An hour early, walk the way in yourself: open the link, test the meeting ID and passcode, sit in the empty room. Admit only who the roster names — the door opens for sealed handbooks alone. Ask every member to say their name aloud when they enter; a voice in the room is worth ten names on a screen. Greet each by name. Keep cameras optional but voices expected; the circle runs on breath, not on faces.",
  },
  {
    id: "after",
    title: "After the circle",
    body: "The circle's words do not stay in the circle and must never be traced back to a member. What was spoken is anonymised, gathered with every other circle in the country, and carried to councils, agencies, and decision-makers — the people who shape the street but have never heard it. Mark attendance while the room is still warm. Carry anything urgent to us through the leader room. Then keep the street: the circle is one room; the suburb is the mission, and every member in it is a shepherd of the people still outside.",
  },
];
