// Marketing outreach templates for the admin area. Built on the shared Meek
// Meet email chrome (src/lib/emails/shell.ts).
//
// Every template carries THREE pitches — one per theme — because a follow-up
// that says the same thing in a different colour is still the same email:
//
//   parchment  — the gentle first knock: story, warmth, invitation.
//   midnight   — the bold second knock: direct, premium, says the quiet part.
//   terracotta — the final knock: human, personal, the last note.
//
// Copy rules: no "Dear friend". If we have a name, we use it; otherwise the
// pitch opens directly into the story. All interpolations are escaped.

import { escapeHtml } from "@/lib/validation";
import {
  emailShell,
  themed,
  getEmailTheme,
  trackedUrl,
  type EmailThemeKey,
} from "./shell";

export const MARKETING_EMAIL_FROM = "Meek Meet <hello@meekmeet.com>";

export interface MarketingTemplateContext {
  recipientName?: string;
  orgName?: string;
  theme?: EmailThemeKey;
  /** Churches brand strongly — an org accent tints the letter's highlights. */
  orgAccent?: string;
  /**
   * The tradition the letter speaks to. Meek Meet's promise — that the humble
   * inherit the earth — is claimed by every major faith, so the letter quotes
   * the recipient's own scripture instead of always quoting Matthew.
   */
  faith?: string;
}

/** "The meek shall inherit the earth" exists in every tradition — quote theirs. */
const FAITH_QUOTES: Record<string, { text: string; ref: string; noun: string; beyond: string; door: string }> = {
  christian: {
    text: "Blessed are the meek, for they shall inherit the earth.",
    ref: "Matthew 5:5",
    noun: "congregations",
    beyond: "beyond Sunday",
    door: "the church door",
  },
  islamic: {
    text: "The most honoured of you in the sight of Allah is the most righteous of you.",
    ref: "Qur'an 49:13",
    noun: "communities",
    beyond: "beyond Friday",
    door: "the mosque door",
  },
  jewish: {
    text: "If I am not for myself, who will be for me? And if not now, when?",
    ref: "Hillel, Pirkei Avot 1:14",
    noun: "communities",
    beyond: "beyond Shabbat",
    door: "the synagogue door",
  },
  buddhist: {
    text: "Let none deceive another, nor despise anyone anywhere.",
    ref: "Karaniya Metta Sutta",
    noun: "communities",
    beyond: "beyond your walls",
    door: "the temple door",
  },
  hindu: {
    text: "One should never do to another what one regards as injurious to one's own self.",
    ref: "Mahabharata, Anushasana Parva",
    noun: "communities",
    beyond: "beyond your walls",
    door: "the temple door",
  },
  sikh: {
    text: "Truth is high, but higher still is truthful living.",
    ref: "Guru Nanak, Sri Guru Granth Sahib",
    noun: "communities",
    beyond: "beyond your walls",
    door: "the gurdwara door",
  },
  secular: {
    text: "The quietest voices on a street are usually the ones carrying the most.",
    ref: "the Meek Meet promise",
    noun: "communities",
    beyond: "beyond your walls",
    door: "the community noticeboard",
  },
};

function faithOf(ctx: MarketingTemplateContext) {
  const key = (ctx.faith ?? "christian").toLowerCase();
  return FAITH_QUOTES[key] ?? FAITH_QUOTES.christian;
}

export interface MarketingTemplate {
  key: string;
  name: string;
  audience: "person" | "org";
  description: string;
  build: (ctx: MarketingTemplateContext) => { subject: string; html: string };
}

type Helpers = ReturnType<typeof themed>;

function greeting(h: Helpers, ctx: MarketingTemplateContext): string {
  if (ctx.recipientName?.trim()) {
    return h.paragraph(`Dear ${escapeHtml(ctx.recipientName.trim())},`);
  }
  return ""; // open with the story instead of a hollow salutation
}

function orgOf(ctx: MarketingTemplateContext): string | null {
  return ctx.orgName?.trim() ? escapeHtml(ctx.orgName.trim()) : null;
}

interface Pitch {
  subject: string;
  eyebrow: string;
  content: string;
}

/** Shared pieces every pitch needs, bound to the helpers + theme + template. */
interface PitchCtx {
  h: Helpers;
  ctx: MarketingTemplateContext;
  themeKey: EmailThemeKey;
  cta: (label: string) => string;
}

// ─────────────────────────────────────────────────────────────
// invite_vision — "The Vision"
// ─────────────────────────────────────────────────────────────

