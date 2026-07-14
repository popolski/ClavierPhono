import { useEffect, useMemo, useState } from 'react'
import { ToolLayout } from '../../components/ToolLayout'
import { PhonemeKeyboard } from '../../components/PhonemeKeyboard'
import { PhonemeInfoModal } from '../../components/PhonemeInfoModal'
import { SequenceBar } from '../../components/SequenceBar'
import { WordResultsPanel } from '../../components/WordResultsPanel'
import { buildPhonemeTrie, getMatches, getViableNextPhonemes, groupIntoCards } from './clavierLogic'
import type { PhonemeTrieNode } from './clavierLogic'
import { loadWordIndex } from '../../lib/wordIndex'
import { phonemes } from '../../lib/phonemes'
import type { PhonemeId } from '../../types/phonetics'

export function ClavierTool() {
  const [sequence, setSequence] = useState<PhonemeId[]>([])
  const [infoPhonemeId, setInfoPhonemeId] = useState<PhonemeId | null>(null)
  const [trie, setTrie] = useState<PhonemeTrieNode | null>(null)

  useEffect(() => {
    let cancelled = false
    loadWordIndex().then((words) => {
      if (!cancelled) setTrie(buildPhonemeTrie(words))
    })
    return () => {
      cancelled = true
    }
  }, [])

  const phonemesById = useMemo(() => new Map(phonemes.map((p) => [p.id, p])), [])

  const viableNext = useMemo(
    () => (!trie || sequence.length === 0 ? null : getViableNextPhonemes(trie, sequence)),
    [trie, sequence],
  )
  const cards = useMemo(
    () => (!trie || sequence.length === 0 ? [] : groupIntoCards(getMatches(trie, sequence))),
    [trie, sequence],
  )

  const infoPhoneme = infoPhonemeId ? phonemesById.get(infoPhonemeId) : undefined

  return (
    <ToolLayout
      title="Clavier phonétique"
      description="Clique les sons que tu entends dans le mot, et regarde l'orthographe apparaître."
    >
      {!trie ? (
        <p className="py-10 text-center text-gray-400">Chargement du lexique…</p>
      ) : (
        <>
          <SequenceBar
            sequence={sequence}
            phonemesById={phonemesById}
            onBackspace={() => setSequence((s) => s.slice(0, -1))}
            onClear={() => setSequence([])}
          />
          <WordResultsPanel
            key={sequence.join('-')}
            cards={cards}
            hasSequence={sequence.length > 0}
            level={2}
          />
          <div className="mt-6">
            <PhonemeKeyboard
              phonemes={phonemes}
              viableNext={viableNext}
              onSelect={(id) => setSequence((s) => [...s, id])}
              onShowInfo={setInfoPhonemeId}
            />
          </div>
        </>
      )}
      {infoPhoneme && <PhonemeInfoModal phoneme={infoPhoneme} onClose={() => setInfoPhonemeId(null)} />}
    </ToolLayout>
  )
}
