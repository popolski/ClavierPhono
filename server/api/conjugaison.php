<?php
// Génération de la conjugaison d'un verbe régulier du 1er groupe, pour les
// verbes ajoutés à la main par l'enseignante (absents de Lexique383, donc
// absents des tableaux générés au build).
//
// Port fidèle de la logique de scripts/build-conjugation-index.mjs
// (regularErForms + cederStyleForms) : MÊME découpage, MÊMES exclusions.
// Si les deux fichiers divergent un jour, un même verbe se conjuguerait
// différemment selon qu'il vient du lexique généré ou d'un ajout manuel.
//
// Principe directeur repris du script Node : ne JAMAIS deviner. Un verbe
// dont la conjugaison n'est pas déterministe (irrégulier, -yer, -eler/-eter)
// ne reçoit aucun tableau plutôt qu'un tableau potentiellement faux — on
// n'affiche pas une orthographe inventée à un enfant.

const PERSONS = ['1s', '2s', '3s', '1p', '2p', '3p'];

const PRESENT_ENDINGS = ['1s' => 'e', '2s' => 'es', '3s' => 'e', '1p' => 'ons', '2p' => 'ez', '3p' => 'ent'];
const IMPARFAIT_ENDINGS = ['1s' => 'ais', '2s' => 'ais', '3s' => 'ait', '1p' => 'ions', '2p' => 'iez', '3p' => 'aient'];
const FUTUR_ENDINGS = ['1s' => 'ai', '2s' => 'as', '3s' => 'a', '1p' => 'ons', '2p' => 'ez', '3p' => 'ont'];

// je/tu/il/elle/on/nous/vous/ils/elles : 9 personnes affichées, mappées sur
// les 6 cases grammaticales (comme NEUF_PERSONNES côté Node).
const NEUF_PERSONNES = [
    'je' => '1s',
    'tu' => '2s',
    'il' => '3s',
    'elle' => '3s',
    'on' => '3s',
    'nous' => '1p',
    'vous' => '2p',
    'ils' => '3p',
    'elles' => '3p',
];

// Verbes se conjuguant avec "être" au passé composé — même liste fermée que
// scripts/build-conjugation-index.mjs (ETRE_VERBS). En pratique ils sont tous
// déjà dans le lexique généré, donc jamais ajoutés à la main ; la liste est
// reprise quand même pour que les deux implémentations ne divergent pas (une
// comparaison des deux sorties l'avait signalé sur entrer/arriver/passer).
const ETRE_VERBS = [
    'aller', 'arriver', 'décéder', 'entrer', 'rentrer', 'monter', 'remonter',
    'mourir', 'naître', 'renaître', 'partir', 'repartir', 'passer', 'rester',
    'retourner', 'sortir', 'ressortir', 'tomber', 'retomber', 'venir',
    'devenir', 'revenir', 'parvenir', 'survenir', 'intervenir', 'descendre',
    'redescendre',
];

// Genre/nombre par personne, pour l'accord du participe avec "être".
// je/tu/on/nous/vous : genre indéterminable, masculin par défaut (comme
// GENRE_PAR_PERSONNE côté Node).
const ACCORD_PAR_PERSONNE = [
    'je' => 'ms', 'tu' => 'ms', 'il' => 'ms', 'elle' => 'fs', 'on' => 'ms',
    'nous' => 'mp', 'vous' => 'mp', 'ils' => 'mp', 'elles' => 'fp',
];

const ETRE_PRESENT = [
    'je' => 'suis',
    'tu' => 'es',
    'il' => 'est',
    'elle' => 'est',
    'on' => 'est',
    'nous' => 'sommes',
    'vous' => 'êtes',
    'ils' => 'sont',
    'elles' => 'sont',
];

// Présent d'"avoir", pour construire le passé composé.
const AVOIR_PRESENT = [
    'je' => 'ai',
    'tu' => 'as',
    'il' => 'a',
    'elle' => 'a',
    'on' => 'a',
    'nous' => 'avons',
    'vous' => 'avez',
    'ils' => 'ont',
    'elles' => 'ont',
];

function startsAO(string $ending): bool
{
    return preg_match('/^[ao]/u', $ending) === 1;
}

/** Radical à alternance é/è : céder, espérer, compléter, protéger… */
function isCederStyleStem(string $stem): bool
{
    return preg_match('/[éèê][bcdfghjklmnpqrstvwxz]$/ui', $stem) === 1;
}

/**
 * Radicaux dont la conjugaison n'est PAS déterministe : -yer (payer), et
 * e/é + consonne finale unique (lever, céder, appeler, jeter). Le sous-cas
 * céder/espérer est rattrapé plus bas par cederStyleForms(), le reste est
 * abandonné.
 */
function isRiskyErStem(string $stem): bool
{
    if (preg_match('/y$/ui', $stem) === 1) {
        return true;
    }
    if (preg_match('/[eéèê][bcdfghjklmnpqrstvwxz]$/ui', $stem) === 1) {
        return true;
    }
    return false;
}

