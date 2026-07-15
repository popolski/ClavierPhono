import type { WordFamilyIndex } from '../types/phonetics'

let cached: Promise<WordFamilyIndex> | null = null

/** Charge src/data/word-families.json (Démonette croisé avec notre lexique) en lazy import. */
export function loadWordFamilies(): Promise<WordFamilyIndex> {
  if (!cached) {
    cached = import('../data/word-families.json').then((m) => m.default as WordFamilyIndex)
  }
  return cached
}
