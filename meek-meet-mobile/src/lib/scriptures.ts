import type { DailyPassage, Verse, SearchResult } from '@/types'
import { getCuratedDailyVerse } from '@/data/curated-daily'
import { getCurrentWeekTheme, getDayOfWeek } from '@/data/weekly-themes'

// Traditions served by the dedicated loaders above (legacy pipeline).
const CORE_TRADITIONS = ['bible', 'quran', 'tanakh', 'buddhist', 'mormon'] as const

// The Sacred Library: texts loaded by the generic per-book JSON loader below.
// Each has public/data/scriptures/<tradition>/meta.json + <bookId>.json files
// shaped like the bible/mormon files ({ book, chapters: { "1": ["verse", ...] } }).
export const SACRED_LIBRARY_TRADITIONS = [
  'dead_sea_scrolls',
  'nag_hammadi',
  'apocrypha',
  'pseudepigrapha',
  'vedas',
  'upanishads',
  'tao',
  'confucian',
  'sikh',
  'jain',
] as const

export const ALL_READING_TRADITIONS = [...CORE_TRADITIONS, ...SACRED_LIBRARY_TRADITIONS]

export function isSacredLibraryTradition(tradition: string): boolean {
  return (SACRED_LIBRARY_TRADITIONS as readonly string[]).includes(tradition)
}

const traditionMeta: Record<string, { books: { id: string; name: string; chapters?: number; verses?: number }[] }> = {}

export async function loadTraditionMeta(tradition: string) {
  if (traditionMeta[tradition]) return traditionMeta[tradition]
  try {
    const res = await fetch(`/data/scriptures/${tradition}/meta.json`)
    const data = await res.json()
    traditionMeta[tradition] = data
    return data
  } catch {
    return { books: [] }
  }
}

export async function getChapterCount(tradition: string, bookId: string): Promise<number> {
  const meta = await loadTraditionMeta(tradition)
  const book = meta.books.find((b: any) => b.id === bookId)
  return book?.chapters ?? 1
}

export function isPlaceholderVerse(text: string): boolean {
  return /^\[.*?\d+.*?\]$/.test(text.trim())
}

export async function loadPassage(tradition: string, bookId: string, chapter: number): Promise<DailyPassage | null> {
  try {
    let verses: Verse[] = []
    let bookName = bookId

    if (tradition === 'bible' || tradition === 'tanakh' || tradition === 'mormon') {
      let data: any = null
      // Resolve fetch paths by tradition
      let paths: string[]
      if (tradition === 'tanakh') {
        paths = [`/data/scriptures/tanakh/kjv/${bookId}.json`, `/data/scriptures/bible/kjv/${bookId}.json`]
      } else if (tradition === 'mormon') {
        paths = [`/data/scriptures/mormon/${bookId}.json`]
      } else {
        paths = [`/data/scriptures/bible/kjv/${bookId}.json`]
      }
      for (const path of paths) {
        try {
          const res = await fetch(path)
          if (res.ok) {
            data = await res.json()
            break
          }
        } catch {
          // continue to next path
        }
      }
      if (!data) return null
      bookName = data.book || bookId
      const chapterVerses = data.chapters[String(chapter)] || []
      verses = chapterVerses.map((text: string, i: number) => ({ num: i + 1, text }))
      // Detect placeholder content like "[Psalms 1]"
      if (verses.length === 1 && isPlaceholderVerse(verses[0].text)) {
        return null
      }
    } else if (tradition === 'quran') {
      const res = await fetch(`/data/scriptures/quran/pickthall/${bookId}.json`)
      const data = await res.json()
      bookName = data.name || `Surah ${bookId}`
      verses = data.verses || []
    } else if (tradition === 'buddhist') {
      const res = await fetch(`/data/scriptures/buddhist/dhammapada.json`)
      const data = await res.json()
      bookName = data.book
      const chapterData = data.chapters[String(chapter)]
      verses = chapterData?.verses || []
    } else {
      // Generic Sacred Library loader: /data/scriptures/<tradition>/<bookId>.json
      // with the shared { book, chapters: { "1": ["v1", "v2", ...] } } shape.
      const res = await fetch(`/data/scriptures/${tradition}/${bookId}.json`)
      if (!res.ok) return null
      const data = await res.json()
      bookName = data.book || bookId
      const chapterVerses: string[] = data.chapters?.[String(chapter)] || []
      if (chapterVerses.length === 0) return null
      verses = chapterVerses.map((text: string, i: number) => ({ num: i + 1, text }))
    }

    return { tradition, bookId, book: bookName, chapter, verses }
  } catch {
    return null
  }
}

