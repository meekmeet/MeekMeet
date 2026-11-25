// Rich editorial metadata for the Sacred Library — the lesser-known texts of
// the world's great traditions that rarely survive the editing of the
// mainstream canon. Descriptions here are editorial (written for Meek Meet);
// the passage texts themselves live in public/data/scriptures/<tradition>/.

export interface SacredLibraryEntry {
  id: string
  name: string
  era: string
  origin: string
  description: string
  whyItMatters: string
  books: { id: string; name: string; note: string }[]
}

export const SACRED_LIBRARY: SacredLibraryEntry[] = [
  {
    id: 'dead_sea_scrolls',
    name: 'The Dead Sea Scrolls',
    era: 'c. 250 BCE – 70 CE',
    origin: 'Qumran, Judean Desert',
    description:
      'The greatest manuscript discovery of the twentieth century — a library of scrolls hidden in eleven caves by a Jewish sect before the Roman destruction of Jerusalem. It contains our oldest biblical manuscripts (a thousand years older than any previously known) and the sect\'s own rulebooks and hymns.',
    whyItMatters:
      'Before 1947, scholars could only guess how the Bible was formed. The scrolls let us watch a community of believers, on the eve of catastrophe, deciding what was sacred — and why.',
    books: [
      { id: 'community_rule', name: 'The Community Rule (1QS)', note: 'The constitution of the Qumran community: separation, purity, and "the way of the Lord" in the wilderness.' },
      { id: 'thanksgiving_hymns', name: 'The Thanksgiving Hymns (1QH)', note: 'First-person hymns of gratitude and suffering, sometimes attributed to the Teacher of Righteousness himself.' },
      { id: 'war_scroll', name: 'The War Scroll (1QM)', note: 'A vivid apocalyptic battle plan: the sons of light against the sons of darkness, with angels in the ranks.' },
    ],
  },
  {
    id: 'nag_hammadi',
    name: 'The Nag Hammadi Library',
    era: 'codices buried c. 350–400 CE',
    origin: 'Upper Egypt',
    description:
      'Thirteen Coptic codices found by a farmer digging for fertilizer in 1945 — the library of an ancient monastery, buried to save it from burning. Inside were dozens of lost Christian and Gnostic works, including a complete sayings-gospel older than any of the four in the New Testament.',
    whyItMatters:
      'For sixteen centuries we knew the "Gnostics" only from their enemies. Nag Hammadi let them speak for themselves — and revealed sayings of Jesus that had never been heard in any church.',
    books: [
      { id: 'gospel_of_thomas', name: 'The Gospel of Thomas', note: '114 sayings of Jesus, found complete — no miracles, no crucifixion, only the search: "Let him who seeks continue seeking."' },
      { id: 'gospel_of_truth', name: 'The Gospel of Truth', note: 'A moving meditation attributed to the teacher Valentinus: the Father\'s name is revealed where oblivion is overcome.' },
      { id: 'gospel_of_philip', name: 'The Gospel of Philip', note: 'Mystical reflections on baptism, the bridal chamber, and the reunion of what was separated at the beginning.' },
    ],
  },
  {
    id: 'apocrypha',
    name: 'The Apocrypha',
    era: 'c. 300–100 BCE',
    origin: 'Alexandria & Jerusalem',
    description:
      'Seven books the Catholic and Orthodox churches kept and Protestant Reformers set aside: Tobit, Judith, the Wisdom of Solomon, Sirach, Baruch, and the Maccabees. They lived in the Greek Bible for two thousand years — and in the King James Bible until 1827.',
    whyItMatters:
      'Here are the heroes Protestant children never met: the widow Judith who saved her city, the mother who watched seven sons die before renouncing the law, and the first recorded prayers for the dead.',
    books: [
      { id: 'tobit', name: 'The Book of Tobit', note: 'A folk tale of exile, blindness, a loyal son, and the angel Raphael — "Do that to no man which thou hatest."' },
      { id: 'judith', name: 'The Book of Judith', note: 'A widow of extraordinary nerve beheads an invading general and sings one of the great victory songs of the tradition.' },
      { id: 'wisdom', name: 'The Wisdom of Solomon', note: 'Immortality of the soul, wisdom as "a reflection of eternal light" — the text every early Christian apologist quoted.' },
      { id: 'sirach', name: 'Ecclesiasticus (Sirach)', note: 'Jesus ben Sira\'s grandfatherly advice on friendship, work, and death — "Let us now praise famous men."' },
      { id: 'baruch', name: 'The Book of Baruch', note: 'Jeremiah\'s scribe consoles the exiles: "O Jerusalem, look about thee toward the east."' },
      { id: '1_maccabees', name: '1 Maccabees', note: 'The revolt of Judas Maccabeus — Hanukkah\'s origin story, told by a sober historian.' },
      { id: '2_maccabees', name: '2 Maccabees', note: 'The mother of seven martyrs, miracles in the temple, and the doctrine of the resurrection of the dead.' },
    ],
  },
  {
    id: 'pseudepigrapha',
    name: 'The Pseudepigrapha',
    era: 'c. 300 BCE – 200 CE',
    origin: 'Jewish communities of the Second Temple period',
    description:
      'Jewish books that nearly became scripture — and in Ethiopia, actually did. The Book of Enoch was quoted in the New Testament epistle of Jude, revered by the early church fathers, and survives complete only in Ge\'ez, the liturgical language of Ethiopian Christianity.',
    whyItMatters:
      'Enoch\'s vision of fallen Watchers and the coming judgement shaped Christian ideas of angels, demons, and the last day more than almost any book outside the Bible itself.',
    books: [
      { id: '1_enoch', name: 'The Book of Enoch (1 Enoch)', note: 'The heavenly journeys of the scribe who "walked with God": the Watchers, the great judgement, and ten thousands of holy ones.' },
    ],
  },
  {
    id: 'vedas',
    name: 'The Rig Veda',
    era: 'c. 1500–1200 BCE',
    origin: 'The Indus & Ganges plains',
    description:
      'The oldest scripture still chanted in daily worship — 1,028 hymns to Agni, Indra, the dawn, and the cosmic order ṛta, composed in Sanskrit more than three thousand years ago. It is among the oldest religious texts of humankind.',
    whyItMatters:
      'The Nasadiya hymn asks "whence came this creation?" and ends with the scientist\'s confession: the one who looks down on it, "he verily knows it, or perhaps he knows not."',
    books: [
      { id: 'rig_veda', name: 'Rig Veda — Selected Hymns', note: 'The Hymn of Creation, the Purusha (cosmic person), the One called by many names, and the hymn of unity.' },
    ],
  },
  {
    id: 'upanishads',
    name: 'The Upanishads',
    era: 'c. 800–500 BCE',
    origin: 'Forest hermitages of India',
    description:
      'The philosophical dialogues that grew like ivy over the Vedic sacrifice — students questioning teachers about the Self (ātman), the Absolute (Brahman), death, and liberation. Their teaching, "Tat tvam asi" — That thou art — became the seed of Vedanta.',
    whyItMatters:
      'The chariot allegory of the Katha, where the senses are horses and the mind the reins, is one of the most influential images in the history of human thought about consciousness.',
    books: [
      { id: 'isha', name: 'Isha Upanishad', note: 'The shortest and most quoted: "All this is enveloped by the Lord."' },
      { id: 'katha', name: 'Katha Upanishad', note: 'Nachiketas bargains with Death itself for the secret of what survives it.' },
      { id: 'chandogya', name: 'Chandogya Upanishad', note: 'The banyan seed and the great teaching "That thou art" to the boy Shvetaketu.' },
      { id: 'brihadaranyaka', name: 'Brihadaranyaka Upanishad', note: 'The oldest Upanishad: "Not this, not this," and the night-long dialogue with Maitreyi.' },
    ],
  },
  {
    id: 'tao',
    name: 'The Tao Te Ching',
    era: 'c. 4th century BCE',
    origin: 'Ancient China',
    description:
      'Eighty-one brief chapters attributed to the sage Laozi — five thousand characters that founded Taoism and quietly redirected Chinese thought toward yielding, humility, and the power of the unforced life.',
    whyItMatters:
      'No book is more quoted by people who have never read it — and fewer have earned it. "A journey of a thousand miles begins with a single step."',
    books: [
      { id: 'tao_te_ching', name: 'Tao Te Ching — Selected Chapters', note: 'The nameless origin, the usefulness of emptiness, the strength of water, and the way of heaven.' },
    ],
  },
  {
    id: 'confucian',
    name: 'The Confucian Classics',
    era: 'sayings of 551–479 BCE',
    origin: 'The states of Lu and Zhou, China',
    description:
      'The Analects are not a book so much as a memory: twenty short books of what Confucius said and how he lived, gathered by his disciples after his death. For two thousand years, no one in East Asia was educated without them.',
    whyItMatters:
      'One man\'s habits — study, ritual, loyalty, self-examination — became the operating system of the largest civilization on earth.',
    books: [
      { id: 'analects', name: 'The Analects (Lun Yu) — Selected Books', note: 'The stages of a life, the three daily examinations, and the rule of reciprocity: do not do to others what you would not want done to you.' },
    ],
  },
  {
    id: 'sikh',
    name: 'Sikh Scripture',
    era: '1469–1539 CE',
    origin: 'Punjab, India & Pakistan',
    description:
      'Selections from the opening of the Guru Granth Sahib — the Mul Mantar, the root formula of Sikh faith composed by Guru Nanak, and the opening of the Japji, the morning prayer recited daily by observant Sikhs for five centuries.',
    whyItMatters:
      'In four lines the Mul Mantar does what creeds take pages to do: one God, without fear, without hatred, known by grace alone.',
    books: [
      { id: 'japji', name: 'Japji Sahib — Selections', note: 'The Mul Mantar and the opening stanzas: how the unthinkable God is approached.' },
    ],
  },
  {
    id: 'jain',
    name: 'Jain Scripture',
    era: 'c. 5th century BCE – 5th century CE',
    origin: 'Eastern India',
    description:
      'Jainism is older than Buddhism and more radical in its nonviolence: monks sweep the ground before them lest they tread on living things. The Tattvartha Sutra compresses the whole teaching into aphorisms; the Acaranga Sutra is its oldest surviving text.',
    whyItMatters:
      'Mahatma Gandhi\'s nonviolence came from Jain teachers. "All beings should not be slain" is a two-thousand-year-old ecological ethic.',
    books: [
      { id: 'tattvartha', name: 'The Tattvartha Sutra', note: 'Right faith, right knowledge, right conduct — the path to liberation in a single sentence.' },
      { id: 'acaranga', name: 'The Acaranga Sutra', note: 'The oldest Jain text: the vow of ahimsa toward every living being.' },
    ],
  },
]

export function getLibraryEntry(id: string): SacredLibraryEntry | undefined {
  return SACRED_LIBRARY.find((e) => e.id === id)
}