function pitchVision(p: PitchCtx): Pitch {
  const { h, ctx, themeKey } = p;
  const tracked = (dest: string) =>
    trackedUrl(dest, "invite_vision", themeKey);

  if (themeKey === "midnight") {
    return {
      subject: "We wrote to you once. Here's what silence costs.",
      eyebrow: "The quiet part",
      content: `
        ${h.heading("Councils count submissions. The meek never submit. That's exactly why they lose.")}
        ${greeting(h, ctx)}
        ${h.paragraph(
          "We wrote to you a week ago. You didn't reply — that's fine; inboxes are full and life is busy. But the street didn't wait, and neither did the council. The budget meeting happened. The submission window closed. The people who spoke were the usual few — and nobody spoke for your corner."
        )}
        ${h.paragraph(
          "Here's the uncomfortable arithmetic of local power: a council hears from roughly one in two hundred of the people it governs. The other hundred and ninety-nine are the meek — the nurses, the grandparents, the young mothers — and their absence isn't neutrality. It's a vote for whoever did show up."
        )}
        ${h.paragraph(
          "Meek Meet exists to change the arithmetic. A circle of neighbours, one honest question, one hour — and your street's voice joins the count, anonymised and impossible to file under 'the usual activists'."
        )}
        ${h.paragraph(
          "One hour of your evening against a year of decisions made without you. That's the trade on the table."
        )}
        ${h.button(tracked("/circles"), "MAKE THE COUNT")}
        ${h.divider()}
        ${h.finePrint("Sent by the Meek Meet community. No follow-ups after this one unless you ask.")}
        ${h.ps("The meek shall inherit the earth — but Matthew never said it would be handed to them. It's taken, one hour at a time.")}
      `,
    };
  }

  if (themeKey === "terracotta") {
    return {
      subject: "The last note we'll send",
      eyebrow: "One last knock",
      content: `
        ${h.heading("This is the last time we'll write — so let us leave you with the truth.")}
        ${greeting(h, ctx)}
        ${h.paragraph(
          "Somewhere near you, a small circle of neighbours is meeting this week. They are seven people who decided their street was worth one honest evening — and they are one voice short of the number that makes a council lean in and listen."
        )}
        ${h.paragraph(
          "Nobody in that room is important. Nobody has a title, a badge, or a megaphone. What they have is the one thing your council almost never hears: the unpolished truth of the people who actually live there — about the lights, the rent, the loneliness, the things that never make it into a submission because the people they affect were never asked."
        )}
        ${h.callout(
          "One hour. One question. One honest answer. That's the whole ask — and it only works if the chair is filled."
        )}
        ${h.paragraph(
          "If not you, then who? If not this week, then when? These are the questions the circle will ask about your street — and this week, you can be there to answer them yourself."
        )}
        ${h.button(tracked("/circles"), "FILL THE CHAIR")}
        ${h.divider()}
        ${h.finePrint("If this isn't for you, simply let it go — we'll keep the door open either way.")}
        ${h.ps("The chair will be there. It just won't wait forever — and neither will your street.")}
      `,
    };
  }

  return {
    subject: "Someone on your street hasn't been asked — until now",
    eyebrow: "An invitation",
    content: `
      ${h.heading("On your street, someone is carrying something no one has asked them about.")}
      ${greeting(h, ctx)}
      ${h.paragraph(
        "It might be the nurse on the corner whose streetlight has been flickering for a year. The grandfather who watches the bus route change and wonders who decided. The young mother who has never once been asked what would make this street better — only what would make it quieter."
      )}
      ${h.paragraph(
        "Meek Meet exists for exactly one reason: to ask them. Neighbours gather in small <strong>circles</strong> — in lounge rooms, church halls, and online rooms — led by someone who simply holds the space. Each meeting turns on one honest question. Those answers are gathered, anonymised, and carried to the councils and decision-makers who shape your street but have never heard it."
      )}
      ${h.scriptureQuote("Blessed are the meek, for they shall inherit the earth.", "Matthew 5:5")}
      ${h.paragraph("This is what inheriting the earth looks like in practice:")}
      ${h.steps([
        "You join a circle — maybe six neighbours, maybe twelve, online or around a table.",
        "The circle talks. Safety, housing, loneliness, the things that actually shape a street.",
        "Your words travel — anonymised, aggregated, delivered to the people with the power to act.",
      ])}
      ${h.ornament()}
      ${h.button(tracked("/circles"), "FIND YOUR CIRCLE")}
      ${h.divider()}
      ${h.finePrint(
        "You received this because someone who knows you believes your voice belongs in the room. If it doesn't fit, simply ignore it — no follow-ups, no lists."
      )}
      ${h.ps("The first circle is always the hardest to start. Someone has to be the first to say <em>yes</em>. Today, that's you.")}
    `,
  };
}

// ─────────────────────────────────────────────────────────────
// invite_circle — "Join a Circle"
// ─────────────────────────────────────────────────────────────

