import { api } from './api'
import type { LexiconWord, RelationType } from './api'
import type { WordFamilyIndex, WordRelationIndex } from '../types/phonetics'

/** Préfixe des lemmaId issus de l'espace enseignante. */
export const LEMMA_PREFIXE_AJOUT = 'ajout:'

export function estMotAjoute(lemmaId: string): boolean {
  return lemmaId.startsWith(LEMMA_PREFIXE_AJOUT)
}

export function lemmaIdAjout(mot: string, categorie: string): string {
  return `${LEMMA_PREFIXE_AJOUT}${categorie}:${mot}`
}

let cached: Promise<LexiconWord[]> | null = null

/**
 * Mots ajoutés par l'enseignante (base MySQL). Mis en cache : lexique,
 * familles, synonymes, contraires et conjugaisons en ont tous besoin, et une
 * seule requête doit suffire.
 *
 * En cas d'échec (serveur injoignable), renvoie une liste vide plutôt que de
 * rejeter : le site doit rester utilisable avec le seul lexique statique.
 */
export function loadAddedWords(): Promise<LexiconWord[]> {
  if (!cached) {
    cached = api
      .listLexicon()
      .then((r) => r.words)
      .catch(() => [])
  }
  return cached
}

/**
 * Index des relations d'un type donné, dans les DEUX sens : si l'enseignante
 * déclare "wapiti" synonyme de "cerf", la fiche de "cerf" doit aussi proposer
 * "wapiti" — la synonymie est symétrique, et elle ne va pas saisir la
 * relation deux fois.
 */
function indexRelations(words: LexiconWord[], type: RelationType): WordRelationIndex {
  const index: WordRelationIndex = {}
  for (const w of words) {
    const cibles = w.relations?.[type] ?? []
    if (cibles.length === 0) continue
    const lemmaSource = lemmaIdAjout(w.mot, w.categorie)

    index[lemmaSource] = cibles.map((t) => ({ word: t.word, category: t.category, lemmaId: t.lemmaId }))

    for (const t of cibles) {
      ;(index[t.lemmaId] ??= []).push({ word: w.mot, category: w.categorie, lemmaId: lemmaSource })
    }
  }
  return index
}

/** Fusionne un index statique avec celui des ajouts (concatène, n'écrase pas). */
function fusionner<T>(statique: Record<string, T[]>, ajouts: Record<string, T[]>): Record<string, T[]> {
  const out: Record<string, T[]> = { ...statique }
  for (const [lemmaId, membres] of Object.entries(ajouts)) {
    out[lemmaId] = [...(out[lemmaId] ?? []), ...membres]
  }
  return out
}

export function fusionnerRelations(
  statique: WordRelationIndex,
  words: LexiconWord[],
  type: 'synonyme' | 'antonyme',
): WordRelationIndex {
  return fusionner(statique, indexRelations(words, type))
}

export function fusionnerFamilles(statique: WordFamilyIndex, words: LexiconWord[]): WordFamilyIndex {
  const relations = indexRelations(words, 'famille')
  // WordFamilyMember porte en plus inLexicon : un mot ajouté a bien sa propre
  // fiche (il est dans le lexique fusionné), donc toujours cliquable.
  const ajouts: WordFamilyIndex = {}
  for (const [lemmaId, membres] of Object.entries(relations)) {
    ajouts[lemmaId] = membres.map((m) => ({ ...m, inLexicon: true }))
  }
  return fusionner(statique, ajouts)
}
