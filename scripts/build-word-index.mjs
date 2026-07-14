// Génère le lexique ClavierPhono à partir de Lexique383 : décodage phonétique,
// catégorisation grammaticale, regroupement en familles de mots (lemmaId +
// formRole), filtrage par fréquence pour atteindre AU MOINS 18 000 mots
// (un seul lexique, portée "Clavier 2" — pas de séparation Clavier 1/2).
//
// Sortie :
//   src/data/words-clavier2.json   — le lexique, prêt à être importé par l'app
//   scripts/output/words-review.csv — même contenu en CSV (UTF-8 BOM, Excel/LibreOffice)
//     pour relecture manuelle par l'enseignante AVANT toute intégration finale.
//
// Lancé à la main : node scripts/build-word-index.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { decodePhon } from './lexiquePhonemeMap.ts'

const MIN_WORDS = 18000

const tsvPath = new URL('../third_party/lexique383/Lexique383.tsv', import.meta.url)
const text = readFileSync(tsvPath, 'utf8')
const lines = text.split(/\r\n|\n/).filter(Boolean)
const header = lines[0].split('\t')
const col = Object.fromEntries(header.map((name, i) => [name, i]))

function get(cols, name) {
  return cols[col[name]]
}

// --- Catégorie grammaticale Lexique -> notre WordCategory -----------------
function categoryFor(cgram) {
  if (cgram === 'NOM') return 'nom'
  if (cgram.startsWith('ADJ')) return 'adjectif'
  if (cgram === 'VER' || cgram === 'AUX') return 'verbe'
  if (cgram === 'ADV') return 'adverbe'
  if (['ART:def', 'ART:inf', 'CON', 'LIA', 'PRE', 'ONO'].includes(cgram) || cgram.startsWith('PRO')) {
    return 'invariable'
  }
  return null // catégorie hors périmètre (ex. cgram vide)
}

// --- Lecture + décodage phonétique -----------------------------------------
const rows = []
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split('\t')
  const ortho = get(cols, 'ortho')
  const phon = get(cols, 'phon')
  const cgram = get(cols, 'cgram')
  if (!ortho || !phon || !cgram) continue
  const category = categoryFor(cgram)
  if (!category) continue

  let phonemes
  try {
    phonemes = decodePhon(phon)
  } catch {
    continue // ne devrait pas arriver (spike validé à 100%), filet de sécurité
  }

  rows.push({
    ortho,
    phonemes,
    cgram,
    lemme: get(cols, 'lemme'),
    genre: get(cols, 'genre'),
    nombre: get(cols, 'nombre'),
    infover: get(cols, 'infover'),
    frequency: parseFloat(get(cols, 'freqlivres')) || 0,
    category,
  })
}

// --- Construction des WordEntry candidats, groupés par lemmaId -------------
// lemmaId préfixé par la catégorie pour ne jamais fusionner un nom et un
// verbe qui partagent la même orthographe de lemme (ex. "être" nom vs verbe).
const entriesByLemma = new Map()

function addEntry(lemmaId, category, word, phonemes, formRole, frequency) {
  const key = `${lemmaId}::${formRole}::${word}`
  const list = entriesByLemma.get(lemmaId) ?? []
  const existingIdx = list.findIndex((e) => e.key === key)
  if (existingIdx !== -1) {
    // Un même mot peut apparaître sous plusieurs cgram proches (ex. "de" en
    // ART:def freq=0 ET en PRE freq=38928) — on garde la fréquence la plus
    // élevée plutôt que la première ligne rencontrée dans le fichier.
    if (frequency > list[existingIdx].frequency) {
      list[existingIdx] = { key, word, phonemes, frequency, category, lemmaId, formRole }
    }
    return
  }
  list.push({ key, word, phonemes, frequency, category, lemmaId, formRole })
  entriesByLemma.set(lemmaId, list)
}

// Pour verbe : on ne garde que la ligne la plus fréquente par (lemme, rôle),
// ce qui résout au passage les doublons AUX/VER (ex. "être" auxiliaire vs
// verbe principal partagent les mêmes formes).
const verbSlotBest = new Map() // `${lemme}::${role}` -> row la plus fréquente

