import type { WordRelationIndex } from '../types/phonetics'

let cachedSynonyms: Promise<WordRelationIndex> | null = null
let cachedAntonyms: Promise<WordRelationIndex> | null = null

/** Charge src/data/word-synonyms.json (JeuxDeMots croisé avec notre lexique) en lazy import. */
export function loadWordSynonyms(): Promise<WordRelationIndex> {
  if (!cachedSynonyms) {
    cachedSynonyms = import('../data/word-synonyms.json').then((m) => m.default as WordRelationIndex)
  }
  return cachedSynonyms
}

/** Charge src/data/word-antonyms.json (JeuxDeMots croisé avec notre lexique) en lazy import. */
export function loadWordAntonyms(): Promise<WordRelationIndex> {
  if (!cachedAntonyms) {
    cachedAntonyms = import('../data/word-antonyms.json').then((m) => m.default as WordRelationIndex)
  }
  return cachedAntonyms
}
