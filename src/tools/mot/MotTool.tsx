import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ToolLayout } from '../../components/ToolLayout'
import { loadWordIndex } from '../../lib/wordIndex'
import { loadWordFamilies } from '../../lib/wordFamilies'
import type { WordCategory, WordEntry, WordFamilyMember, WordFormRole } from '../../types/phonetics'

const CATEGORY_LABEL: Record<WordCategory, string> = {
  nom: 'Nom',
  adjectif: 'Adjectif',
  verbe: 'Verbe',
  invariable: 'Mot invariable',
  adverbe: 'Adverbe',
}

const categoryStyles: Record<WordCategory, string> = {
  nom: 'bg-blue-50 text-blue-900 border-blue-200',
  adjectif: 'bg-violet-50 text-violet-900 border-violet-200',
  verbe: 'bg-red-200 text-red-900 border-red-400',
  invariable: 'bg-red-50 text-red-500 border-red-100',
  adverbe: 'bg-orange-50 text-orange-900 border-orange-200',
}

const FORM_ROLE_LABEL: Partial<Record<WordFormRole, string>> = {
  singulier: 'Singulier',
  pluriel: 'Pluriel',
  masculin: 'Masculin',
  féminin: 'Féminin',
  participe_passé: 'Participe passé',
}

// il_elle_on/ils_elles existent dans les données mais sont déjà couverts par
// le conjugueur (les 9 personnes) — pas la peine de les redupliquer ici.
const ROLES_HIDDEN_FROM_FICHE: WordFormRole[] = ['il_elle_on', 'ils_elles']

const BASE_ROLE: Record<WordCategory, WordFormRole> = {
  nom: 'singulier',
  adjectif: 'masculin',
  verbe: 'infinitif',
  adverbe: 'simple',
  invariable: 'simple',
}

export function MotTool() {
  const { lemmaId } = useParams<{ lemmaId: string }>()
  const [forms, setForms] = useState<WordEntry[] | null>(null)
  const [family, setFamily] = useState<WordFamilyMember[] | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([loadWordIndex(), loadWordFamilies()]).then(([index, families]) => {
      if (cancelled) return
      setForms(index.filter((e) => e.lemmaId === lemmaId))
      setFamily(families[lemmaId ?? ''] ?? [])
    })
    return () => {
      cancelled = true
    }
  }, [lemmaId])

  if (!forms || !family) {
    return (
      <ToolLayout title="Fiche mot" description="Chargement…">
        <p className="py-10 text-center text-gray-400">Chargement…</p>
      </ToolLayout>
    )
  }

  const primary = forms.find((f) => f.formRole === BASE_ROLE[f.category])
  if (!primary) {
    return (
      <ToolLayout title="Fiche mot" description="Mot introuvable">
        <p className="py-10 text-center text-gray-400">Aucune fiche pour « {lemmaId} ».</p>
      </ToolLayout>
    )
  }

  const otherForms = forms.filter((f) => f !== primary && !ROLES_HIDDEN_FROM_FICHE.includes(f.formRole))
  const style = categoryStyles[primary.category]

  return (
    <ToolLayout title={primary.word} description={CATEGORY_LABEL[primary.category]}>
      {otherForms.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">Autres formes</h2>
          <div className="flex flex-wrap gap-3">
            {otherForms.map((f) => (
              <div key={f.word} className={`rounded-lg border px-4 py-2 ${style}`}>
                <div className="text-xs opacity-70">{FORM_ROLE_LABEL[f.formRole] ?? f.formRole}</div>
                <div className="text-xl font-medium">{f.word}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {primary.category === 'verbe' && (
        <div className="mb-8">
          <Link
            to={`/conjugueur/${encodeURIComponent(primary.word)}`}
            className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
          >
            Voir la conjugaison
          </Link>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">
          Mots de la même famille
        </h2>
        {family.length === 0 ? (
          <p className="text-gray-400">Aucun mot de la même famille trouvé dans notre lexique.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {family.map((member) => (
              <Link
                key={member.lemmaId}
                to={`/mot/${encodeURIComponent(member.lemmaId)}`}
                className={`rounded-lg border px-4 py-2 shadow-sm transition hover:shadow-md ${categoryStyles[member.category]}`}
              >
                <div className="text-xs opacity-70">{CATEGORY_LABEL[member.category]}</div>
                <div className="text-xl font-medium">{member.word}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
