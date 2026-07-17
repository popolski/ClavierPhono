// Croise le lexique généré (words-clavier2.json, classé par fréquence livres
// adulte via Lexique383) avec Manulex (fréquence réelle dans 54 manuels
// scolaires CP/CE1/cycle 3) — pour repérer les mots absents des manuels
// scolaires (registre potentiellement trop adulte) et enrichir le CSV de
// relecture avec un signal "vu en classe ou pas".
//
// Prérequis : third_party/manulex/manulex-forms.csv (généré une fois depuis
// Manulex.xls, voir scripts/README ou le message de commit pour la commande).
//
// Licence Manulex : CC BY-NC-SA 3.0 — usage non commercial, attribution requise.
import { readFileSync, writeFileSync } from 'node:fs'

const wordsPath = new URL('../src/data/words-clavier2.json', import.meta.url)
const manulexPath = new URL('../third_party/manulex/manulex-forms.csv', import.meta.url)

const words = JSON.parse(readFileSync(wordsPath, 'utf8'))

const manulexText = readFileSync(manulexPath, 'utf8')
const manulexLines = manulexText.split(/\r\n|\n/).filter(Boolean)
const manulexByWord = new Map()
for (let i = 1; i < manulexLines.length; i++) {
  const [word, cpSfi, ce1Sfi, ce2cm2Sfi, cpcm2Sfi, cpcm2F] = manulexLines[i].split(',')
  // Un mot peut apparaître plusieurs fois (homographes) : on garde le SFI le plus élevé.
  const existing = manulexByWord.get(word)
  const sfi = parseFloat(cpcm2Sfi) || 0
  if (!existing || sfi > existing.cpcm2Sfi) {
    manulexByWord.set(word, {
      cpSfi: parseFloat(cpSfi) || 0,
      ce1Sfi: parseFloat(ce1Sfi) || 0,
      ce2cm2Sfi: parseFloat(ce2cm2Sfi) || 0,
      cpcm2Sfi: sfi,
      cpcm2F: parseFloat(cpcm2F) || 0,
    })
  }
}

let foundCount = 0
const enriched = words.map((entry) => {
  const m = manulexByWord.get(entry.word)
  if (m) foundCount++
  return { ...entry, manulex: m ?? null }
})

console.log(`${foundCount} / ${words.length} mots du lexique trouvés dans Manulex (formes CP à CM2).`)
console.log(`${words.length - foundCount} mots absents de Manulex (jamais vus dans les 54 manuels scolaires étudiés).`)

// Les 40 mots les plus fréquents (fréquence livres) mais ABSENTS de Manulex —
// les meilleurs candidats à vérifier en priorité lors de la relecture.
const absentButFrequent = enriched
  .filter((e) => !e.manulex)
  .sort((a, b) => b.frequency - a.frequency)
  .slice(0, 40)

console.log('\nTop mots fréquents (Lexique383) mais absents de Manulex, à vérifier en priorité :')
for (const e of absentButFrequent) {
  console.log(`  ${e.word} (${e.category}, freqLivres=${e.frequency})`)
}

// CSV enrichi pour la relecture par l'enseignant.
const csvHeader = 'mot;categorie;role;famille;freq_livres;vu_manulex;manulex_sfi_cp_cm2\n'
const csvRows = enriched
  .map(
    (e) =>
      `${e.word};${e.category};${e.formRole};${e.lemmaId};${e.frequency};${e.manulex ? 'oui' : 'NON'};${
        e.manulex ? e.manulex.cpcm2Sfi.toFixed(1) : ''
      }`,
  )
  .join('\n')
writeFileSync(new URL('output/words-review.csv', import.meta.url), '﻿' + csvHeader + csvRows)
console.log('\nÉcrit: scripts/output/words-review.csv (colonnes Manulex ajoutées)')
