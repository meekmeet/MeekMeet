import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { SACRED_LIBRARY } from './sacred-library'
import { SACRED_LIBRARY_TRADITIONS, ALL_READING_TRADITIONS } from '@/lib/scriptures'
import { TRADITION_LABELS, TRADITION_COLORS } from './tradition-labels'

// Tests run with the mobile app as the working directory.
const SCRIPTURES_DIR = join(process.cwd(), 'public/data/scriptures')

interface MetaFile {
  tradition: string
  name: string
  translation?: string
  note?: string
  books: { id: string; name: string; chapters: number }[]
}

interface BookFile {
  book: string
  chapters: Record<string, string[]>
}

function loadMeta(tradition: string): MetaFile {
  return JSON.parse(readFileSync(join(SCRIPTURES_DIR, tradition, 'meta.json'), 'utf-8'))
}

function loadBook(tradition: string, bookId: string): BookFile {
  return JSON.parse(readFileSync(join(SCRIPTURES_DIR, tradition, `${bookId}.json`), 'utf-8'))
}

describe('sacred library data files', () => {
  it('has a data directory for every registered library tradition', () => {
    for (const tradition of SACRED_LIBRARY_TRADITIONS) {
      expect(existsSync(join(SCRIPTURES_DIR, tradition, 'meta.json'))).toBe(true)
    }
  })

  it('library metadata (sacred-library.ts) matches the filesystem one-to-one', () => {
    const libraryIds = SACRED_LIBRARY.map((e) => e.id).sort()
    const traditionIds = [...SACRED_LIBRARY_TRADITIONS].sort()
    expect(libraryIds).toEqual(traditionIds)
  })

  it('every library entry has complete editorial metadata', () => {
    for (const entry of SACRED_LIBRARY) {
      expect(entry.name.length).toBeGreaterThan(3)
      expect(entry.era.length).toBeGreaterThan(3)
      expect(entry.origin.length).toBeGreaterThan(3)
      expect(entry.description.length).toBeGreaterThan(50)
      expect(entry.whyItMatters.length).toBeGreaterThan(20)
      expect(entry.books.length).toBeGreaterThan(0)
    }
  })

  it('entry books match the meta.json book lists exactly', () => {
    for (const entry of SACRED_LIBRARY) {
      const meta = loadMeta(entry.id)
      expect(meta.tradition).toBe(entry.id)
      expect(meta.books.map((b) => b.id).sort()).toEqual(entry.books.map((b) => b.id).sort())
    }
  })
})

describe.each(SACRED_LIBRARY_TRADITIONS)('tradition: %s', (tradition) => {
  const meta = loadMeta(tradition)

  it('meta declares at least one book', () => {
    expect(meta.books.length).toBeGreaterThan(0)
  })

  for (const book of meta.books) {
    describe(`book: ${book.name}`, () => {
      it('exists as a JSON file with matching book name', () => {
        const data = loadBook(tradition, book.id)
        expect(data.book).toBe(book.name)
      })

      it(`declares ${book.chapters} chapter(s) and all exist with content`, () => {
        const data = loadBook(tradition, book.id)
        const chapterKeys = Object.keys(data.chapters)
        expect(chapterKeys).toHaveLength(book.chapters)
        for (let i = 1; i <= book.chapters; i++) {
          const verses = data.chapters[String(i)]
          expect(Array.isArray(verses)).toBe(true)
          expect(verses.length).toBeGreaterThan(0)
          for (const verse of verses) {
            expect(typeof verse).toBe('string')
            expect(verse.trim().length).toBeGreaterThan(0)
          }
        }
      })

      it('cites its source at the start of every chapter', () => {
        const data = loadBook(tradition, book.id)
        for (const verses of Object.values(data.chapters)) {
          expect(verses[0]).toMatch(/^\[.+—.+\]$/)
        }
      })

      it('has no placeholder or TODO content', () => {
        const data = loadBook(tradition, book.id)
        for (const verses of Object.values(data.chapters)) {
          for (const verse of verses) {
            expect(verse).not.toMatch(/TODO|FIXME|lorem ipsum|placeholder/i)
          }
        }
      })
    })
  }
})

describe('tradition registration', () => {
  it('every reading tradition has a display label and color', () => {
    for (const tradition of ALL_READING_TRADITIONS) {
      expect(TRADITION_LABELS[tradition]).toBeTruthy()
      expect(TRADITION_COLORS[tradition]).toBeTruthy()
    }
  })

  it('every reading tradition directory contains a parseable meta.json', () => {
    const dirs = readdirSync(SCRIPTURES_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
    for (const dir of dirs) {
      const meta = JSON.parse(readFileSync(join(SCRIPTURES_DIR, dir, 'meta.json'), 'utf-8'))
      expect(Array.isArray(meta.books)).toBe(true)
      expect(meta.books.length).toBeGreaterThan(0)
    }
  })

  it('the reading rotation includes the core and library traditions', () => {
    expect(ALL_READING_TRADITIONS).toContain('bible')
    expect(ALL_READING_TRADITIONS).toContain('quran')
    expect(ALL_READING_TRADITIONS).toHaveLength(
      ['bible', 'quran', 'tanakh', 'buddhist', 'mormon'].length + SACRED_LIBRARY_TRADITIONS.length
    )
  })
})
