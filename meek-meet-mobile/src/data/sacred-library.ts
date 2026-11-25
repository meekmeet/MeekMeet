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
      { id: 'thunder_perfect_mind', name: 'The Thunder, Perfect Mind', note: 'A revelation spoken by a female voice in paradoxes: "I am the first and the last. I am the honoured and the scorned."' },
      { id: 'apocryphon_of_john', name: 'The Apocryphon of John', note: 'The secret teaching given to John after the resurrection: the invisible Spirit, the fall of Sophia, and the spark in Adam.' },
      { id: 'dialogue_of_saviour', name: 'The Dialogue of the Saviour', note: 'Three disciples — Judas, Matthew and Mary — ask the risen Christ their hardest questions, and doubt is honoured as the door of knowledge.' },
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
      { id: '4_ezra', name: 'Fourth Ezra — Selected Chapters', note: 'A grieving scribe argues with God about why the wicked prosper — the most searching theodicy of the ancient world.' },
      { id: '2_baruch', name: 'Second Baruch — Selected Chapters', note: 'Jeremiah\'s secretary, after the temple\'s fall, on resurrection, the renewal of the world, and the lamp of the law.' },
      { id: 'psalms_of_solomon', name: 'Psalms of Solomon — Selected Psalms', note: 'Eighteen psalms of the Roman conquest — and the clearest picture of the awaited king before the Gospels.' },
      { id: 'odes_of_solomon', name: 'Odes of Solomon — Selected Odes', note: 'The earliest Christian hymnbook: forty-two odes of the risen life, "as the current of waters released."' },
      { id: 'testaments_twelve', name: 'Testaments of the Twelve Patriarchs — Selected Testaments', note: 'The twelve sons of Jacob on their deathbeds, each confessing his worst sin and naming its cure — forgiveness, patience, honest work.' },
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
      { id: 'mundaka', name: 'Mundaka Upanishad', note: 'The two birds on the same tree, and the verse India carved on its state emblem: "Truth alone triumphs."' },
      { id: 'taittiriya', name: 'Taittiriya Upanishad', note: 'The five sheaths of the self, from food to bliss — and Bhrigu, who found Brahman by being told four times to ask again.' },
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
      { id: 'chuang_tzu', name: 'The Chuang Tzu — Selected Chapters', note: 'The butterfly dream, the happiness of fishes, the useless tree — Taoism\'s laughing genius at play.' },
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
      { id: 'great_learning', name: 'The Great Learning', note: 'The ladder from investigating things to ordering the kingdom — the Confucian curriculum of self-cultivation.' },
      { id: 'doctrine_of_mean', name: 'The Doctrine of the Mean', note: 'The art of balance: the mind in equilibrium, harmony in motion, and the way that never leaves the ordinary.' },
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
      { id: 'gurbani', name: 'Gurbani — Selections from the Guru Granth Sahib', note: '"There is no Hindu, there is no Muslim" — the Gurus on the one God behind every name, and the temple within the chest.' },
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
      { id: 'kalpasutra', name: 'The Kalpa Sutra — Lives of the Tirthankaras', note: 'The life of Mahavira: fourteen dreams, the tearing out of his hair, twelve years of wandering, and the night of perfect knowledge.' },
    ],
  },
  {
    id: 'jewish_wisdom',
    name: 'The Wisdom of the Sages',
    era: 'c. 200 BCE – 200 CE',
    origin: 'Judea & Alexandria',
    description:
      'The rabbinic and Hellenistic-Jewish wisdom that grew alongside the Bible: the Ethics of the Fathers, a chain of one-liners from Sinai to the rabbis; the Midrash, the storytelling tradition that argued with scripture until it opened; and Philo of Alexandria, the philosopher who read Moses with Plato in one hand.',
    whyItMatters:
      'Hillel\'s "If not now, when?" and the Midrash\'s insistence that whoever saves a single soul saves a whole world are the moral grammar half the world still thinks in — mostly without knowing where it learned it.',
    books: [
      { id: 'pirkei_avot', name: 'Pirkei Avot — Ethics of the Fathers', note: 'Sixty sages in three chapters: "The day is short, the task is great" — and the verse Matthew 5:5 grew from.' },
      { id: 'midrash', name: 'Selections from the Midrash', note: 'The palace in flames, the oven of Akhnai, the voice of God weeping over the temple — scripture argued back to life.' },
      { id: 'philo', name: 'Philo of Alexandria — Selections', note: 'The Jewish Platonist on the image of God, the stranger at the gate, and the table set for a guest who might be God.' },
    ],
  },
  {
    id: 'kabbalah',
    name: 'The Kabbalah',
    era: 'c. 3rd – 13th century CE',
    origin: 'Galilee & Provence',
    description:
      'The mystical spine of Judaism: the Sefer Yetzirah, which imagines creation as an alphabet spoken into being, and the Zohar, the "Book of Splendour" — so revered it became the third book of Jewish life after the Bible and the Talmud.',
    whyItMatters:
      'The Zohar\'s teaching that every good deed gathers a scattered spark of light back to God turned ordinary kindness into cosmic repair — tikkun — and gave Judaism its grammar of hidden meaning.',
    books: [
      { id: 'sefer_yetzirah', name: 'Sefer Yetzirah — The Book of Formation', note: 'Thirty-two paths of wisdom, ten sefirot, twenty-two letters — the universe as a book God wrote in Hebrew.' },
      { id: 'zohar', name: 'The Zohar — Book of Splendour, Selections', note: 'The broken vessels, the gate of tears, and the candle you rob your neighbour of when you hide it.' },
    ],
  },
  {
    id: 'gnostic_codices',
    name: 'The Other Gnostic Codices',
    era: 'c. 2nd – 4th century CE',
    origin: 'Egypt & Syria',
    description:
      'Beyond Nag Hammadi: the Gospel of Mary, in which Mary Magdalene steadies the weeping apostles and Peter is told "if the Saviour made her worthy, who are you to reject her?"; the Hymn of the Pearl, the soul\'s journey told as a fairy tale; and Pistis Sophia, the great drama of wisdom fallen and recovered.',
    whyItMatters:
      'These are the Christianities that lost — and losing, were buried, and burying, survived. They ask the questions the winners stopped asking, in the voice of a woman the winners tried to silence.',
    books: [
      { id: 'gospel_of_mary', name: 'The Gospel of Mary', note: 'The apostle to the apostles, defending her vision against Peter — the earliest gospel named for a woman.' },
      { id: 'hymn_of_pearl', name: 'The Hymn of the Pearl', note: 'Sent to Egypt for a pearl, the prince forgets who he is — until a letter from home wakes him. The soul\'s story in one song.' },
      { id: 'pistis_sophia', name: 'Pistis Sophia — Selections', note: 'Wisdom herself, fallen into chaos, offering thirteen repentances until the veil opens — the most tender gnostic epic.' },
    ],
  },
  {
    id: 'apostolic_fathers',
    name: 'The Apostolic Fathers',
    era: 'c. 50 – 160 CE',
    origin: 'Rome & Antioch',
    description:
      'The earliest Christian writings outside the New Testament, some written while the apostles\' contemporaries still lived: the Didache, a first-century church manual lost for fifteen centuries; the Shepherd of Hermas, the second century\'s bestselling book; and Clement of Rome\'s letter to Corinth, written before some books of the New Testament were finished.',
    whyItMatters:
      'The Didache quotes the Sermon on the Mount — including "the meek shall inherit the earth" — as a rule for daily life, decades before the Gospels were bound into a Bible. This is the church before it was an institution: a manual, a dream, and a letter.',
    books: [
      { id: 'didache', name: 'The Didache — The Teaching of the Twelve', note: 'The two ways, life and death — and the first written rule of Christian community, buried in the desert until 1873.' },
      { id: 'shepherd_of_hermas', name: 'The Shepherd of Hermas — Selections', note: 'An old woman with a book, a tower built on water, and twelve mountains — the dream-vision that taught an empire repentance.' },
      { id: 'first_clement', name: '1 Clement — Selections', note: 'Rome writes to Corinth about peace: the harmony of the seasons, the foot and the eye, and love as "the bond of God."' },
    ],
  },
  {
    id: 'desert_fathers',
    name: 'The Desert Fathers',
    era: '4th – 5th century CE',
    origin: 'The Egyptian desert',
    description:
      'When Christianity became respectable, thousands fled to the desert to become unrespectable — monks and nuns who answered visitors with single sentences that have never stopped being quoted: Anthony, Macarius, Moses the Black the robber, and the ammas Sarah and Syncletica.',
    whyItMatters:
      '"Abba, give me a word" — the whole tradition fits in that request and its answers. The desert fathers are the proof that the deepest theology can be carried in one sentence and one water-jar.',
    books: [
      { id: 'sayings_of_the_desert', name: 'Sayings of the Desert Fathers — Selections', note: 'The bow that must not always be drawn, the bag of sand we each drag behind us, and the gate that only tears open.' },
    ],
  },
  {
    id: 'christian_mystics',
    name: 'The Christian Mystics',
    era: '6th – 14th century CE',
    origin: 'Athens to Norwich',
    description:
      'The contemplative stream: Pseudo-Dionysius, who taught that God is beyond every name; John Climacus\'s ladder of thirty steps; Meister Eckhart\'s dangerous sermons; the anonymous Cloud of Unknowing; and Julian of Norwich, the first woman known to write a book in English — an anchoress who saw God hold the world like a hazelnut.',
    whyItMatters:
      '"All shall be well, and all manner of thing shall be well." Written in plague England by a woman who had nearly died, it remains the most hopefull sentence in English theology — and it was nearly lost, surviving in a handful of hand-copied manuscripts.',
    books: [
      { id: 'julian_of_norwich', name: 'Julian of Norwich — Revelations of Divine Love', note: 'The hazelnut, the mothering Christ, and "love was His meaning" — the showings of 1373.' },
      { id: 'cloud_of_unknowing', name: 'The Cloud of Unknowing', note: 'The anonymous guide to the prayer beyond words: between you and God, a cloud — and only love can pierce it.' },
      { id: 'meister_eckhart', name: 'Meister Eckhart — Sermons', note: 'The eternal birth in the soul, the eye that is God\'s eye, and "I pray God to rid me of God."' },
      { id: 'mystical_theology', name: 'The Mystical Theology — Pseudo-Dionysius', note: 'The short, vast treatise that taught a millennium of Christians to approach God by unknowing.' },
      { id: 'ladder_of_ascent', name: 'The Ladder of Divine Ascent — Selections', note: 'Thirty steps from renunciation to love, from a monk who spent forty years on one mountain.' },
    ],
  },
  {
    id: 'celtic',
    name: 'The Celtic Christian Tradition',
    era: 'oral tradition, collected 1860–1899',
    origin: 'The Hebrides, Scotland',
    description:
      'The prayers of the Gaelic West, gathered from the last islanders who still prayed them: blessings for kindling the fire, milking the cow, sowing the seed, putting out to sea — a Christianity of hearth and weather that never made it into a single official book until Alexander Carmichael wrote it down.',
    whyItMatters:
      'Here the sacred is not a Sunday but a day: every chore has a prayer, every prayer a neighbour in it. It is the most domestic mysticism ever recorded — and the closest thing we have to how ordinary holy people actually talked to God.',
    books: [
      { id: 'carmina_gadelica', name: 'Carmina Gadelica — Hymns and Incantations', note: 'The kindling of the fire, the blessing of the boat, and the mending of the world, one stitch of kindness at a time.' },
    ],
  },
  {
    id: 'gita',
    name: 'The Bhagavad Gita',
    era: 'c. 2nd century BCE',
    origin: 'The field of Kurukshetra, India',
    description:
      'The song of the Lord: seven hundred verses spoken by Krishna to the warrior Arjuna between two armies, on the morning of a battle neither wants. Part of the Mahabharata, it became the most beloved scripture of Hinduism — the Gospels, the Quran and the Gita are the three books most carried into battle and into prison.',
    whyItMatters:
      '"Your right is to the work alone, never to its fruits." Gandhi called it his dictionary of action; Thoreau carried it at Walden. It is the world\'s most compact answer to the question every honest person asks: how do I act, when every action is tangled?',
    books: [
      { id: 'bhagavad_gita', name: 'The Bhagavad Gita — Selected Verses', note: 'The deathless Self, the yoga of action, the equal vision, and the leaf offered with love — in Arnold\'s verse.' },
    ],
  },
  {
    id: 'buddhist_sutras',
    name: 'The Buddhist Sutras',
    era: 'c. 5th century BCE – 7th century CE',
    origin: 'Northern India & China',
    description:
      'The wider Buddhist canon beyond the Dhammapada: the Heart Sutra, the most recited text in Buddhism; the Lotus Sutra with its burning house and prodigal son; the Buddha\'s charter of loving-kindness and of free inquiry; Shantideva\'s Way of the Bodhisattva; the Zen Platform Sutra; and the Therigatha, the verses of Buddhism\'s first nuns.',
    whyItMatters:
      'The Kalama Sutta may be the most modern ancient text in existence: do not accept anything because of tradition, hearsay, or scripture — test it, and only then take it up. Twenty-three centuries before the enlightenment, a charter for the examining mind.',
    books: [
      { id: 'heart_sutra', name: 'The Heart Sutra', note: 'Form is emptiness, emptiness is form — the perfection of wisdom in one page, chanted daily by millions.' },
      { id: 'lotus_sutra', name: 'The Lotus Sutra — Selections', note: 'The burning house, the prodigal son, the dragon king\'s daughter — the sutra of the one vehicle and the many skilful means.' },
      { id: 'metta_sutta', name: 'The Metta Sutta — Loving-Kindness', note: 'As a mother protects her only child, so cherish all beings — the meditation the world keeps retranslating.' },
      { id: 'kalama_sutta', name: 'The Kalama Sutta — The Charter of Free Inquiry', note: 'Do not go by report, tradition, hearsay, or pleasing theory — the Buddha\'s answer to a town full of contradictory teachers.' },
      { id: 'bodhicaryavatara', name: 'The Way of the Bodhisattva — Selections', note: 'Shantideva\'s masterpiece: "May I be a bridge for those who wish to cross the flood."' },
      { id: 'platform_sutra', name: 'The Platform Sutra — Selections', note: 'The illiterate rice-pounder who became the Sixth Patriarch: "not the wind, not the flag — your minds are moving."' },
      { id: 'therigatha', name: 'Therigatha — Verses of the Elder Nuns', note: 'The voices of the first Buddhist women: Patacara\'s flood, Subha\'s eyes, Soma\'s answer — liberation has no gender.' },
    ],
  },
  {
    id: 'sufi_wisdom',
    name: 'The Sufi Path',
    era: '13th century CE',
    origin: 'Konya & Nishapur',
    description:
      'The mystical heart of Islam: Rumi\'s Masnavi, called the Qur\'an in Persian, and Attar\'s Conference of the Birds, in which thirty birds cross seven valleys to find their king — and find a mirror. Rumi is now the best-selling poet in America, eight centuries after his death.',
    whyItMatters:
      'The reed cut from the reed-bed, singing to get home; the drop afraid of the sea. The Sufis found a language for longing that crosses every border their religion ever had — and every border ours do.',
    books: [
      { id: 'masnavi', name: 'The Masnavi — Selections', note: 'The song of the reed, the elephant in the dark house, and the guest house of the human being.' },
      { id: 'conference_of_the_birds', name: 'The Conference of the Birds — Selections', note: 'The hoopoe leads the birds through seven valleys to the Simurgh — and the Simurgh is thirty birds. Si murgh: thirty birds.' },
    ],
  },
  {
    id: 'avesta',
    name: 'The Gathas of Zarathustra',
    era: 'c. 1200 – 1000 BCE',
    origin: 'The Iranian plateau',
    description:
      'The hymns of Zarathustra (Zoroaster), the prophet of ancient Persia who taught that existence is a struggle between truth and the lie, that every person chooses a side with every thought and deed, and that the world will be made new. His faith shaped the ideas of judgement, heaven, hell and resurrection that Judaism, Christianity and Islam would inherit.',
    whyItMatters:
      'Zoroastrianism had one question and it was the right one: whose side are you on, and how do you know? In an age that assumes good and evil are matters of taste, the Gathas insist they are matters of choice — yours, today.',
    books: [
      { id: 'gathas', name: 'The Gathas — Selected Hymns', note: 'The cry of the cow\'s soul, the two spirits at the beginning, and the renovation of the world.' },
    ],
  },
  {
    id: 'hermetica',
    name: 'The Hermetica',
    era: 'c. 1st – 3rd century CE',
    origin: 'Alexandria',
    description:
      'The revelation attributed to Hermes Trismegistus, the thrice-great master of the Egyptian mysteries: dialogues on mind, word, and the soul\'s immortality. Lost with the ancient world, a single manuscript reached Florence in 1460 — and within a generation Europe was reading it in Latin, Greek and Hebrew, and the Renaissance had its scripture of wonder.',
    whyItMatters:
      'Marsilio Ficino dropped everything — including a translation of Plato — to translate it first. The Hermetica taught Europe that the universe is alive, that the mind is divine, and that knowing yourself is knowing God.',
    books: [
      { id: 'corpus_hermeticum', name: 'The Corpus Hermeticum — Selections', note: 'Poimandres, the mind of sovereignty; the great mixing bowl; and the hymn of the reborn soul.' },
    ],
  },
  {
    id: 'egyptian_wisdom',
    name: 'The Wisdom of Ancient Egypt',
    era: 'c. 2400 – 1300 BCE',
    origin: 'The Nile valley',
    description:
      'The oldest wisdom literature on earth: the Maxims of Ptahhotep, written by a vizier of the Old Kingdom before the time of Abraham, and the Book of the Dead, the scrolls buried with the dead to guide them through the hall where the heart is weighed against a feather.',
    whyItMatters:
      'Four and a half thousand years ago an Egyptian official told his son: do not be arrogant because of your knowledge, love your wife, calm your anger, do not carry slander. The human heart has not changed; neither has the counsel.',
    books: [
      { id: 'maxims_of_ptahhotep', name: 'The Maxims of Ptahhotep', note: 'The vizier\'s farewell to his son: good speech is more hidden than the emerald.' },
      { id: 'book_of_the_dead', name: 'The Book of the Dead — Selections', note: 'The negative confession — "I am pure, I am pure, I am pure, I am pure" — and the weighing of the heart.' },
    ],
  },
  {
    id: 'mandaean',
    name: 'The Ginza Rabba',
    era: 'compiled by 3rd century CE; roots far older',
    origin: 'Mesopotamia',
    description:
      'The great treasure of the Mandaeans — the last surviving gnostic religion on earth. A small community of river-baptising people in Iraq and Iran, neither Jewish nor Christian nor Muslim, whose scripture preserves a world of light, a fallen soul, and a saviour who descends to bring the prisoners home. Almost no one outside the community has ever heard of it.',
    whyItMatters:
      'The Mandaeans are the last living window into the world that produced the Gospels and the gnostic gospels alike. Their survival — through every empire and every persecution — is one of the quiet miracles of religious history, and their scripture has barely been read outside their own rivers.',
    books: [
      { id: 'ginza_rabba', name: 'The Ginza Rabba — Selections', note: 'The jordan of truth, the gate that only tears open, and the password that is the Name.' },
    ],
  },
]

export function getLibraryEntry(id: string): SacredLibraryEntry | undefined {
  return SACRED_LIBRARY.find((e) => e.id === id)
}
