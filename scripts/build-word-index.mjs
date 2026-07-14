// Génère le lexique ClavierPhono : structure grammaticale et phonétique
// depuis Lexique383, mais le mot n'est retenu QUE s'il apparaît réellement
// dans Manulex (54 manuels scolaires CP/CE1/cycle 3, manulex.org) — Manulex
// sert de filtre de contenu ET de source de fréquence/classement (SFI
// combiné CP à CM2), à la place de la fréquence livres adulte de Lexique383.
//
// Ça élimine mécaniquement le vocabulaire hors-sujet pour une classe
// primaire (un manuel scolaire ne contient pas d'insultes) et réduit la
// liste finale à une taille réellement relisable par l'enseignante — pas
// de filtrage automatique "en plus" de la relecture manuelle, ce EST le
// filtrage : ne garder que ce qui a été effectivement écrit pour des enfants.
//
// Cas particulier des verbes : le filtre Manulex se décide au niveau du
// VERBE, pas forme par forme. Sinon un verbe dont seule une forme conjuguée
// (ex. "huile") apparaît dans Manulex, mais pas l'infinitif ("huiler") lui-
// même, perdrait son infinitif alors que le verbe est manifestement connu
// des élèves. Si au moins une forme du verbe est dans Manulex, on construit
// la carte complète (infinitif/participe passé/il-elle-on/ils-elles) à
// partir de Lexique383, même pour les formes qui n'ont pas elles-mêmes de
// correspondance directe dans Manulex.
//
// Prérequis : third_party/manulex/manulex-forms.csv (export de Manulex.xls,
// voir le commit "Croiser le lexique avec Manulex" pour la commande Python).
//
// Sortie :
//   src/data/words-clavier2.json    — le lexique, prêt à être importé par l'app
//   scripts/output/words-review.csv — même contenu en CSV (UTF-8 BOM, Excel/LibreOffice)
//     pour une relecture finale, allégée, par l'enseignante.
//
// Lancé à la main : node scripts/build-word-index.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { decodePhon } from './lexiquePhonemeMap.ts'

// --- Manulex : lookup mot -> fréquence CP-CM2 (SFI) -------------------------
const manulexPath = new URL('../third_party/manulex/manulex-forms.csv', import.meta.url)
const manulexLines = readFileSync(manulexPath, 'utf8').split(/\r\n|\n/).filter(Boolean)
const manulexByWord = new Map()
for (let i = 1; i < manulexLines.length; i++) {
  const [word, , , , cpcm2Sfi] = manulexLines[i].split(',')
  const sfi = parseFloat(cpcm2Sfi) || 0
  const existing = manulexByWord.get(word)
  if (!existing || sfi > existing) manulexByWord.set(word, sfi)
}

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

// --- Lecture + décodage phonétique -------------------------------------------
// Pour les non-verbes, le filtre Manulex s'applique tout de suite (chaque
// forme doit justifier sa propre présence). Pour les verbes, on garde toutes
// les lignes ici et on décide au niveau du lemme plus bas.
const rows = []
let droppedNotInManulex = 0
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split('\t')
  const ortho = get(cols, 'ortho')
  const phon = get(cols, 'phon')
  const cgram = get(cols, 'cgram')
  if (!ortho || !phon || !cgram) continue
  const category = categoryFor(cgram)
  if (!category) continue

  const manulexSfi = manulexByWord.get(ortho)
  if (category !== 'verbe' && manulexSfi === undefined) {
    droppedNotInManulex++
    continue // le mot n'apparaît dans aucun des 54 manuels scolaires étudiés
  }

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
    freqlivres: parseFloat(get(cols, 'freqlivres')) || 0,
    manulexSfi, // undefined si cette forme précise n'est pas dans Manulex
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
    // ART:def ET en PRE) — on garde la fréquence la plus élevée plutôt que
    // la première ligne rencontrée dans le fichier.
    if (frequency > list[existingIdx].frequency) {
      list[existingIdx] = { key, word, phonemes, frequency, category, lemmaId, formRole }
    }
    return
  }
  list.push({ key, word, phonemes, frequency, category, lemmaId, formRole })
  entriesByLemma.set(lemmaId, list)
}

// Pour verbe : on garde la ligne la plus pertinente par (lemme, rôle) — en
// préférant une forme elle-même présente dans Manulex, sinon la plus
// fréquente (freqlivres) — ce qui résout au passage les doublons AUX/VER
// (ex. "être" auxiliaire vs verbe principal partagent les mêmes formes).
const verbSlotBest = new Map() // `${lemme}::${role}` -> row la plus pertinente

function isBetterVerbCandidate(candidate, current) {
  if (!current) return true
  const candidateInManulex = candidate.manulexSfi !== undefined
  const currentInManulex = current.manulexSfi !== undefined
  if (candidateInManulex !== currentInManulex) return candidateInManulex
  return candidate.freqlivres > current.freqlivres
}

