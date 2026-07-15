// Convertit la base EQOL (fournie en xlsx par l'enseignante, source :
// appligogiques.com/eqol) en CSV UTF-8, pour être lue par
// build-word-index.mjs sans dépendance xlsx au moment du build principal.
//
// Prérequis : placer le fichier fourni dans third_party/eqol/liste_eqol.xlsx
// (non versionné, comme third_party/lexique383 et third_party/manulex).
//
// Lancé à la main, une seule fois : node scripts/convert-eqol.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import xlsx from 'xlsx'

const srcPath = new URL('../third_party/eqol/liste_eqol.xlsx', import.meta.url)
const workbook = xlsx.readFile(srcPath, { cellText: false })
const sheet = workbook.Sheets[workbook.SheetNames[0]]
const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' })

console.log(`${rows.length} lignes lues depuis ${workbook.SheetNames[0]}`)
console.log('Colonnes:', Object.keys(rows[0]))

// On ne garde que les colonnes utiles au croisement : le mot, sa catégorie
// grammaticale EQOL, et le taux de réussite par classe (acquisition CP->CM2),
// qui nous servira à calculer le niveau scolaire d'apparition d'un mot.
const header = [
  'mot',
  'categorie',
  'reussite_classe_1',
  'reussite_classe_2',
  'reussite_classe_3',
  'reussite_classe_4',
  'reussite_classe_5',
  'reussite_classe_6',
]

function csvEscape(value) {
  const s = String(value ?? '')
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const lines = [header.join(';')]
for (const row of rows) {
  lines.push(
    [
      row['Mot'],
      row['Catégorie grammaticale'],
      row['Réussite classe 1'],
      row['Réussite classe 2'],
      row['Réussite classe 3'],
      row['Réussite classe 4'],
      row['Réussite classe 5'],
      row['Réussite classe 6'],
    ]
      .map(csvEscape)
      .join(';'),
  )
}

const outPath = new URL('../third_party/eqol/eqol-forms.csv', import.meta.url)
writeFileSync(outPath, lines.join('\n'))
console.log(`Écrit: third_party/eqol/eqol-forms.csv (${rows.length} mots)`)
