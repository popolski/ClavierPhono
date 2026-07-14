// Spike jetable : extrait l'inventaire réel des symboles de la colonne "phon"
// de Lexique383, pour construire lexiquePhonemeMap.ts. Voir le plan, section
// "Risque technique principal".
import { readFileSync } from 'node:fs'

const tsvPath = new URL('../third_party/lexique383/Lexique383.tsv', import.meta.url)
const text = readFileSync(tsvPath, 'utf8')
const lines = text.split(/\r\n|\n/).filter(Boolean)
const header = lines[0].split('\t')
const orthoIdx = header.indexOf('ortho')
const phonIdx = header.indexOf('phon')
const syllIdx = header.indexOf('syll')

const charExamples = new Map()

for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split('\t')
  const ortho = cols[orthoIdx]
  const phon = cols[phonIdx]
  if (!phon) continue
  for (const ch of phon) {
    if (!charExamples.has(ch)) charExamples.set(ch, [])
    const examples = charExamples.get(ch)
    if (examples.length < 3) examples.push(ortho)
  }
}

const sorted = [...charExamples.entries()].sort((a, b) => a[0].localeCompare(b[0]))
console.log(`Symboles distincts trouvés dans "phon": ${sorted.length}\n`)
for (const [ch, examples] of sorted) {
  console.log(`  '${ch}' (U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}) — ex: ${examples.join(', ')}`)
}

// Quelques exemples de mots de contrôle avec leur phon + syll
console.log('\nMots de contrôle (ortho -> phon | syll):')
const controlWords = ['chat', 'eau', 'bateau', 'maison', 'oiseau', 'fille', 'pain', 'oignon']
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split('\t')
  if (controlWords.includes(cols[orthoIdx]) && !controlWords.includes(cols[orthoIdx] + '_done')) {
    console.log(`  ${cols[orthoIdx]} -> ${cols[phonIdx]} | ${cols[syllIdx]}`)
  }
}
