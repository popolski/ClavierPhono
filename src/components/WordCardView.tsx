import { Link } from 'react-router-dom'
import type { WordCard, WordCategory } from '../types/phonetics'

interface WordCardViewProps {
  card: WordCard
}

// Couleurs choisies par l'enseignante (Feuille de route 2 consignes) : nom=bleu,
// adjectif=violet, verbe=rouge foncé, invariable=rouge clair, adverbe=orange.
const categoryStyles: Record<WordCategory, string> = {
  nom: 'bg-blue-50 text-blue-900 border-blue-200',
  adjectif: 'bg-violet-50 text-violet-900 border-violet-200',
  verbe: 'bg-red-200 text-red-900 border-red-400',
  invariable: 'bg-red-50 text-red-500 border-red-100',
  adverbe: 'bg-orange-50 text-orange-900 border-orange-200',
}

export function WordCardView({ card }: WordCardViewProps) {
  const style = categoryStyles[card.category]

  if (card.category === 'verbe') {
    const infinitif = card.forms.find((f) => f.formRole === 'infinitif')
    const participe = card.forms.find((f) => f.formRole === 'participe_passé')
    const lemme = card.lemmaId.replace(/^verbe:/, '')
    return (
      <Link
        to={`/conjugueur/${lemme}`}
        className={`block rounded-lg border p-3 shadow-sm transition hover:shadow-md ${style}`}
      >
        <div className="flex flex-wrap justify-between gap-x-4 text-xl font-medium">
          <span>{infinitif?.word}</span>
          {participe && <span>{participe.word}</span>}
        </div>
      </Link>
    )
  }

  // Nom/adjectif : pas encore cliquables — la fiche de destination (famille de
  // mots, synonymes, antonymes) n'existe pas encore, voir le plan.
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
