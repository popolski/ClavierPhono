import { loadAddedWords } from './addedLexicon'

export interface VerbConjugation {
  infinitif: string
  auxiliaire: 'avoir' | 'être'
  present: Record<string, string>
  futur: Record<string, string>
  imparfait: Record<string, string>
  passeCompose: Record<string, string>
}

export type ConjugationIndex = Record<string, VerbConjugation>

let cached: Promise<ConjugationIndex> | null = null

/**
 * Charge le tableau de conjugaisons (lazy import, ~2,5 Mo), fusionné avec les
 * verbes ajoutés par l'enseignante : leur conjugaison est calculée côté
 * serveur à l'ajout (api/conjugaison.php), et vaut null pour un verbe
 * irrégulier — non générable sans risquer d'inventer une orthographe.
 * L'index est clé par infinitif, comme les tableaux générés au build.
 */
export function loadConjugations(): Promise<ConjugationIndex> {
  if (!cached) {
    cached = Promise.all([
      import('../data/conjugations.json').then((m) => m.default as ConjugationIndex),
      loadAddedWords(),
    ]).then(([statiques, ajoutes]) => {
      const out: ConjugationIndex = { ...statiques }
      for (const w of ajoutes) {
        if (w.categorie === 'verbe' && w.conjugaison) {
          out[w.mot] = w.conjugaison
        }
      }
      return out
    })
  }
  return cached
}