export async function getDailyReadingForTradition(tradition: string, dateStr?: string): Promise<DailyPassage | null> {
  const today = dateStr || new Date().toISOString().split('T')[0]
  const hash = dateHash(today)

  const meta = await loadTraditionMeta(tradition)
  const books = meta.books
  if (books.length === 0) return null

  const bookIndex = hash % books.length
  const book = books[bookIndex]
  const maxChapters = book.chapters || 1
  const chapter = (hash % maxChapters) + 1

  const passage = await loadPassage(tradition, book.id, chapter)
  if (passage) {
    return { ...passage, bookId: book.id }
  }

  return null
}

export async function getDailyReadingFromData(dateStr?: string): Promise<DailyPassage> {
  const today = dateStr || new Date().toISOString().split('T')[0]
  const hash = dateHash(today)

  const tradition = ALL_READING_TRADITIONS[hash % ALL_READING_TRADITIONS.length]

  const meta = await loadTraditionMeta(tradition)
  const books = meta.books
  if (books.length === 0) return getFallbackReading(tradition)

  const bookIndex = hash % books.length
  const book = books[bookIndex]
  const maxChapters = book.chapters || 1
  const chapter = (hash % maxChapters) + 1

  const passage = await loadPassage(tradition, book.id, chapter)
  if (passage) {
    // Ensure bookId is present
    return { ...passage, bookId: book.id }
  }

  return getFallbackReading(tradition)
}

