// Génère une conjugaison complète (9 personnes, 4 temps) pour un verbe ajouté
// par l'enseignant, via conjugation-fr (base Verbiste, ~7000 verbes) — bien
// plus large que le générateur PHP maison (server/api/conjugaison.php),
// limité aux -er réguliers "sûrs" (pas d'irrégulier, pas de 2e/3e groupe).
//
// Contrairement au lexique statique (généré une fois, jamais relu), ce
// tableau est montré à l'enseignante AVANT l'ajout (voir Admin.tsx) : c'est
// elle qui valide, donc on peut se permettre une base plus large et moins
// sûre à 100 % que le principe habituel du projet ("jamais deviner").
//
// Import dynamique dans Admin.tsx uniquement (jamais chargé pour un élève) :
// la base de données du paquet pèse plusieurs centaines de Ko.
import { conjugate } from 'conjugation-fr'
import type { VerbConjugation } from './conjugations'

const PRONOM_PAR_INDEX = ['je', 'tu', 'il', 'nous', 'vous', 'ils'] as const

function sixVersRecord(rows: { pronounIndex: number; verb: string }[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const r of rows) {
    const pronom = PRONOM_PAR_INDEX[r.pronounIndex]
    if (pronom) out[pronom] = r.verb
  }
  return out
}

// je/tu/il/on/nous/vous/ils par défaut au masculin, elle/elles au féminin —
// même convention que GENRE_PAR_PERSONNE (scripts/build-conjugation-index.mjs)
// et ACCORD_PAR_PERSONNE (server/api/conjugaison.php) : le genre n'est
// déterminable que pour "elle"/"elles", tout le reste reste masculin par
// défaut (seul le passé composé avec "être" y est sensible).
function neufPersonnes(masc: Record<string, string>, fem: Record<string, string>): Record<string, string> {
  return {
    je: masc.je,
    tu: masc.tu,
    il: masc.il,
    elle: fem.il,
    on: masc.il,
    nous: masc.nous,
    vous: masc.vous,
    ils: masc.ils,
    elles: fem.ils,
  }
}

function auxiliaireDe(jeFormePasseCompose: string | undefined): 'avoir' | 'être' {
  return jeFormePasseCompose?.trim().startsWith('suis') ? 'être' : 'avoir'
}

/** null si le verbe est absent de la base conjugation-fr (verbe rare/inventé, ou forme non gérée). */
export function genererConjugaisonExterne(infinitif: string): VerbConjugation | null {
  try {
    const presentMasc = sixVersRecord(conjugate(infinitif, 'indicative', 'present'))
    const futurMasc = sixVersRecord(conjugate(infinitif, 'indicative', 'future'))
    const imparfaitMasc = sixVersRecord(conjugate(infinitif, 'indicative', 'imperfect'))
    const passeComposeMasc = sixVersRecord(conjugate(infinitif, 'indicative', 'perfect-tense', false))
    const passeComposeFem = sixVersRecord(conjugate(infinitif, 'indicative', 'perfect-tense', true))

    return {
      infinitif,
      auxiliaire: auxiliaireDe(passeComposeMasc.je),
      present: neufPersonnes(presentMasc, presentMasc),
      futur: neufPersonnes(futurMasc, futurMasc),
      imparfait: neufPersonnes(imparfaitMasc, imparfaitMasc),
      passeCompose: neufPersonnes(passeComposeMasc, passeComposeFem),
    }
  } catch {
    return null
  }
}