/** Verbe en -er régulier "simple" (manger, placer, zoomer…). */
function regularErForms(string $infinitif): ?array
{
    if (preg_match('/er$/u', $infinitif) !== 1 || $infinitif === 'aller') {
        return null;
    }
    $stem = mb_substr($infinitif, 0, -2);
    if (isRiskyErStem($stem)) {
        return null;
    }

    $isGer = preg_match('/g$/u', $stem) === 1; // manger -> mangeons, mangeais
    $isCer = preg_match('/c$/u', $stem) === 1; // placer -> plaçons, plaçais
    $stemAO = $isGer ? $stem . 'e' : ($isCer ? mb_substr($stem, 0, -1) . 'ç' : $stem);

    $present = [];
    $imparfait = [];
    $futur = [];
    foreach (PERSONS as $p) {
        $present[$p] = (startsAO(PRESENT_ENDINGS[$p]) ? $stemAO : $stem) . PRESENT_ENDINGS[$p];
        $imparfait[$p] = (startsAO(IMPARFAIT_ENDINGS[$p]) ? $stemAO : $stem) . IMPARFAIT_ENDINGS[$p];
        $futur[$p] = $infinitif . FUTUR_ENDINGS[$p]; // futur régulier = infinitif + terminaison
    }

    return [
        'present' => $present,
        'imparfait' => $imparfait,
        'futur' => $futur,
        'participe' => ['ms' => $stem . 'é', 'fs' => $stem . 'ée', 'mp' => $stem . 'és', 'fp' => $stem . 'ées'],
    ];
}

/**
 * Famille de céder : radical fort en è devant terminaison muette, et au
 * futur/conditionnel (rectifications de l'orthographe de 1990).
 */
function cederStyleForms(string $infinitif): ?array
{
    if (preg_match('/er$/u', $infinitif) !== 1 || $infinitif === 'aller') {
        return null;
    }
    $stem = mb_substr($infinitif, 0, -2);
    if (!isCederStyleStem($stem)) {
        return null;
    }

    $isGer = preg_match('/g$/u', $stem) === 1; // protéger -> protégeons
    $isCer = preg_match('/c$/u', $stem) === 1; // rapiécer -> rapiéçons
    $stemAO = $isGer ? $stem . 'e' : ($isCer ? mb_substr($stem, 0, -1) . 'ç' : $stem);

    // Seul le dernier é/è/ê (juste avant la consonne finale) devient è : les
    // é plus tôt dans le mot restent é (préférer -> je préfère, pas *prèfère).
    $accent = mb_substr($stem, -2, 1);
    $strongAccent = $accent === 'é' ? 'è' : ($accent === 'É' ? 'È' : $accent);
    $stemStrong = mb_substr($stem, 0, -2) . $strongAccent . mb_substr($stem, -1);

    $present = [];
    $imparfait = [];
    $futur = [];
    foreach (PERSONS as $p) {
        $strongPerson = in_array($p, ['1s', '2s', '3s', '3p'], true);
        $base = $strongPerson ? $stemStrong : (startsAO(PRESENT_ENDINGS[$p]) ? $stemAO : $stem);
        $present[$p] = $base . PRESENT_ENDINGS[$p];
        $imparfait[$p] = (startsAO(IMPARFAIT_ENDINGS[$p]) ? $stemAO : $stem) . IMPARFAIT_ENDINGS[$p];
        $futur[$p] = $stemStrong . 'er' . FUTUR_ENDINGS[$p]; // è au futur (réforme 1990)
    }

    return [
        'present' => $present,
        'imparfait' => $imparfait,
        'futur' => $futur,
        'participe' => ['ms' => $stem . 'é', 'fs' => $stem . 'ée', 'mp' => $stem . 'és', 'fp' => $stem . 'ées'],
    ];
}

/** Étend les 6 cases grammaticales aux 9 personnes affichées. */
function expandToNeuf(array $sixCases): array
{
    $out = [];
    foreach (NEUF_PERSONNES as $personne => $grammCase) {
        if (isset($sixCases[$grammCase])) {
            $out[$personne] = $sixCases[$grammCase];
        }
    }
    return $out;
}

/**
 * Tableau complet au format attendu par le conjugueur (src/lib/conjugations.ts),
 * ou null si le verbe n'est pas conjugable de façon sûre.
 */
function genererConjugaison(string $infinitif): ?array
{
    $gen = regularErForms($infinitif) ?? cederStyleForms($infinitif);
    if ($gen === null) {
        return null;
    }

    $estEtre = in_array($infinitif, ETRE_VERBS, true);
    $auxPresent = $estEtre ? ETRE_PRESENT : AVOIR_PRESENT;

    $passeCompose = [];
    foreach ($auxPresent as $personne => $aux) {
        // Avec "être", le participe s'accorde avec le sujet (elle est entrée,
        // elles sont entrées) ; avec "avoir", il reste au masculin singulier.
        $participe = $estEtre ? $gen['participe'][ACCORD_PAR_PERSONNE[$personne]] : $gen['participe']['ms'];
        $passeCompose[$personne] = $aux . ' ' . $participe;
    }

    return [
        'infinitif' => $infinitif,
        'auxiliaire' => $estEtre ? 'être' : 'avoir',
        'present' => expandToNeuf($gen['present']),
        'futur' => expandToNeuf($gen['futur']),
        'imparfait' => expandToNeuf($gen['imparfait']),
        'passeCompose' => $passeCompose,
    ];
}