function pitchCircle(p: PitchCtx): Pitch {
  const { h, ctx, themeKey } = p;
  const tracked = (dest: string) => trackedUrl(dest, "invite_circle", themeKey);

  if (themeKey === "midnight") {
    return {
      subject: "Seven of your neighbours already did",
      eyebrow: "The numbers",
      content: `
        ${h.heading("A petition with six hundred signatures loses to a circle that actually meets.")}
        ${greeting(h, ctx)}
        ${h.paragraph(
          "Councils are flooded with petitions — and they know the dirty secret of a petition: most signatories never gave it more than a second's thought. A signature costs nothing, which is exactly what it's worth."
        )}
        ${h.paragraph(
          "A circle is different. Seven neighbours who show up, in person or online, who answer a real question out loud — that goes in a different pile entirely. When Meek Meet delivers anonymised insights from a circle, decision-makers read them, because they know everyone in that room actually lives there and actually showed up."
        )}
        ${h.paragraph(
          "Seven of your neighbours have already shown up. The circle meets soon — and a circle of seven is a curiosity. A circle of eight is a voice."
        )}
        ${h.button(tracked("/circles"), "BE THE EIGHTH")}
        ${h.divider()}
        ${h.finePrint("Sent by the Meek Meet community. If this isn't for you, no action is needed.")}
        ${h.ps("Anyone can sign a petition. It takes exactly one person to be the difference between seven neighbours talking and a street being heard.")}
      `,
    };
  }

  if (themeKey === "terracotta") {
    return {
      subject: "One hour. Then we'll leave you in peace.",
      eyebrow: "The whole ask",
      content: `
        ${h.heading("One hour. That's the entire ask.")}
        ${greeting(h, ctx)}
        ${h.paragraph(
          "Not a membership. Not a commitment. Not a cause to carry. One hour, one evening, in a room — or on a screen — with the people you live among."
        )}
        ${h.paragraph(
          "In that hour, someone will ask one honest question about your street, and you will get to answer it. That's it. That's the whole mechanism by which quiet streets become loud voices: one hour, multiplied by neighbours."
        )}
        ${h.callout(
          "What comes out of that hour travels — anonymised — to your council. The rent, the lights, the loneliness, the bus that never comes: said once, out loud, by the people who live it."
        )}
        ${h.paragraph(
          "You've read this far. The people in that circle are the ones who'll speak for your street if you don't — and they'll do their best, but they can't know what you know. The hour needs you."
        )}
        ${h.button(tracked("/circles"), "GIVE THE HOUR")}
        ${h.divider()}
        ${h.finePrint("If this isn't for you, no action is needed — the circle will meet all the same.")}
        ${h.ps("Sixty minutes, once. Your street spends more than that on hold with the council every year — and gets less out of it.")}
      `,
    };
  }

  return {
    subject: "A circle near you is one voice short",
    eyebrow: "This week",
    content: `
      ${h.heading("There is a chair with your name on it.")}
      ${greeting(h, ctx)}
      ${h.paragraph(
        "Not metaphorically. A real circle of neighbours is meeting soon — and they are one person short of the number that makes a conversation become a voice."
      )}
      ${h.callout(
        "One hour. One question. No speeches, no politics, no pressure — just the people you live among, finally talking about the things that matter on your street."
      )}
      ${h.paragraph(
        "Whatever comes out of that hour doesn't stay in the room. It becomes an anonymised insight carried to your council and your decision-makers — the concerns of ordinary people, made impossible to ignore."
      )}
      ${h.paragraph("The next seat could be yours. It costs nothing but an hour of your time and an honest answer.")}
      ${h.button(tracked("/circles"), "TAKE THE SEAT")}
      ${h.divider()}
      ${h.finePrint(
        "Sent by the Meek Meet community. If this isn't for you, no action is needed — the chair will simply wait for the next neighbour."
      )}
      ${h.ps("Bring nothing but an honest answer. Tea is customary but not required.")}
    `,
  };
}

// ─────────────────────────────────────────────────────────────
// invite_shepherd — "Lead a Circle"
// ─────────────────────────────────────────────────────────────

function pitchShepherd(p: PitchCtx): Pitch {
  const { h, ctx, themeKey } = p;
  const tracked = (dest: string) =>
    trackedUrl(dest, "invite_shepherd", themeKey);

  if (themeKey === "midnight") {
    return {
      subject: "The loud are already leading. Look where that's going.",
      eyebrow: "The other kind",
      content: `
        ${h.heading("Leadership got loud. That's exactly the problem.")}
        ${greeting(h, ctx)}
        ${h.paragraph(
          "Every platform rewards the loud — the certain, the angry, the performative. And the streets follow them, because somebody has to lead, and the quiet never volunteer. Look around your neighbourhood and ask yourself where the loud have led it."
        )}
        ${h.paragraph(
          "The other kind of leader still exists. The kind who notices who hasn't spoken. The kind whose table people gather around without being invited twice. The kind who holds a room instead of working it. They haven't gone anywhere — they've just never been asked to lead anything that matters."
        )}
        ${h.paragraph(
          "Meek Meet leaders are that second kind. No stage, no megaphone — one room, one question, and the discipline to make sure the quietest voice is the one everyone leans in to hear. We supply the questions and the structure; your neighbourhood supplies what's been missing."
        )}
        ${h.button(tracked("/shepherd"), "LEAD QUIETLY")}
        ${h.divider()}
        ${h.finePrint("Sent by the Meek Meet community. If this isn't for you, no action is needed.")}
        ${h.ps("The loud already have every platform. The quiet only need one — and it needs a leader.")}
      `,
    };
  }

  if (themeKey === "terracotta") {
    return {
      subject: "We found your street. It needs a leader.",
      eyebrow: "Found you",
      content: `
        ${h.heading("Your street has never had a quiet leader. It shows.")}
        ${greeting(h, ctx)}
        ${h.paragraph(
          "Every neighbourhood has one — the person who'd be perfect for this, if anyone ever thought to ask. Someone the grandparents trust. Someone the newcomers find without trying. Someone who could hold a room of neighbours and make every single one of them feel heard."
        )}
        ${h.paragraph(
          "When we look at your street, you're who comes to mind. And the need is not abstract: circles are forming near you that need someone to open the room, ask the question, and keep the quiet voices from being talked over. Not a teacher. Not a preacher. A leader — and a shepherd to every neighbour who isn't in the room yet."
        )}
        ${h.callout(
          "An hour or two a month. We handle the questions, the structure, the dashboard — and your circle's voice goes, anonymised, straight to the people who decide your street's future."
        )}
        ${h.button(tracked("/shepherd"), "ANSWER FOR YOUR STREET")}
        ${h.divider()}
        ${h.finePrint("Sent by the Meek Meet community. If this isn't for you, no action is needed.")}
        ${h.ps("Nobody else is coming to ask. The asking is the job — and it's yours if you'll take it.")}
      `,
    };
  }

  return {
    subject: "We think you might be the one who holds the room",
    eyebrow: "A calling",
    content: `
      ${h.heading("Every circle begins with one person who says: I'll hold the room.")}
      ${greeting(h, ctx)}
      ${h.paragraph(
        "We think that person might be you. Not because you're the loudest — because you're the one people already call. The one who notices who hasn't spoken. The one whose kitchen table has hosted more honest conversations than most parliaments."
      )}
      ${h.paragraph(
        "Meek Meet leaders don't preach and don't perform. They open their home or their online room, ask the question, and make sure the quietest voice in the circle is the one everyone leans in to hear. We give you the questions, the structure, and a dashboard — and your circle's insights go, anonymised, straight to the people who decide your community's future."
      )}
      ${h.scriptureQuote("He leads me beside still waters. He restores my soul.", "Psalm 23")}
      ${h.paragraph(
        "There are streets waiting for a leader who will never know their name — unless someone asks them to step forward."
      )}
      ${h.button(tracked("/shepherd"), "BECOME A LEADER")}
      ${h.divider()}
      ${h.finePrint("Sent by the Meek Meet community. If this isn't for you, no action is needed.")}
      ${h.ps("You don't need permission to care for your street. You never did. This is just the formal invitation.")}
    `,
  };
}

