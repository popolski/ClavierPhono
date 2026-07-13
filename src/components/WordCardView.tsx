import type { WordCard, WordCategory } from '../types/phonetics'

interface WordCardViewProps {
  card: WordCard
}

// Couleurs alignées sur la vraie page de résultats du Clavier Métalo (tuto officiel, p.6).
const categoryStyles: Record<WordCategory, string> = {
  nom: 'bg-green-50 text-green-900 border-green-200',
  adjectif: 'bg-yellow-50 text-yellow-900 border-yellow-200',
  verbe: 'bg-red-50 text-red-900 border-red-200',
  invariable: 'bg-blue-50 text-blue-900 border-blue-200',
}

export function WordCardView({ card }: WordCardViewProps) {
  const style = categoryStyles[card.category]

  if (card.category === 'verbe') {
    const infinitif = card.forms.find((f) => f.formRole === 'infinitif')
    const participe = card.forms.find((f) => f.formRole === 'participe_passé')
    const ilElleOn = card.forms.find((f) => f.formRole === 'il_elle_on')
    const ilsElles = card.forms.find((f) => f.formRole === 'ils_elles')
    return (
      <div className={`rounded-lg border p-3 shadow-sm ${style}`}>
        <div className="flex flex-wrap justify-between gap-x-4 text-xl font-medium">
          <span>{infinitif?.word}</span>
          {participe && <span>{participe.word}</span>}
        </div>
        {(ilElleOn ?? ilsElles) && (
          <div className="mt-2 flex flex-wrap justify-between gap-x-4 border-t border-current/20 pt-2 text-sm">
            {ilElleOn && (
              <span>
                il / elle / on <strong>{ilElleOn.word}</strong>
              </span>
            )}
            {ilsElles && (
              <span>
                ils / elles <strong>{ilsElles.word}</strong>
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`rounded-lg border px-4 py-2 shadow-sm ${style}`}>
      {card.forms.map((form) => (
        <div key={form.word} className="text-2xl font-medium">
          {form.word}
        </div>
      ))}
    </div>
  )
}
