// Server-side loaders for the Sacred Library — the public web mirror of the
// mobile app's scripture reader. Data lives in src/data/scriptures/<tradition>/
// (copied from meek-meet-mobile/public/data/scriptures/ — keep the two in sync)
// and is read with fs at build time; every library page is statically
// generated, so nothing here runs per-request in production.
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  SACRED_LIBRARY,
  getLibraryEntry,
  type SacredLibraryEntry,
} from "@/data/sacred-library";

export { SACRED_LIBRARY, getLibraryEntry };
export type { SacredLibraryEntry };

const DATA_DIR = path.join(process.cwd(), "src", "data", "scriptures");

export interface TraditionMeta {
  tradition: string;
  name: string;
  translation: string;
  language: string;
  note: string;
  books: { id: string; name: string; chapters: number }[];
}

export interface SacredBook {
  book: string;
  chapters: Record<string, string[]>;
}

function readJson<T>(...segments: string[]): T {
  return JSON.parse(readFileSync(path.join(DATA_DIR, ...segments), "utf8")) as T;
}

export function getTraditionMeta(traditionId: string): TraditionMeta {
  return readJson<TraditionMeta>(traditionId, "meta.json");
}

export function getBook(traditionId: string, bookId: string): SacredBook {
  return readJson<SacredBook>(traditionId, `${bookId}.json`);
}

/** Chapter numbers in reading order ("1", "2", … as stored in the JSON). */
export function chapterNumbers(book: SacredBook): string[] {
  return Object.keys(book.chapters).sort((a, b) => Number(a) - Number(b));
}

/** Every static path in the library — used by generateStaticParams and the sitemap. */
export function getAllLibraryPaths(): { tradition: string; book: string }[] {
  return SACRED_LIBRARY.flatMap((entry) =>
    entry.books.map((b) => ({ tradition: entry.id, book: b.id }))
  );
}

/**
 * Source-reference lines in the curated texts are wrapped in square brackets
 * (e.g. "[1QS 1:1-2 — The Master's instruction]"). The reader renders those
 * as section headings rather than body text.
 */
export function isSourceLine(paragraph: string): boolean {
  return paragraph.startsWith("[") && paragraph.endsWith("]");
}

export function stripSourceBrackets(paragraph: string): string {
  return paragraph.slice(1, -1);
}
