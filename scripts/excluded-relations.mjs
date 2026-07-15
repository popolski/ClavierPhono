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
]

export const EXCLUDED_RELATION_PAIRS = new Set(RAW_PAIRS.map(([a, b]) => [a, b].sort().join('::')))

export function isExcludedRelation(wordA, wordB) {
  return EXCLUDED_RELATION_PAIRS.has([wordA, wordB].sort().join('::'))
}
