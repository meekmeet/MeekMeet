import { describe, it, expect, vi, afterEach } from 'vitest'
import { isPlaceholderVerse, dateHash, getFallbackReading, loadPassage, isSacredLibraryTradition } from './scriptures'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('scripture utilities', () => {
  it('detects placeholder verses', () => {
    expect(isPlaceholderVerse('[Psalms 1]')).toBe(true)
    expect(isPlaceholderVerse('[Genesis 1]')).toBe(true)
    expect(isPlaceholderVerse('In the beginning God created')).toBe(false)
    expect(isPlaceholderVerse('  [Exodus 1]  ')).toBe(true)
  })

  it('produces deterministic date hashes', () => {
    const h1 = dateHash('2025-01-01')
    const h2 = dateHash('2025-01-01')
    const h3 = dateHash('2025-01-02')
    expect(h1).toBe(h2)
    expect(h1).not.toBe(h3)
  })

  it('returns fallback readings for known traditions', () => {
    const bible = getFallbackReading('bible')
    expect(bible.book).toBe('Genesis')
    expect(bible.verses.length).toBeGreaterThan(0)

    const quran = getFallbackReading('quran')
    expect(quran.book).toBe('Al-Fatihah')

    const tanakh = getFallbackReading('tanakh')
    expect(tanakh.book).toBe('Genesis')

    const buddhist = getFallbackReading('buddhist')
    expect(buddhist.book).toBe('The Dhammapada')

    const mormon = getFallbackReading('mormon')
    expect(mormon.book).toBe('1 Nephi')
    expect(mormon.tradition).toBe('mormon')
  })

  it('returns fallback readings for every sacred library tradition', () => {
    const expectedBooks: Record<string, string> = {
      dead_sea_scrolls: 'The Community Rule (1QS)',
      nag_hammadi: 'The Gospel of Thomas',
      apocrypha: 'The Wisdom of Solomon',
      pseudepigrapha: 'The Book of Enoch (1 Enoch)',
      vedas: 'Rig Veda — Selected Hymns',
      upanishads: 'Isha Upanishad',
      tao: 'Tao Te Ching — Selected Chapters',
      confucian: 'The Analects (Lun Yu) — Selected Books',
      sikh: 'Japji Sahib — Selections',
      jain: 'The Tattvartha Sutra',
    }
    for (const [tradition, book] of Object.entries(expectedBooks)) {
      const fallback = getFallbackReading(tradition)
      expect(fallback.tradition).toBe(tradition)
      expect(fallback.book).toBe(book)
      expect(fallback.verses.length).toBeGreaterThan(0)
      expect(fallback.verses.every((v) => v.text.trim().length > 0)).toBe(true)
    }
  })

  it('defaults to bible fallback for unknown traditions', () => {
    const fallback = getFallbackReading('unknown')
    expect(fallback.tradition).toBe('bible')
  })

  it('classifies library traditions', () => {
    expect(isSacredLibraryTradition('dead_sea_scrolls')).toBe(true)
    expect(isSacredLibraryTradition('jain')).toBe(true)
    expect(isSacredLibraryTradition('bible')).toBe(false)
    expect(isSacredLibraryTradition('nope')).toBe(false)
  })
})

describe('loadPassage — generic sacred library loader', () => {
  it('loads a library passage from the standard book format', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        book: 'The Gospel of Thomas',
        chapters: {
          '1': [
            '[Sayings 1-5]',
            'Whoever finds the interpretation of these sayings will not experience death.',
            'Let him who seeks continue seeking until he finds.',
          ],
        },
      }),
    }))

    const passage = await loadPassage('nag_hammadi', 'gospel_of_thomas', 1)
    expect(passage).not.toBeNull()
    expect(passage!.book).toBe('The Gospel of Thomas')
    expect(passage!.tradition).toBe('nag_hammadi')
    expect(passage!.verses).toEqual([
      { num: 1, text: '[Sayings 1-5]' },
      { num: 2, text: 'Whoever finds the interpretation of these sayings will not experience death.' },
      { num: 3, text: 'Let him who seeks continue seeking until he finds.' },
    ])
    expect(vi.mocked(fetch)).toHaveBeenCalledWith('/data/scriptures/nag_hammadi/gospel_of_thomas.json')
  })

  it('returns null for a missing chapter', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ book: 'X', chapters: { '1': ['a'] } }),
    }))
    expect(await loadPassage('tao', 'tao_te_ching', 99)).toBeNull()
  })

  it('returns null when the book file is missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))
    expect(await loadPassage('jain', 'missing_book', 1)).toBeNull()
  })

  it('returns null when the fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(await loadPassage('upanishads', 'katha', 1)).toBeNull()
  })
})
