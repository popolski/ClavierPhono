import type { Phoneme, PhonemeId } from '../types/phonetics'

interface PhonemeTileProps {
  phoneme: Phoneme
  disabled: boolean
  onSelect: (id: PhonemeId) => void
  onShowInfo: (id: PhonemeId) => void
}

// Comme sur le vrai Clavier Métalo : les différentes graphies d'un son sont
// affichées à la même taille (pas une grosse + des petites en dessous). En
// LISTE VERTICALE (une par ligne), pas en grille 2 colonnes : sur une touche
// de largeur fixe, une grille chevauchait dès qu'une graphie était un peu
// longue (ex. "aon"/"em", "ain"/"aim", "euill"/"aill" se collaient l'un à
// l'autre) — la liste verticale n'a jamais ce problème, chaque graphie a
// toute la largeur pour elle. On en montre au plus 4 : au-delà (ex. "ill",
// 17 graphies possibles), ce sont de toute façon des variantes rares peu
// utiles à afficher sur la touche elle-même — les autres restent dans la
// fiche du son.
const MAX_DISPLAYED_GRAPHEMES = 4

export function PhonemeTile({ phoneme, disabled, onSelect, onShowInfo }: PhonemeTileProps) {
  const primary = phoneme.graphemes[0]
  const displayedGraphemes = phoneme.graphemes.slice(0, MAX_DISPLAYED_GRAPHEMES).map((g) => g.grapheme)

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(phoneme.id)}
        className={`flex w-full items-center justify-between gap-1 rounded-xl border-2 p-2 pt-3 text-left transition ${
          disabled
            ? 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300'
            : 'border-brand-200 bg-white text-gray-900 hover:border-brand-500 hover:bg-brand-50 active:scale-95'
        }`}
      >
        <div className="flex flex-col gap-0.5">
          {displayedGraphemes.map((g) => (
            <span key={g} className="text-base leading-tight font-bold whitespace-nowrap">
              {g}
            </span>
          ))}
        </div>
        {primary?.exampleImage && (
          <img
            src={primary.exampleImage}
            alt={primary.exampleWord}
            className={`h-9 w-9 shrink-0 object-contain ${disabled ? 'opacity-30 grayscale' : ''}`}
          />
        )}
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onShowInfo(phoneme.id)
        }}
        aria-label={`Détails du son ${phoneme.displaySymbol}`}
        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white text-[11px] leading-none text-gray-500 shadow-sm hover:bg-gray-100"
      >
        i
      </button>
    </div>
  )
}