for (const row of rows) {
  if (row.category === 'nom') {
    const lemmaId = `nom:${row.lemme}`
    const formRole = row.nombre === 'p' ? 'pluriel' : 'singulier'
    addEntry(lemmaId, 'nom', row.ortho, row.phonemes, formRole, row.manulexSfi)
  } else if (row.category === 'adjectif') {
    if (row.nombre === 'p') continue // seules les formes au singulier (règle Clavier 1)
    const lemmaId = `adjectif:${row.lemme}`
    const formRole = row.genre === 'f' ? 'féminin' : 'masculin'
    addEntry(lemmaId, 'adjectif', row.ortho, row.phonemes, formRole, row.manulexSfi)
  } else if (row.category === 'adverbe') {
    addEntry(`adverbe:${row.ortho}`, 'adverbe', row.ortho, row.phonemes, 'simple', row.manulexSfi)
  } else if (row.category === 'invariable') {
    addEntry(`invariable:${row.ortho}`, 'invariable', row.ortho, row.phonemes, 'simple', row.manulexSfi)
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
    if (isBetterVerbCandidate(row, verbSlotBest.get(slotKey))) verbSlotBest.set(slotKey, { ...row, role })
  }
}

// Qualification par lemme : le verbe est retenu si AU MOINS une de ses 4
// formes candidates est elle-même dans Manulex — auquel cas on construit la
// carte complète avec toutes les formes trouvées dans Lexique383, même
// celles qui n'ont pas individuellement de correspondance dans Manulex.
const verbRowsByLemma = new Map()
for (const [slotKey, row] of verbSlotBest) {
  const lemme = slotKey.split('::')[0]
  const list = verbRowsByLemma.get(lemme) ?? []
  list.push(row)
  verbRowsByLemma.set(lemme, list)
}

let verbLemmesRejected = 0
for (const [lemme, verbRows] of verbRowsByLemma) {
  const qualifyingSfis = verbRows.map((r) => r.manulexSfi).filter((sfi) => sfi !== undefined)
  if (qualifyingSfis.length === 0) {
    verbLemmesRejected++
    continue // aucune forme de ce verbe n'apparaît dans Manulex
  }
  const representativeSfi = Math.max(...qualifyingSfis)
  for (const row of verbRows) {
    addEntry(`verbe:${lemme}`, 'verbe', row.ortho, row.phonemes, row.role, row.manulexSfi ?? representativeSfi)
  }
}

// --- Pas de coupure artificielle : on garde tout ce qui a passé le filtre --
// Manulex (contrairement à la version précédente, plus de cible "au moins
// 18000" — la taille finale est celle du vocabulaire réellement scolaire).
const lemmaGroups = [...entriesByLemma.values()]
const finalEntries = lemmaGroups.flat()

// --- Écriture des sorties ----------------------------------------------------
const outDir = new URL('../src/data/', import.meta.url)
const wordIndex = finalEntries
  .map((e) => ({
    word: e.word,
    phonemes: e.phonemes,
    frequency: Math.round(e.frequency * 100) / 100, // SFI Manulex (CP-CM2), pas freqlivres
    level: 2,
    category: e.category,
    lemmaId: e.lemmaId,
    formRole: e.formRole,
  }))
  .sort((a, b) => b.frequency - a.frequency)

writeFileSync(new URL('words-clavier2.json', outDir), JSON.stringify(wordIndex, null, 2))

const reviewDir = new URL('output/', import.meta.url)
mkdirSync(reviewDir, { recursive: true })
const csvHeader = 'mot;categorie;role;famille;sfi_manulex_cp_cm2\n'
const csvRows = wordIndex
  .map((e) => `${e.word};${e.category};${e.formRole};${e.lemmaId};${e.frequency}`)
  .join('\n')
writeFileSync(new URL('words-review.csv', reviewDir), '﻿' + csvHeader + csvRows)

console.log(`${wordIndex.length} mots générés (tous présents dans Manulex, ou verbe dont au moins une forme y est).`)
console.log(`${droppedNotInManulex} lignes non-verbe écartées car absentes de Manulex.`)
console.log(`${verbLemmesRejected} verbes écartés car aucune de leurs formes n'est dans Manulex.`)
console.log(`Familles de mots (cartes) : ${lemmaGroups.length}`)
const byCategory = {}
for (const e of wordIndex) byCategory[e.category] = (byCategory[e.category] || 0) + 1
console.log('Répartition par catégorie:', byCategory)
console.log('\nÉcrit: src/data/words-clavier2.json')
console.log('Écrit: scripts/output/words-review.csv (pour relecture par l\'enseignante)')