// ─────────────────────────────────────────────────────────────
// org_partnership — "Organisation Partnership" (a letter, three drafts)
// ─────────────────────────────────────────────────────────────

function pitchOrg(p: PitchCtx): Pitch {
  const { h, ctx, themeKey } = p;
  const org = orgOf(ctx);
  const faith = faithOf(ctx);
  const name = ctx.recipientName?.trim() ? escapeHtml(ctx.recipientName.trim()) : null;
  const tracked = (dest: string) => trackedUrl(dest, "org_partnership", themeKey);

  const salutation = name
    ? h.paragraph(`Dear ${name},`)
    : org
    ? h.paragraph(`To the leaders of ${org},`)
    : h.paragraph(`To the leadership of your community,`);

  const reLine = (text: string) =>
    `<p style="font-family:'Source Sans 3','Segoe UI',Arial,sans-serif; font-size:13px; letter-spacing:0.08em; text-transform:uppercase; color:${getEmailTheme(themeKey).faint}; margin:0 0 24px;">${text}</p>`;

  const safeguard = h.callout(
    "<strong>Safeguarding, in plain terms.</strong> Every Meek Meet leader is identity-verified and provides a Working with Children Check and police check, reviewed by our administrators before they lead anything. Responses in circles are anonymised before they ever leave the room; no individual is ever named or identifiable in a report."
  );
  const signoff = h.paragraph(
    'With respect and hope,<br /><strong>The Meek Meet team</strong><br /><span style="font-size:13px; color:#6b6b6b;">hello@meekmeet.com &middot; meekmeet.com</span>'
  );

  if (themeKey === "midnight") {
    return {
      subject: org
        ? `The second letter — what ${org}'s silence tells the council`
        : "The second letter — what silence tells the council",
      eyebrow: "The second letter",
      content: `
        ${reLine(`Re: We wrote two weeks ago, ${org ?? "and we're writing again"}`)}
        ${h.heading("Every week this stays off your noticeboard, the council hears from everyone except your people.")}
        ${salutation}
        ${h.paragraph(
          "We wrote once, and we understand — inboxes drown good intentions, and a partnership proposal competes with a hundred urgencies. So let us be direct about what is at stake, because it doesn't diminish with time."
        )}
        ${h.paragraph(
          `Your council's next planning cycle is being shaped right now, and the voices in the room are the usual ones: developers, peak bodies, the organised and the loud. The people ${org ?? "your community"} serves — the renters, the elderly, the new arrivals — will not be in that room. They almost never are. Not because they don't care, but because nobody built them a bridge.`
        )}
        ${h.paragraph(
          "Meek Meet is that bridge, and it is already standing: one of your members opens a circle, your people speak honestly about their streets, and their anonymised words arrive on the desks of the people holding the budget. All that remains is to walk across it — a flyer on your noticeboard, and thirty minutes of conversation."
        )}
        ${safeguard}
        ${h.paragraph(
          "If the answer is no, a one-line reply ends it and we will not write again. But it should be a no said out loud — because silence, this time, is a decision your street will live with."
        )}
        ${signoff}
        ${h.divider()}
        ${h.ps(`The flyer is attached, print-ready and personalised for ${org ?? "you"}. It has cost you nothing so far. It may be costing your community more than you think.`)}
      `,
    };
  }
  if (themeKey === "terracotta") {
    return {
      subject: org
        ? `A last note for ${org} before we stop writing`
        : "A last note before we stop writing",
      eyebrow: "A last note",
      content: `
        ${reLine(`Re: One page for your noticeboard, ${org ?? "and then we'll stop asking"}`)}
        ${h.heading("This is the last time we'll write — and we'd rather leave you with the ask than the silence.")}
        ${salutation}
        ${h.paragraph(
          `Two letters, one flyer, and thirty minutes. That is everything we have asked of ${org ?? "you"} — and it is small against what's on the table: your people's voice, carried past the walls of your gathering place and onto the desks of the people who decide your street's future.`
        )}
        ${h.paragraph(
          "You know your community's carpark conversations — the rent, the roads, the loneliness of new arrivals. You have heard them for years, and so have we. The only difference between a conversation that changes nothing and one that changes a budget is whether anyone builds a bridge from the room where it's spoken to the room where it's decided."
        )}
        ${h.paragraph(
          "That bridge is built. A circle hosted by one of your members, questions supplied, insights anonymised and delivered. What it needs from you is the smallest thing a community ever gives: a page on a noticeboard."
        )}
        ${safeguard}
        ${h.paragraph(
          "If the answer is no, we accept it with gratitude for the work you already do — and we mean that. If the answer is yes, your neighbourhood will not forget who opened the door."
        )}
        ${signoff}
        ${h.divider()}
        ${h.ps(`The most-read noticeboard in most neighbourhoods is the one by ${faith.door}. One page there could carry more of your street's voice than a year of submissions — and this is the last time we'll ask you to put it there.`)}
      `,
    };
  }

  // parchment: the formal first letter — a genuinely different pitch per
  // tradition, not the same letter with a swapped quote. The ask, the
  // safeguard and the mechanics stay shared; the story, the voice and the
  // scripture are the recipient's own.
  const sharedAsk = `
      ${h.paragraph("<strong>What we are asking of you is small:</strong>")}
      ${h.steps([
        `<strong>Permission to share.</strong> Place the attached flyer on your noticeboard or in your bulletin — it carries a QR code straight to our circles, personalised for ${org ?? "your community"}.`,
        `<strong>One conversation.</strong> If it resonates, we would welcome thirty minutes with you or your leadership to talk about hosting a Meek Meet circle under your roof.`,
      ])}
      ${h.paragraph(
        "<strong>What your people get:</strong> small circles, hosted by your own members, where the neighbourhood speaks honestly about its streets. Those voices are gathered into anonymised, aggregated reports and delivered to your council and MPs — your community's concerns, impossible to ignore."
      )}
      ${safeguard}
      ${h.paragraph(
        "There is no cost, no contract, and no obligation. If the timing is wrong, a single reply tells us so, and we will not write again."
      )}
  `;

  const faithKey = (ctx.faith ?? "christian").toLowerCase();
  const pitch = ORG_PARCHMENT_PITCHES[faithKey] ?? ORG_PARCHMENT_PITCHES.christian;

  return {
    subject: org ? pitch.subject(org) : pitch.subject(null),
    eyebrow: pitch.eyebrow,
    content: `
      ${reLine(pitch.reLine(org))}
      ${h.heading(pitch.heading(org))}
      ${salutation}
      ${pitch.body(h, org, faith)}
      ${sharedAsk}
      ${signoff}
      ${h.divider()}
      ${h.ps(pitch.ps(org, faith))}
    `,
  };
}

/**
 * The parchment first-letter, one voice per tradition. Each pitch owns its
 * subject, heading, and opening body — the tone a mosque reads is not the
 * tone a synagogue reads. Every pitch opens in its OWN tradition's words,
 * then names the spark openly: our name comes from Jesus' promise that the
 * meek shall inherit the earth — never hidden, always a bridge, because the
 * name Meek Meet is the spark and we wear it with open hands.
 */
const ORG_PARCHMENT_PITCHES: Record<
  string,
  {
    eyebrow: string;
    subject: (org: string | null) => string;
    reLine: (org: string | null) => string;
    heading: (org: string | null) => string;
    body: (h: Helpers, org: string | null, faith: (typeof FAITH_QUOTES)["christian"]) => string;
    ps: (org: string | null, faith: (typeof FAITH_QUOTES)["christian"]) => string;
  }
> = {
  christian: {
    eyebrow: "A proposal",
    subject: (org) =>
      org
        ? `A proposal for ${org} — giving your community a voice beyond Sunday`
        : "A proposal — giving your community a voice beyond Sunday",
    reLine: (org) => `Re: Giving ${org ?? "your community"} a voice beyond your walls`,
    heading: () => "A proposal for your consideration",
    body: (h, org, faith) => `
      ${h.paragraph(
        `Meek Meet is a community platform built on a promise your own tradition holds — <em>${faith.text}</em> (${faith.ref}). We help congregations turn the care they already gather into a voice their councils and decision-makers can hear.`
      )}
      ${h.paragraph(
        org
          ? `${org} already does something no campaign can: it gathers a whole street into one room, week after week. The conversations in your carpark and over your morning tea — about rent, about loneliness, about the roads and the lights — are full of wisdom about what your neighbourhood actually needs. Almost none of it reaches the people who make the decisions.`
          : `Your congregation already does something no campaign can: it gathers a whole street into one room, week after week. The conversations in your carpark and over your morning tea — about rent, about loneliness, about the roads and the lights — are full of wisdom about what your neighbourhood actually needs. Almost none of it reaches the people who make the decisions.`
      )}
    `,
    ps: (org, faith) =>
      `The flyer is A4 and print-ready — the most-read noticeboard in most neighbourhoods is the one by ${faith.door}. One page there could carry more of your street's voice than a year of submissions.`,
  },

  islamic: {
    eyebrow: "A proposal",
    subject: (org) =>
      org
        ? `For ${org} — your street is part of the ummah too`
        : "Your street is part of the ummah too",
    reLine: (org) => `Re: The neighbours of ${org ?? "your masjid"}, and their voice`,
    heading: () => "The time to gather is now — and your street is waiting",
    body: (h, org, faith) => `
      ${h.paragraph(
        `Allah says in the Qur'an: <em>${faith.text}</em> (${faith.ref}). We were made into peoples and tribes not to live apart, but <strong>so that we may know one another</strong> — and knowing begins on the street outside the door.`
      )}
      ${h.paragraph(
        org
          ? `${org} already gathers the believers five times a day and more. But the street around you — the elderly woman two doors down, the new family who have not yet been welcomed, the neighbour of another faith or of none — is part of your ummah in every sense that matters here. When the council decides on the lights, the rents, the roads, it decides for all of you together.`
          : `Your masjid already gathers the believers five times a day and more. But the street around you — the elderly woman two doors down, the new family who have not yet been welcomed, the neighbour of another faith or of none — is part of your ummah in every sense that matters here. When the council decides on the lights, the rents, the roads, it decides for all of you together.`
      )}
      ${h.paragraph(
        "Meek Meet exists so that this knowing can become a voice. Small circles of neighbours — Muslim and non-Muslim, brothers and sisters of one street — speak honestly about what their lives here actually need. Those words are gathered, anonymised, and carried to the council and the MPs as one report they cannot set aside. Not a protest. Not a petition signed by strangers. The considered voice of a street."
      )}
      ${h.paragraph(
        "Our name is drawn from a saying of Isa, peace be upon him — that the meek shall inherit the earth. The Qur&rsquo;an speaks the same promise, and we hold them together: this platform serves the whole street, brothers and sisters of every faith and none."
      )}
    `,
    ps: (org, faith) =>
      `The flyer is A4 and print-ready, and it quotes the Qur'an — because the promise belongs to you as much as to anyone. One page by ${faith.door} could carry your whole street's voice further than a year of submissions.`,
  },

  jewish: {
    eyebrow: "A proposition",
    subject: (org) =>
      org
        ? `A proposition for ${org}, stated plainly so it can be examined`
        : "A proposition, stated plainly so it can be examined",
    reLine: (org) => `Re: A case worth arguing — the street outside ${org ?? "your shul"}`,
    heading: () => "We bring you a case. We ask you to argue it.",
    body: (h, org, faith) => `
      ${h.paragraph(
        `Hillel put it in three sharp questions: <em>${faith.text}</em> (${faith.ref}). Here is the application of the third: if not your street, whose? If not this year, when?`
      )}
      ${h.paragraph(
        org
          ? `Your tradition holds that argument for the sake of heaven is sacred — that a case, pressed honestly and without flattery, honours both the one who makes it and the one who hears it. So we will not flatter you, ${org}. We will state the facts and let you weigh them.`
          : `Your tradition holds that argument for the sake of heaven is sacred — that a case, pressed honestly and without flattery, honours both the one who makes it and the one who hears it. So we will not flatter you. We will state the facts and let you weigh them.`
      )}
      ${h.paragraph(
        "Fact: a council hears from roughly one in two hundred of the people it governs, and the ones who speak are almost never the renters, the elderly, or the new arrivals. Fact: your community gathers weekly, organises fiercely, and already possesses what no lobbyist can buy — the trust of a street. Fact: Meek Meet turns that trust into evidence: anonymised, aggregated reports of what a neighbourhood actually needs, delivered to the desks that hold the budget. The case for joining is, we submit, unanswerable — but we welcome the attempt."
      )}
      ${h.paragraph(
        "You will have noticed our name. It is drawn from a saying of Jesus of Nazareth — that the meek shall inherit the earth — which is itself a quotation: your own Psalms, thirty-seven and eleven, say it first. We saw no contradiction worth keeping."
      )}
    `,
    ps: (org, faith) =>
      `The flyer is A4 and print-ready. Test it as you would any proposition: put it by ${faith.door}, watch what your street does with it, and judge the results.`,
  },

  buddhist: {
    eyebrow: "An invitation",
    subject: (org) =>
      org
        ? `For ${org} — the sangha begins at your gate`
        : "The sangha begins at your gate",
    reLine: (org) => `Re: The street as practice — an invitation to ${org ?? "your centre"}`,
    heading: () => "The street is a sangha whether it knows it or not",
    body: (h, org, faith) => `
      ${h.paragraph(
        `The Buddha taught: <em>${faith.text}</em> (${faith.ref}). A street where no one is despised and no one is deceived is not a utopia — it is simply a street whose people have sat down and listened to one another.`
      )}
      ${h.paragraph(
        org
          ? `${org} already offers something rare: a place where people sit together in silence and leave lighter than they arrived. We are asking whether that gift could extend one step further — out the door, to the neighbours who have never crossed it.`
          : `Your centre already offers something rare: a place where people sit together in silence and leave lighter than they arrived. We are asking whether that gift could extend one step further — out the door, to the neighbours who have never crossed it.`
      )}
      ${h.paragraph(
        "A Meek Meet circle is listening made practical. Neighbours gather — one hour, one honest question about their street: the rent, the loneliness, the roads. Nothing is forced; nothing is sold. The words are gathered gently, anonymised, and delivered to the council as the considered voice of the street. It is metta with an address."
      )}
      ${h.paragraph(
        "Our name is drawn from a saying of Jesus — that the meek shall inherit the earth. We do not ask anyone to adopt the saying; only to notice what it shares with your own teaching: that gentleness, not force, is what finally inherits the world."
      )}
    `,
    ps: (org, faith) =>
      `The flyer is A4 and print-ready — one page by ${faith.door}, offered without attachment to the outcome. That, too, is practice.`,
  },

  hindu: {
    eyebrow: "An invitation",
    subject: (org) =>
      org
        ? `For ${org} — the street is family, and the family has something to say`
        : "The street is family, and the family has something to say",
    reLine: (org) => `Re: Vasudhaiva kutumbakam — one family, one street, one voice`,
    heading: () => "The world is one family — and the family begins at the gate",
    body: (h, org, faith) => `
      ${h.paragraph(
        `The Mahabharata teaches: <em>${faith.text}</em> (${faith.ref}). The street is where this duty lives most plainly — the auntie two doors down, the student new to the country, the family keeping vigil over an elderly parent.`
      )}
      ${h.paragraph(
        org
          ? `${org} already keeps this duty in the ways that matter most: gathering, feeding, marking the festivals together. We are writing to ask whether that care could take one more form — giving your whole street, not only your own community, a way to be heard where the decisions are made.`
          : `Your temple already keeps this duty in the ways that matter most: gathering, feeding, marking the festivals together. We are writing to ask whether that care could take one more form — giving your whole street, not only your own community, a way to be heard where the decisions are made.`
      )}
      ${h.paragraph(
        "A Meek Meet circle is a small gathering with a simple dharma: neighbours speak honestly about their street, and their words — anonymised, honoured, undistorted — are carried to the council and the MPs. When the family's voice reaches the decision-maker, the whole house benefits."
      )}
      ${h.paragraph(
        "Our name is drawn from a saying of Jesus — that the meek shall inherit the earth — a promise your own tradition states as plainly: dharma protects those who protect it. The meek of the world, everywhere, are the family this platform serves."
      )}
    `,
    ps: (org, faith) =>
      `The flyer is A4 and print-ready, and it carries your own teaching. One page by ${faith.door} could speak for the whole family of your street.`,
  },

  sikh: {
    eyebrow: "An invitation",
    subject: (org) =>
      org
        ? `For ${org} — a langar of voices on your street`
        : "A langar of voices on your street",
    reLine: (org) => `Re: Seva for the street — an invitation to ${org ?? "your gurdwara"}`,
    heading: () => "The langar was the first circle — this is the same seva, widened",
    body: (h, org, faith) => `
      ${h.paragraph(
        `Guru Nanak taught: <em>${faith.text}</em> (${faith.ref}). For five hundred years the gurdwara has practised the most radical hospitality on earth — the langar, where all sit on the floor together, and no one asks anyone's faith or station before feeding them.`
      )}
      ${h.paragraph(
        org
          ? `${org} already knows what the wider world is only beginning to learn: that a community which serves its whole street is unbreakable. We are writing to ask whether one more form of service might be added to the langar, the kirtan, and the karah prasad — a service of the voice.`
          : `Your gurdwara already knows what the wider world is only beginning to learn: that a community which serves its whole street is unbreakable. We are writing to ask whether one more form of service might be added to the langar, the kirtan, and the karah prasad — a service of the voice.`
      )}
      ${h.paragraph(
        "A Meek Meet circle works like the langar in miniature: neighbours of every faith and none sit together as equals, and what is shared — honestly, about rent, safety, loneliness, the roads — is gathered, anonymised, and delivered to the council and MPs. Seva does not end at the door. Neither should the voice."
      )}
      ${h.paragraph(
        "Our name is drawn from a saying of Jesus — that the meek shall inherit the earth. Guru Nanak would have recognised it at once: it is the same truth the langar practises every day, that those who sit lowest are the ones who truly hold the community."
      )}
    `,
    ps: (org, faith) =>
      `The flyer is A4 and print-ready, and it carries Guru Nanak's own words. One page by ${faith.door} could feed your whole street something it is starving for: a way to be heard.`,
  },

  interfaith: {
    eyebrow: "An invitation",
    subject: (org) =>
      org
        ? `For ${org} — the one room every faith can share is a street`
        : "The one room every faith can share is a street",
    reLine: (org) => `Re: Every faith, one street — a proposal for ${org ?? "your council"}`,
    heading: () => "The mosque, the synagogue, the temple, the church — and one street that needs them all",
    body: (h, org, faith) => `
      ${h.paragraph(
        `Meek Meet exists for a simple reason: every faith teaches that the humble inherit the earth, and almost none of our streets are built to let the humble speak. ${org ?? "Your organisation"} understands what politicians forget — that the mosque and the synagogue and the temple and the church are not rivals on a street. They are its memory, its pantry, its gathering places, its conscience.`
      )}
      ${h.paragraph(
        "Our own name is drawn from the Christian Gospel — blessed are the meek, for they shall inherit the earth — but we wear it as a shared inheritance, not a brand. Christian is the spark; the table is set for every tradition and for those who hold none."
      )}
      ${h.paragraph(
        "We are asking you to help open the one room that belongs to all of them: a circle of neighbours — every faith and none — where the street speaks honestly about what it needs. The words are gathered, anonymised, and carried to council and MPs as a single report they cannot file away as sectarian, because it is the voice of everyone at once."
      )}
      ${h.paragraph(
        "This is what unity looks like when it stops being a slogan: not a festival of difference, but the mosque's elderly neighbour and the church's young family and the temple's new arrivals, saying one thing together about their street."
      )}
    `,
    ps: (org, faith) =>
      `The flyer is A4 and print-ready and speaks to every tradition at once. One page on your noticeboard could be the first time your whole street has ever been asked, together.`,
  },

  secular: {
    eyebrow: "A proposal",
    subject: (org) =>
      org
        ? `A proposal for ${org} — your community's voice, carried further`
        : "A proposal — your community's voice, carried further",
    reLine: (org) => `Re: Giving ${org ?? "your community"} a voice beyond your walls`,
    heading: () => "Your community already knows what this street needs",
    body: (h, org, faith) => `
      ${h.paragraph(
        `${org ?? "Your organisation"} already does something no campaign can: it gathers people who trust one another, week after week. The conversations in your queue, your hall, and your carpark — about rent, about loneliness, about the roads and the lights — are full of precise, practical knowledge about what this neighbourhood needs. Almost none of it reaches the people who make the decisions.`
      )}
      ${h.paragraph(
        "The arithmetic of local power is brutal and simple: a council hears from roughly one in two hundred of the people it governs, and the voices that reach it are the organised and the loud. Meek Meet exists to correct the arithmetic — small circles where your whole neighbourhood, including the people who never come through your doors, can say what the street actually needs."
      )}
      ${h.paragraph(
        "Our name states the premise plainly: the meek shall inherit the earth. Restated without scripture, it is simply this — a neighbourhood that hears only its loudest one in two hundred is governed blind. We embrace the meek of the world, everywhere: every faith, and those who hold none."
      )}
    `,
    ps: (org, faith) =>
      `The flyer is A4 and print-ready — one page on ${faith.door} could carry more of your street's voice than a year of submissions.`,
  },
};

