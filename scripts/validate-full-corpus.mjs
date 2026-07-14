// Fait tourner decodePhon() sur les ~140 000 lignes de Lexique383 pour
// vérifier qu'aucun symbole n'est laissé de côté avant d'écrire le pipeline
// complet (build-word-index.mjs).
import { readFileSync } from 'node:fs'
import { decodePhon } from './lexiquePhonemeMap.ts'

const tsvPath = new URL('../third_party/lexique383/Lexique383.tsv', import.meta.url)
const text = readFileSync(tsvPath, 'utf8')
const lines = text.split(/\r\n|\n/).filter(Boolean)
const header = lines[0].split('\t')
const orthoIdx = header.indexOf('ortho')
const phonIdx = header.indexOf('phon')

let ok = 0
let failed = 0
const failures = []

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split('\t')
  const ortho = cols[orthoIdx]
  const phon = cols[phonIdx]
  if (!phon) continue
  try {
    decodePhon(phon)
    ok++
  } catch (e) {
    failed++
    if (failures.length < 20) failures.push(`${ortho} (phon="${phon}"): ${e.message}`)
  }
}

console.log(`${ok} décodés avec succès, ${failed} échecs sur ${ok + failed} lignes.`)
if (failures.length > 0) {
  console.log('\nExemples d\'échecs:')
  failures.forEach((f) => console.log('  ' + f))
}
