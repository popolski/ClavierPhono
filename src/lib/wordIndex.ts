import type { WordEntry } from '../types/phonetics'

let cached: Promise<WordEntry[]> | null = null

/**
 * Charge le lexique complet (~32 000 mots, ~8 Mo) en lazy import — pas
 * inclus dans le bundle principal, pour ne pas alourdir le chargement
 * initial sur des PC scolaires potentiellement peu puissants.
 */
export function loadWordIndex(): Promise<WordEntry[]> {
  if (!cached) {
    cached = import('../data/words-clavier2.json').then((m) => m.default as WordEntry[])
  }
  return cached
}
