import type { WordRelationIndex } from '../types/phonetics'
import { fusionnerRelations, loadAddedWords } from './addedLexicon'

let cachedSynonyms: Promise<WordRelationIndex> | null = null
let cachedAntonyms: Promise<WordRelationIndex> | null = null

/**
 * Charge src/data/word-synonyms.json (JeuxDeMots croisé avec notre lexique) en
 * lazy import, fusionné avec les synonymes saisis à la main par l'enseignante
 * pour ses propres mots (voir addedLexicon).
 */
export function loadWordSynonyms(): Promise<WordRelationIndex> {
  if (!cachedSynonyms) {
    cachedSynonyms = Promise.all([
      import('../data/word-synonyms.json').then((m) => m.default as WordRelationIndex),
      loadAddedWords(),
    ]).then(([statique, ajouts]) => fusionnerRelations(statique, ajouts, 'synonyme'))
  }
  return cachedSynonyms
}

/** Idem pour les contraires (src/data/word-antonyms.json). */
export function loadWordAntonyms(): Promise<WordRelationIndex> {
  if (!cachedAntonyms) {
    cachedAntonyms = Promise.all([
      import('../data/word-antonyms.json').then((m) => m.default as WordRelationIndex),
      loadAddedWords(),
    ]).then(([statique, ajouts]) => fusionnerRelations(statique, ajouts, 'antonyme'))
  }
  return cachedAntonyms
}