// ─────────────────────────────────────────────────────────────

export const MARKETING_TEMPLATES: MarketingTemplate[] = [
  {
    key: "invite_vision",
    name: "The Vision",
    audience: "person",
    description: "The founding invitation — three escalating pitches: story, truth, last note.",
    build: (ctx) => {
      const base = getEmailTheme(ctx.theme);
      const h = themed(base);
      const themeKey = base.key;
      const pitch = pitchVision({ h, ctx, themeKey, cta: () => "" });
      return {
        subject: pitch.subject,
        html: emailShell({
          preheader: pitch.subject,
          eyebrow: pitch.eyebrow,
          theme: themeKey,
          contentHtml: pitch.content,
        }),
      };
    },
  },
  {
    key: "invite_circle",
    name: "Join a Circle",
    audience: "person",
    description: "Short and direct — invitation, proof, or the one-hour ask, by stage.",
    build: (ctx) => {
      const base = getEmailTheme(ctx.theme);
      const h = themed(base);
      const themeKey = base.key;
      const pitch = pitchCircle({ h, ctx, themeKey, cta: () => "" });
      return {
        subject: pitch.subject,
        html: emailShell({
          preheader: pitch.subject,
          eyebrow: pitch.eyebrow,
          theme: themeKey,
          contentHtml: pitch.content,
        }),
      };
    },
  },
  {
    key: "invite_shepherd",
    name: "Lead a Circle",
    audience: "person",
    description: "For the natural host — a calling, a challenge, or a found-you note.",
    build: (ctx) => {
      const base = getEmailTheme(ctx.theme);
      const h = themed(base);
      const themeKey = base.key;
      const pitch = pitchShepherd({ h, ctx, themeKey, cta: () => "" });
      return {
        subject: pitch.subject,
        html: emailShell({
          preheader: pitch.subject,
          eyebrow: pitch.eyebrow,
          theme: themeKey,
          contentHtml: pitch.content,
        }),
      };
    },
  },
  {
    key: "org_partnership",
    name: "Organisation Partnership",
    audience: "org",
    description: "A formal letter in three drafts: proposal, second letter, last note.",
    build: (ctx) => {
      const base = getEmailTheme(ctx.theme);
      const t = ctx.orgAccent
        ? { ...base, accent: ctx.orgAccent, calloutBorder: ctx.orgAccent, buttonBg: ctx.orgAccent }
        : base;
      const h = themed(t);
      const themeKey = base.key;
      const pitch = pitchOrg({ h, ctx, themeKey, cta: () => "" });
      return {
        subject: pitch.subject,
        html: emailShell({
          preheader: pitch.subject,
          eyebrow: pitch.eyebrow,
          theme: themeKey,
          contentHtml: pitch.content,
        }),
      };
    },
  },
];

export function getMarketingTemplate(key: string): MarketingTemplate | undefined {
  return MARKETING_TEMPLATES.find((t) => t.key === key);
}
