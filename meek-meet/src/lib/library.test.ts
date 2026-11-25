import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  SACRED_LIBRARY,
  getLibraryEntry,
  getTraditionMeta,
  getBook,
  chapterNumbers,
  isSourceLine,
  stripSourceBrackets,
  getAllLibraryPaths,
} from "./library";

const DATA_DIR = path.join(process.cwd(), "src", "data", "scriptures");

describe("Sacred Library data integrity", () => {
  it("has ten curated collections", () => {
    expect(SACRED_LIBRARY).toHaveLength(10);
  });

  it("every collection id is unique", () => {
    const ids = SACRED_LIBRARY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every collection has a data directory with a meta.json", () => {
    for (const entry of SACRED_LIBRARY) {
      expect(
        existsSync(path.join(DATA_DIR, entry.id, "meta.json")),
        `missing meta.json for ${entry.id}`
      ).toBe(true);
    }
  });

  it("every editorial collection has editorial substance", () => {
    for (const entry of SACRED_LIBRARY) {
      expect(entry.name.length).toBeGreaterThan(3);
      expect(entry.era.length).toBeGreaterThan(3);
      expect(entry.origin.length).toBeGreaterThan(3);
      expect(entry.description.length).toBeGreaterThan(80);
      expect(entry.whyItMatters.length).toBeGreaterThan(60);
      expect(entry.books.length).toBeGreaterThan(0);
    }
  });

  it("every editorial book exists on disk with readable chapters", () => {
    for (const entry of SACRED_LIBRARY) {
      for (const book of entry.books) {
        const file = path.join(DATA_DIR, entry.id, `${book.id}.json`);
        expect(existsSync(file), `missing ${entry.id}/${book.id}.json`).toBe(true);

        const text = getBook(entry.id, book.id);
        expect(text.book.length).toBeGreaterThan(3);
        const chapters = chapterNumbers(text);
        expect(chapters.length).toBeGreaterThan(0);
        for (const ch of chapters) {
          const paragraphs = text.chapters[ch];
          expect(paragraphs.length, `${entry.id}/${book.id} ch ${ch}`).toBeGreaterThan(0);
          for (const p of paragraphs) {
            expect(typeof p).toBe("string");
            expect(p.trim().length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it("meta.json chapter counts match the actual book files", () => {
    for (const entry of SACRED_LIBRARY) {
      const meta = getTraditionMeta(entry.id);
      for (const metaBook of meta.books) {
        const text = getBook(entry.id, metaBook.id);
        expect(
          chapterNumbers(text).length,
          `${entry.id}/${metaBook.id} chapter count`
        ).toBe(metaBook.chapters);
      }
    }
  });

  it("editorial books and meta.json books agree exactly", () => {
    for (const entry of SACRED_LIBRARY) {
      const meta = getTraditionMeta(entry.id);
      const editorialIds = entry.books.map((b) => b.id).sort();
      const metaIds = meta.books.map((b) => b.id).sort();
      expect(metaIds, entry.id).toEqual(editorialIds);
    }
  });

  it("no orphaned book files exist outside the editorial list", () => {
    for (const entry of SACRED_LIBRARY) {
      const files = readdirSync(path.join(DATA_DIR, entry.id))
        .filter((f) => f.endsWith(".json") && f !== "meta.json")
        .map((f) => f.replace(/\.json$/, ""))
        .sort();
      const editorialIds = entry.books.map((b) => b.id).sort();
      expect(files, entry.id).toEqual(editorialIds);
    }
  });

  it("no data directories exist outside the editorial list", () => {
    const dirs = readdirSync(DATA_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    const editorialIds = SACRED_LIBRARY.map((e) => e.id).sort();
    expect(dirs).toEqual(editorialIds);
  });

  it("the JSON on disk is valid UTF-8 text without placeholder markers", () => {
    for (const entry of SACRED_LIBRARY) {
      for (const book of entry.books) {
        const raw = readFileSync(
          path.join(DATA_DIR, entry.id, `${book.id}.json`),
          "utf8"
        );
        expect(raw).not.toMatch(/TODO|PLACEHOLDER|LOREM/i);
      }
    }
  });
});

describe("library helpers", () => {
  it("getLibraryEntry finds entries and misses cleanly", () => {
    expect(getLibraryEntry("dead_sea_scrolls")?.name).toBe("The Dead Sea Scrolls");
    expect(getLibraryEntry("not-a-tradition")).toBeUndefined();
  });

  it("chapterNumbers sorts numerically, not lexicographically", () => {
    const book = { book: "t", chapters: { "10": ["a"], "2": ["b"], "1": ["c"] } };
    expect(chapterNumbers(book)).toEqual(["1", "2", "10"]);
  });

  it("source lines are detected and unwrapped", () => {
    expect(isSourceLine("[1QS 1:1-2 — The Master's instruction]")).toBe(true);
    expect(isSourceLine("For the Master, to teach the saints…")).toBe(false);
    expect(stripSourceBrackets("[1QS 1:1-2]")).toBe("1QS 1:1-2");
  });

  it("getAllLibraryPaths covers every book exactly once", () => {
    const paths = getAllLibraryPaths();
    const totalBooks = SACRED_LIBRARY.reduce((n, e) => n + e.books.length, 0);
    expect(paths).toHaveLength(totalBooks);
    const keys = paths.map((p) => `${p.tradition}/${p.book}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every real book body contains at least one source-referenced passage", () => {
    // The curation contract: excerpted passages carry their source in
    // brackets, never bare paraphrase.
    for (const entry of SACRED_LIBRARY) {
      for (const book of entry.books) {
        const text = getBook(entry.id, book.id);
        const all = Object.values(text.chapters).flat();
        expect(
          all.some((p) => isSourceLine(p)),
          `${entry.id}/${book.id} has no source line`
        ).toBe(true);
      }
    }
  });
});
