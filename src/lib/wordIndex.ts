import type { WordCategory, WordEntry, WordFormRole } from '../types/phonetics'
import { api } from './api'

let cached: Promise<WordEntry[]> | null = null

// Fréquence attribuée aux mots ajoutés à la main par l'enseignante. Le tri
// des résultats se fait par fréquence décroissante : une valeur haute les
// place en tête des mots trouvés, ce qui est le comportement voulu (si elle
// a pris la peine d'ajouter un mot, c'est qu'il manquait et qu'on le cherche).
const FREQUENCE_MOT_AJOUTE = 100

/** Préfixe des lemmaId issus de l'espace enseignante (voir loadWordIndex). */
export const LEMMA_PREFIXE_AJOUT = 'ajout:'

export function estMotAjoute(lemmaId: string): boolean {
  return lemmaId.startsWith(LEMMA_PREFIXE_AJOUT)
}

// L'enseignante ne saisit qu'une seule forme par mot ; on la déclare dans le
// rôle "de base" de sa catégorie, celui que pickPrimaryForm cherche en
// premier (clavierLogic.BASE_ROLE) — sinon la fiche mot retomberait sur un
// fallback au lieu de reconnaître la forme principale.
const ROLE_DE_BASE: Record<WordCategory, WordFormRole> = {
  nom: 'singulier',
  adjectif: 'masculin',
  verbe: 'infinitif',
  adverbe: 'simple',
  invariable: 'simple',
}

/**
 * Charge le lexique complet (~32 000 mots, ~8 Mo) en lazy import — pas
 * inclus dans le bundle principal, pour ne pas alourdir le chargement
 * initial sur des PC scolaires potentiellement peu puissants.
 *
 * Y fusionne les mots ajoutés à la main par l'enseignante (API, base MySQL) :
 * ils sont ainsi trouvables au clavier immédiatement, sans regénérer le
 * lexique statique ni redéployer. Si l'API échoue (hors ligne, serveur
 * indisponible), on retombe silencieusement sur le seul lexique statique —
 * mieux vaut un clavier amputé de quelques mots ajoutés qu'un clavier mort.
 */
export function loadWordIndex(): Promise<WordEntry[]> {
  if (!cached) {
    cached = Promise.all([
      import('../data/words-clavier2.json').then((m) => m.default as WordEntry[]),
      api.listLexicon().then(
        (r) =>
          r.words.map<WordEntry>((w) => ({
            word: w.mot,
            phonemes: w.phonemes,
            frequency: FREQUENCE_MOT_AJOUTE,
            level: 1,
            category: w.categorie,
            // Préfixe "ajout:" : évite toute collision de lemmaId avec le
            // lexique généré, et permet de reconnaître ces mots plus tard.
            lemmaId: `${LEMMA_PREFIXE_AJOUT}${w.categorie}:${w.mot}`,
            formRole: ROLE_DE_BASE[w.categorie],
            ...(w.genre ? { genre: w.genre } : {}),
          })),
        () => [] as WordEntry[],
      ),
    ]).then(([statiques, ajoutes]) => [...statiques, ...ajoutes])
  }
  return cached
}
