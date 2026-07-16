<?php
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/conjugaison.php';
configureSession();
$user = requireAuth(); // élève ou enseignante : tout le monde peut lire les mots ajoutés

$db = getDb();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $db->query('SELECT id, mot, categorie, phonemes, genre, conjugaison FROM lexicon_additions ORDER BY mot');
    $rows = $stmt->fetchAll();

    // Relations de tous les mots en une requête (plutôt qu'une par mot).
    $rel = $db->query(
        'SELECT word_id, type, target_lemma_id, target_word, target_category FROM lexicon_relations',
    )->fetchAll();
    $relationsParMot = [];
    foreach ($rel as $r) {
        $relationsParMot[$r['word_id']][$r['type']][] = [
            'lemmaId' => $r['target_lemma_id'],
            'word' => $r['target_word'],
            'category' => $r['target_category'],
        ];
    }

    foreach ($rows as &$row) {
        $row['phonemes'] = json_decode($row['phonemes'], true);
        $row['conjugaison'] = $row['conjugaison'] !== null ? json_decode($row['conjugaison'], true) : null;
        $row['relations'] = [
            'synonyme' => $relationsParMot[$row['id']]['synonyme'] ?? [],
            'antonyme' => $relationsParMot[$row['id']]['antonyme'] ?? [],
            'famille' => $relationsParMot[$row['id']]['famille'] ?? [],
        ];
    }
    jsonResponse(200, ['words' => $rows]);
}

if ($method === 'POST') {
    if ($user['role'] !== 'teacher') {
        jsonResponse(403, ['error' => 'Réservé à l\'enseignante']);
    }

    // Séquence de touches valides du clavier phonétique (src/data/phonemes.json)
    // — tenue à jour manuellement ici, ne change quasiment jamais.
    $validPhonemeIds = [
        'a', 'e', 'i', 'o', 'u', 'ou', 'on', 'an', 'in', 'oi', 'eu',
        'b', 'ch', 'd', 'f', 'g', 'j', 'c', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'z',
        'gn', 'ill', 'oin', 'x', 'w', 'ui',
    ];
    $validCategories = ['nom', 'adjectif', 'verbe', 'adverbe', 'invariable'];

    $body = jsonBody();
    $mot = trim((string) ($body['mot'] ?? ''));
    $categorie = (string) ($body['categorie'] ?? '');
    $genre = $body['genre'] ?? null;
    $phonemes = $body['phonemes'] ?? null;

    if ($mot === '' || mb_strlen($mot) > 100) {
        jsonResponse(400, ['error' => 'Mot invalide']);
    }
    if (!in_array($categorie, $validCategories, true)) {
        jsonResponse(400, ['error' => 'Catégorie invalide']);
    }
    if ($genre !== null && $genre !== 'm' && $genre !== 'f') {
        jsonResponse(400, ['error' => 'Genre invalide']);
    }
    if (!is_array($phonemes) || count($phonemes) === 0) {
        jsonResponse(400, ['error' => 'Séquence phonétique manquante']);
    }
    foreach ($phonemes as $p) {
        if (!in_array($p, $validPhonemeIds, true)) {
            jsonResponse(400, ['error' => "Touche inconnue : $p"]);
        }
    }

    // Conjugaison calculée à l'ajout, une fois pour toutes. null si le verbe
    // n'est pas régulier (ou si ce n'est pas un verbe) : mieux vaut pas de
    // tableau qu'un tableau inventé.
    $conjugaison = $categorie === 'verbe' ? genererConjugaison($mot) : null;

    $stmt = $db->prepare(
        'INSERT INTO lexicon_additions (mot, categorie, phonemes, genre, conjugaison, created_by)
         VALUES (?, ?, ?, ?, ?, ?)',
    );
    $stmt->execute([
        $mot,
        $categorie,
        json_encode($phonemes),
        $genre,
        $conjugaison !== null ? json_encode($conjugaison, JSON_UNESCAPED_UNICODE) : null,
        $user['id'],
    ]);

    jsonResponse(201, [
        'id' => (int) $db->lastInsertId(),
        // Permet à l'interface de dire si la conjugaison a pu être générée.
        'conjugaisonGeneree' => $conjugaison !== null,
    ]);
}

if ($method === 'DELETE') {
    if ($user['role'] !== 'teacher') {
        jsonResponse(403, ['error' => 'Réservé à l\'enseignante']);
    }
    $id = (int) ($_GET['id'] ?? 0);
    if ($id <= 0) {
        jsonResponse(400, ['error' => 'id manquant']);
    }
    $stmt = $db->prepare('DELETE FROM lexicon_additions WHERE id = ?');
    $stmt->execute([$id]);
    jsonResponse(200, ['ok' => true]);
}

jsonResponse(405, ['error' => 'Méthode non autorisée']);
