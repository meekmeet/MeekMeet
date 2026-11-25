// Shared display metadata for every scripture tradition the app can read.
// Consumed by SearchScreen, BookmarksScreen, CirclesScreen,
// GatheringDetailScreen, CrossReference, and ReaderScreen so new traditions
// only have to be registered once, here.

export const TRADITION_LABELS: Record<string, string> = {
  bible: 'Bible',
  tanakh: 'Tanakh',
  quran: 'Quran',
  buddhist: 'Dhammapada',
  mormon: 'Book of Mormon',
  dead_sea_scrolls: 'Dead Sea Scrolls',
  nag_hammadi: 'Nag Hammadi Library',
  apocrypha: 'Apocrypha',
  pseudepigrapha: 'Pseudepigrapha',
  vedas: 'Rig Veda',
  upanishads: 'Upanishads',
  tao: 'Tao Te Ching',
  confucian: 'Analects',
  sikh: 'Japji Sahib',
  jain: 'Jain Sutras',
  jewish_wisdom: 'Wisdom of the Sages',
  kabbalah: 'Kabbalah',
  gnostic_codices: 'Gnostic Codices',
  apostolic_fathers: 'Apostolic Fathers',
  desert_fathers: 'Desert Fathers',
  christian_mystics: 'Christian Mystics',
  celtic: 'Celtic Christianity',
  gita: 'Bhagavad Gita',
  buddhist_sutras: 'Buddhist Sutras',
  sufi_wisdom: 'Sufi Path',
  avesta: 'Gathas of Zarathustra',
  hermetica: 'Hermetica',
  egyptian_wisdom: 'Egyptian Wisdom',
  mandaean: 'Ginza Rabba',
}

export const TRADITION_COLORS: Record<string, string> = {
  bible: 'bg-emerald-100 text-emerald-800',
  tanakh: 'bg-amber-100 text-amber-800',
  quran: 'bg-sky-100 text-sky-800',
  buddhist: 'bg-rose-100 text-rose-800',
  mormon: 'bg-orange-100 text-orange-800',
  dead_sea_scrolls: 'bg-stone-200 text-stone-700',
  nag_hammadi: 'bg-violet-100 text-violet-800',
  apocrypha: 'bg-teal-100 text-teal-800',
  pseudepigrapha: 'bg-indigo-100 text-indigo-800',
  vedas: 'bg-yellow-100 text-yellow-800',
  upanishads: 'bg-orange-100 text-orange-900',
  tao: 'bg-gray-200 text-gray-700',
  confucian: 'bg-red-100 text-red-800',
  sikh: 'bg-blue-100 text-blue-800',
  jain: 'bg-lime-100 text-lime-800',
  jewish_wisdom: 'bg-amber-100 text-amber-900',
  kabbalah: 'bg-purple-100 text-purple-800',
  gnostic_codices: 'bg-fuchsia-100 text-fuchsia-800',
  apostolic_fathers: 'bg-emerald-100 text-emerald-900',
  desert_fathers: 'bg-yellow-100 text-yellow-900',
  christian_mystics: 'bg-sky-100 text-sky-900',
  celtic: 'bg-green-100 text-green-800',
  gita: 'bg-orange-100 text-orange-800',
  buddhist_sutras: 'bg-rose-100 text-rose-900',
  sufi_wisdom: 'bg-cyan-100 text-cyan-800',
  avesta: 'bg-red-100 text-red-900',
  hermetica: 'bg-slate-200 text-slate-700',
  egyptian_wisdom: 'bg-amber-200 text-amber-900',
  mandaean: 'bg-blue-100 text-blue-900',
}

export function traditionLabel(tradition: string): string {
  return TRADITION_LABELS[tradition] ?? tradition
}

export function traditionColor(tradition: string): string {
  return TRADITION_COLORS[tradition] ?? 'bg-midnight/5 text-charcoal-muted'
}

export const ALL_TRADITION_COUNT = Object.keys(TRADITION_LABELS).length
