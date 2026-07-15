// Liste noire de PAIRES synonyme/antonyme (contrairement à
// excluded-words.mjs, qui retire un mot entier du lexique, ici les deux mots
// restent dans le lexique — seule LA RELATION entre eux est fausse).
//
// JeuxDeMots ne distingue pas les sens d'un mot (pas de POS/désambiguïsation) :
// pour un mot rare en synonymes réels (ex. "araignée"), le réseau mélange le
// sens principal avec d'autres sens du même mot (ex. "araignée de mer", un
// crabe) ou des associations lâches, avec parfois un poids de confiance
// aussi élevé que les relations correctes — un simple seuil de poids ne
// suffit donc pas à les filtrer. Découvert au cas par cas en testant l'appli,
// pas construit préventivement.
//
// Chaque entrée est une paire non ordonnée "mot1::mot2" (les deux sens sont
// vérifiés, pas la peine de dupliquer dans les deux ordres).
const RAW_PAIRS = [
  // araignée : "synonymes" en fait liés au crabe "araignée de mer", pas à
  // l'animal recherché par un enfant du primaire.
  ['araignée', 'galerie'],
  ['araignée', 'coussinet'],
  ['araignée', 'filet'],
  ['araignée', 'carrelet'],
  // dent : de vrais synonymes existent (croc, quenotte, chicot — confirmé
  // par le Larousse), mais noyés parmi des sens figurés au poids tout aussi
  // élevé : "avoir une dent contre" (rancune, ressentiment, haine, rancœur,
  // animosité) et "dent de scie/montagne" (aiguille, sommet, crête, pic,
  // éperon, saillie), plus quelques termes techniques d'engrenage (alluchon,
  // came) ou géologiques (chaille) sans rapport avec une dent de la bouche.
  ['dent', 'aiguille'],
  ['dent', 'sommet'],
  ['dent', 'rancune'],
  ['dent', 'ressentiment'],
  ['dent', 'haine'],
  ['dent', 'crête'],
  ['dent', 'pic'],
  ['dent', 'éperon'],
  ['dent', 'alluchon'],
  ['dent', 'came'],
  ['dent', 'chaille'],
  ['dent', 'indentation'],
  ['dent', 'animosité'],
  ['dent', 'saillie'],
  ['dent', 'tabouret'],
  ['dent', 'rancoeur'],
]

export const EXCLUDED_RELATION_PAIRS = new Set(RAW_PAIRS.map(([a, b]) => [a, b].sort().join('::')))

export function isExcludedRelation(wordA, wordB) {
  return EXCLUDED_RELATION_PAIRS.has([wordA, wordB].sort().join('::'))
}

// Mots pour lesquels ON NE MONTRE AUCUN synonyme/antonyme, quel que soit le
// poids : contrairement à "araignée" (quelques paires fausses au milieu de
// résultats sinon exploitables), certains mots ont la quasi-totalité de
// leurs "synonymes" JeuxDeMots qui sont des vulgarismes (ex. "sexe" — même
// ses meilleurs résultats par poids sont inutilisables pour une classe
// primaire). Exclure les paires une par une n'aurait pas de sens ici : on
// supprime la source entière.
export const EXCLUDED_RELATION_SOURCES = new Set([
  'sexe', // quasi tous les "synonymes" sont des vulgarismes (chatte, queue, bite...)
])

export function hasSuppressedRelations(word) {
  return EXCLUDED_RELATION_SOURCES.has(word)
}