for (const row of rows) {
  if (row.category === 'nom') {
    const lemmaId = `nom:${row.lemme}`
    const formRole = row.nombre === 'p' ? 'pluriel' : 'singulier'
    addEntry(lemmaId, 'nom', row.ortho, row.phonemes, formRole, row.frequency)
  } else if (row.category === 'adjectif') {
    if (row.nombre === 'p') continue // seules les formes au singulier (règle Clavier 1)
    const lemmaId = `adjectif:${row.lemme}`
    const formRole = row.genre === 'f' ? 'féminin' : 'masculin'
    addEntry(lemmaId, 'adjectif', row.ortho, row.phonemes, formRole, row.frequency)
  } else if (row.category === 'adverbe') {
    addEntry(`adverbe:${row.ortho}`, 'adverbe', row.ortho, row.phonemes, 'simple', row.frequency)
  } else if (row.category === 'invariable') {
    addEntry(`invariable:${row.ortho}`, 'invariable', row.ortho, row.phonemes, 'simple', row.frequency)
  } else if (row.category === 'verbe') {
    const infover = row.infover || ''
    let role = null
    if (infover.includes('inf')) role = 'infinitif'
    else if (infover.includes('par:pas') && (row.genre === 'm' || !row.genre) && (row.nombre === 's' || !row.nombre)) {
      role = 'participe_passé'
    } else if (infover.includes('ind:pre:3s')) role = 'il_elle_on'
    else if (infover.includes('ind:pre:3p')) role = 'ils_elles'
    if (!role) continue

    const slotKey = `${row.lemme}::${role}`
    const best = verbSlotBest.get(slotKey)
    if (!best || row.frequency > best.frequency) verbSlotBest.set(slotKey, row)
  }
}

for (const [slotKey, row] of verbSlotBest) {
  const role = slotKey.split('::')[1]
  addEntry(`verbe:${row.lemme}`, 'verbe', row.ortho, row.phonemes, role, row.frequency)
}

// --- Filtrage par fréquence : au moins MIN_WORDS mots au total -------------
const lemmaGroups = [...entriesByLemma.values()]
lemmaGroups.forEach((group) => {
  group.maxFrequency = Math.max(...group.map((e) => e.frequency))
})
lemmaGroups.sort((a, b) => b.maxFrequency - a.maxFrequency)

const finalEntries = []
for (const group of lemmaGroups) {
  finalEntries.push(...group)
  if (finalEntries.length >= MIN_WORDS) break
}

// --- Écriture des sorties ----------------------------------------------------
const outDir = new URL('../src/data/', import.meta.url)
const wordIndex = finalEntries
  .map((e) => ({
    word: e.word,
    phonemes: e.phonemes,
    frequency: Math.round(e.frequency * 100) / 100,
    level: 2,
    category: e.category,
    lemmaId: e.lemmaId,
    formRole: e.formRole,
  }))
  .sort((a, b) => b.frequency - a.frequency)

writeFileSync(new URL('words-clavier2.json', outDir), JSON.stringify(wordIndex, null, 2))

const reviewDir = new URL('output/', import.meta.url)
mkdirSync(reviewDir, { recursive: true })
const csvHeader = 'mot;categorie;role;famille;frequence\n'
const csvRows = wordIndex
  .map((e) => `${e.word};${e.category};${e.formRole};${e.lemmaId};${e.frequency}`)
  .join('\n')
writeFileSync(new URL('words-review.csv', reviewDir), '﻿' + csvHeader + csvRows)

console.log(`${wordIndex.length} mots générés (objectif: >= ${MIN_WORDS}).`)
console.log(`Familles de mots (cartes) : ${lemmaGroups.filter((g) => finalEntries.includes(g[0])).length}`)
const byCategory = {}
for (const e of wordIndex) byCategory[e.category] = (byCategory[e.category] || 0) + 1
console.log('Répartition par catégorie:', byCategory)
console.log('\nÉcrit: src/data/words-clavier2.json')
console.log('Écrit: scripts/output/words-review.csv (pour relecture par l\'enseignante)')
