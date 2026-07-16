import { describe, expect, it } from 'vitest'
import { fusionnerFamilles, fusionnerRelations } from './addedLexicon'
import type { LexiconWord } from './api'
import type { WordFamilyIndex, WordRelationIndex } from '../types/phonetics'

function motAjoute(partial: Partial<LexiconWord> & Pick<LexiconWord, 'id' | 'mot' | 'categorie'>): LexiconWord {
  return {
    phonemes: [],
    genre: null,
    conjugaison: null,
    relations: { synonyme: [], antonyme: [], famille: [] },
    ...partial,
  }
}

describe('fusionnerRelations', () => {
  it('expose les relations saisies sur le mot ajouté', () => {
    const wapiti = motAjoute({
      id: 1,
      mot: 'wapiti',
      categorie: 'nom',
      relations: {
        synonyme: [{ lemmaId: 'nom:cerf', word: 'cerf', category: 'nom' }],
        antonyme: [],
        famille: [],
      },
    })
    const index = fusionnerRelations({}, [wapiti], 'synonyme')

    expect(index['ajout:nom:wapiti']).toEqual([{ word: 'cerf', category: 'nom', lemmaId: 'nom:cerf' }])
  })

  it('rend la relation symétrique : cerf doit aussi proposer wapiti', () => {
    const wapiti = motAjoute({
      id: 1,
      mot: 'wapiti',
      categorie: 'nom',
      relations: {
        synonyme: [{ lemmaId: 'nom:cerf', word: 'cerf', category: 'nom' }],
        antonyme: [],
        famille: [],
      },
    })
    const index = fusionnerRelations({}, [wapiti], 'synonyme')

    expect(index['nom:cerf']).toEqual([{ word: 'wapiti', category: 'nom', lemmaId: 'ajout:nom:wapiti' }])
  })

  it("ajoute aux synonymes existants d'un mot du lexique sans les écraser", () => {
    const statique: WordRelationIndex = {
      'nom:cerf': [{ word: 'biche', category: 'nom', lemmaId: 'nom:biche' }],
    }
    const wapiti = motAjoute({
      id: 1,
      mot: 'wapiti',
      categorie: 'nom',
      relations: {
        synonyme: [{ lemmaId: 'nom:cerf', word: 'cerf', category: 'nom' }],
        antonyme: [],
        famille: [],
      },
    })
    const index = fusionnerRelations(statique, [wapiti], 'synonyme')

    expect(index['nom:cerf'].map((m) => m.word)).toEqual(['biche', 'wapiti'])
    // L'index statique importé ne doit pas être muté au passage.
    expect(statique['nom:cerf']).toHaveLength(1)
  })

  it('ne mélange pas les types de relation', () => {
    const mot = motAjoute({
      id: 1,
      mot: 'wapiti',
      categorie: 'nom',
      relations: {
        synonyme: [{ lemmaId: 'nom:cerf', word: 'cerf', category: 'nom' }],
        antonyme: [{ lemmaId: 'nom:loup', word: 'loup', category: 'nom' }],
        famille: [],
      },
    })
    expect(fusionnerRelations({}, [mot], 'antonyme')['ajout:nom:wapiti']).toEqual([
      { word: 'loup', category: 'nom', lemmaId: 'nom:loup' },
    ])
    expect(fusionnerRelations({}, [mot], 'synonyme')['ajout:nom:wapiti']).toEqual([
      { word: 'cerf', category: 'nom', lemmaId: 'nom:cerf' },
    ])
  })

  it('laisse le lexique statique intact quand aucun mot ajouté', () => {
    const statique: WordRelationIndex = {
      'nom:cerf': [{ word: 'biche', category: 'nom', lemmaId: 'nom:biche' }],
    }
    expect(fusionnerRelations(statique, [], 'synonyme')).toEqual(statique)
  })
})

describe('fusionnerFamilles', () => {
  it('marque les mots ajoutés comme cliquables (inLexicon)', () => {
    const statique: WordFamilyIndex = {}
    const mot = motAjoute({
      id: 1,
      mot: 'wapiti',
      categorie: 'nom',
      relations: {
        synonyme: [],
        antonyme: [],
        famille: [{ lemmaId: 'nom:cerf', word: 'cerf', category: 'nom' }],
      },
    })
    const index = fusionnerFamilles(statique, [mot])

    // Un mot ajouté a bien sa propre fiche : les deux sens sont cliquables.
    expect(index['ajout:nom:wapiti']).toEqual([
      { word: 'cerf', category: 'nom', lemmaId: 'nom:cerf', inLexicon: true },
    ])
    expect(index['nom:cerf']).toEqual([
      { word: 'wapiti', category: 'nom', lemmaId: 'ajout:nom:wapiti', inLexicon: true },
    ])
  })

  it('remplace un lien statique non cliquable par le même mot devenu ajout (pas de doublon)', () => {
    // Cas réel : "trouillard" figurait déjà comme famille de "trouille" dans
    // word-families.json (Démonette), mais non cliquable puisqu'absent du
    // lexique généré. Une fois "trouillard" ajouté à la main ET relié à
    // "trouille", il ne doit apparaître qu'UNE fois — la version cliquable.
    const statique: WordFamilyIndex = {
      'nom:trouille': [{ word: 'trouillard', category: 'adjectif', lemmaId: 'trouillard::adjectif', inLexicon: false }],
    }
    const trouillard = motAjoute({
      id: 1,
      mot: 'trouillard',
      categorie: 'adjectif',
      relations: {
        synonyme: [],
        antonyme: [],
        famille: [{ lemmaId: 'nom:trouille', word: 'trouille', category: 'nom' }],
      },
    })
    const index = fusionnerFamilles(statique, [trouillard])

    expect(index['nom:trouille']).toEqual([
      { word: 'trouillard', category: 'adjectif', lemmaId: 'ajout:adjectif:trouillard', inLexicon: true },
    ])
  })
})