export function dateHash(dateStr: string): number {
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export async function searchScriptures(query: string, tradition?: string, limit = 50): Promise<SearchResult[]> {
  const q = query.toLowerCase().trim()
  if (q.length < 2) return []

  const traditions = tradition ? [tradition] : [...ALL_READING_TRADITIONS]
  const results: SearchResult[] = []

  for (const t of traditions) {
    const meta = await loadTraditionMeta(t)
    if (!meta.books?.length) continue

    for (const book of meta.books) {
      if (results.length >= limit) break
      const maxChapters = book.chapters || 1

      for (let chapter = 1; chapter <= maxChapters; chapter++) {
        if (results.length >= limit) break
        const passage = await loadPassage(t, book.id, chapter)
        if (!passage || !passage.verses?.length) continue

        for (const v of passage.verses) {
          if (v.text.toLowerCase().includes(q)) {
            results.push({
              tradition: t,
              bookId: book.id,
              book: passage.book,
              chapter,
              verse: v.num,
              text: v.text,
            })
            if (results.length >= limit) break
          }
        }
      }
    }
  }

  return results
}

export async function getCuratedDailyReading(): Promise<DailyPassage & { reflection: string; theme: string }> {
  const curated = getCuratedDailyVerse()
  const passage = await loadPassage(curated.tradition, curated.bookId, curated.chapter)
  if (passage) {
    return {
      ...passage,
      bookId: curated.bookId,
      reflection: curated.reflection,
      theme: curated.theme,
    }
  }
  // Fallback to hardcoded text
  return {
    tradition: curated.tradition,
    bookId: curated.bookId,
    book: curated.book,
    chapter: curated.chapter,
    verses: [{ num: curated.verse, text: curated.text }],
    reflection: curated.reflection,
    theme: curated.theme,
  }
}

export function getWeeklyTheme() {
  return getCurrentWeekTheme()
}

export function getWeeklyDayIndex(): number {
  const dow = getDayOfWeek()
  return dow === 0 ? 6 : dow - 1 // Convert Sun=0 to Mon=0
}

export function getFallbackReading(tradition: string): DailyPassage {
  const fallbacks: Record<string, DailyPassage> = {
    bible: {
      tradition: 'bible',
      bookId: 'genesis',
      book: 'Genesis',
      chapter: 1,
      verses: [
        { num: 1, text: 'In the beginning God created the heaven and the earth.' },
        { num: 2, text: 'And the earth was without form, and void; and darkness was upon the face of the deep.' },
        { num: 3, text: 'And God said, Let there be light: and there was light.' },
      ],
    },
    quran: {
      tradition: 'quran',
      bookId: '1',
      book: 'Al-Fatihah',
      chapter: 1,
      verses: [
        { num: 1, text: 'In the name of Allah, the Beneficent, the Merciful.' },
        { num: 2, text: 'Praise be to Allah, Lord of the Worlds,' },
        { num: 3, text: 'The Beneficent, the Merciful.' },
      ],
    },
    tanakh: {
      tradition: 'tanakh',
      bookId: 'genesis',
      book: 'Genesis',
      chapter: 1,
      verses: [
        { num: 1, text: 'In the beginning God created the heaven and the earth.' },
        { num: 2, text: 'And the earth was without form, and void; and darkness was upon the face of the deep.' },
        { num: 3, text: 'And God said: Let there be light. And there was light.' },
      ],
    },
    buddhist: {
      tradition: 'buddhist',
      bookId: 'dhammapada',
      book: 'The Dhammapada',
      chapter: 1,
      verses: [
        { num: 1, text: 'All that we are is the result of what we have thought: it is founded on our thoughts, it is made up of our thoughts.' },
        { num: 2, text: 'If a man speaks or acts with an evil thought, pain follows him, as the wheel follows the foot of the ox that draws the carriage.' },
      ],
    },
    mormon: {
      tradition: 'mormon',
      bookId: '1_nephi',
      book: '1 Nephi',
      chapter: 1,
      verses: [
        { num: 1, text: 'I, Nephi, having been born of goodly parents, therefore I was taught somewhat in all the learning of my father; and having seen many afflictions in the course of my days, nevertheless, having been highly favored of the Lord in all my days...' },
        { num: 2, text: 'Yea, I make a record in the language of my father, which consists of the learning of the Jews and the language of the Egyptians.' },
        { num: 3, text: 'And I know that the record which I make is true; and I make it with mine own hand; and I make it according to my knowledge.' },
      ],
    },
    dead_sea_scrolls: {
      tradition: 'dead_sea_scrolls',
      bookId: 'community_rule',
      book: 'The Community Rule (1QS)',
      chapter: 1,
      verses: [
        { num: 1, text: 'For the Master, to teach the saints to live according to the Book of the Community Rule, that they may seek God with all their heart and soul, doing what is good and right before Him.' },
        { num: 2, text: 'And that they may love all the sons of light, each according to his lot in the counsel of God, and hate all the sons of darkness, each according to his guilt in the vengeance of God.' },
      ],
    },
    nag_hammadi: {
      tradition: 'nag_hammadi',
      bookId: 'gospel_of_thomas',
      book: 'The Gospel of Thomas',
      chapter: 1,
      verses: [
        { num: 1, text: 'These are the secret sayings which the living Jesus spoke and which Didymos Judas Thomas wrote down.' },
        { num: 2, text: 'Whoever finds the interpretation of these sayings will not experience death.' },
        { num: 3, text: 'Let him who seeks continue seeking until he finds. When he finds, he will become troubled. When he becomes troubled, he will be astonished, and he will rule over the All.' },
      ],
    },
    apocrypha: {
      tradition: 'apocrypha',
      bookId: 'wisdom',
      book: 'The Wisdom of Solomon',
      chapter: 2,
      verses: [
        { num: 1, text: 'But the souls of the righteous are in the hand of God, and there shall no torment touch them.' },
        { num: 2, text: 'In the sight of the unwise they seemed to die: and their departure is taken for misery.' },
        { num: 3, text: 'And their going from us to be utter destruction: but they are in peace.' },
      ],
    },
    pseudepigrapha: {
      tradition: 'pseudepigrapha',
      bookId: '1_enoch',
      book: 'The Book of Enoch (1 Enoch)',
      chapter: 1,
      verses: [
        { num: 1, text: 'The words of the blessing of Enoch, wherewith he blessed the elect and righteous, who will be living in the day of tribulation, when all the wicked and godless are to be removed.' },
        { num: 2, text: 'And behold! He cometh with ten thousands of His holy ones to execute judgement upon all, and to destroy all the ungodly.' },
      ],
    },
    vedas: {
      tradition: 'vedas',
      bookId: 'rig_veda',
      book: 'Rig Veda — Selected Hymns',
      chapter: 1,
      verses: [
        { num: 1, text: 'I laud Agni, the chosen Priest, God, minister of sacrifice, the hotar, lavishest of wealth.' },
      ],
    },
    upanishads: {
      tradition: 'upanishads',
      bookId: 'isha',
      book: 'Isha Upanishad',
      chapter: 1,
      verses: [
        { num: 1, text: 'All this, whatever moves (living or lifeless) in the moving (world), is enveloped by the Lord.' },
        { num: 2, text: 'Find enjoyment in renunciation; do not covet what belongs to others.' },
      ],
    },
    tao: {
      tradition: 'tao',
      bookId: 'tao_te_ching',
      book: 'Tao Te Ching — Selected Chapters',
      chapter: 1,
      verses: [
        { num: 1, text: 'The Tao that can be trodden is not the enduring and unchanging Tao. The name that can be named is not the enduring and unchanging name.' },
      ],
    },
    confucian: {
      tradition: 'confucian',
      bookId: 'analects',
      book: 'The Analects (Lun Yu) — Selected Books',
      chapter: 1,
      verses: [
        { num: 1, text: 'The Master said, Is it not pleasant to learn with a constant perseverance and application?' },
        { num: 2, text: 'Is it not delightful to have friends coming from distant quarters?' },
      ],
    },
    sikh: {
      tradition: 'sikh',
      bookId: 'japji',
      book: 'Japji Sahib — Selections',
      chapter: 1,
      verses: [
        { num: 1, text: 'There is but One God, the Eternal, the Creator; Self-existent, without fear, without enmity.' },
      ],
    },
    jain: {
      tradition: 'jain',
      bookId: 'tattvartha',
      book: 'The Tattvartha Sutra',
      chapter: 1,
      verses: [
        { num: 1, text: 'Right faith, right knowledge, and right conduct together constitute the path to liberation.' },
      ],
    },
  }
  return fallbacks[tradition] || fallbacks.bible
}
