import type { WordFamilyIndex } from '../types/phonetics'
import { fusionnerFamilles, loadAddedWords } from './addedLexicon'

let cached: Promise<WordFamilyIndex> | null = null

/**
 * Charge src/data/word-families.json (Démonette croisé avec notre lexique) en
 * lazy import, fusionné avec les "mots de la même famille" saisis à la main
 * par l'enseignant pour ses propres mots (voir addedLexicon).
 */
export function loadWordFamilies(): Promise<WordFamilyIndex> {
  if (!cached) {
    cached = Promise.all([
      import('../data/word-families.json').then((m) => m.default as WordFamilyIndex),
      loadAddedWords(),
    ]).then(([statique, ajouts]) => fusionnerFamilles(statique, ajouts))
  }
  return cached
}
