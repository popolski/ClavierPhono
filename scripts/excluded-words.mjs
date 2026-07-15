// Liste noire manuelle : mots qui passeraient le filtre Manulex (fréquence
// scolaire suffisante) mais qui n'ont pas leur place dans un outil pour une
// classe primaire. Découverte au cas par cas (voir commit qui a introduit ce
// fichier) plutôt que construite préventivement — on ajoute un mot ici
// quand on le voit réellement apparaître (ex. comme "synonyme" d'un mot
// courant), pas par précaution générale.
//
// Appliqué à TOUT le pipeline (mots-clavier2.json, familles, synonymes,
// antonymes) : un mot exclu ici disparaît partout, pas seulement des
// suggestions.
export const EXCLUDED_WORDS = new Set([
  'con', // vulgaire ; repéré comme "synonyme" affiché de idiot/intelligent/chat
  'conne',
])
