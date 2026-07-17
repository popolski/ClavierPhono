<?php
// Crée le compte enseignant initial. Protégé par SETUP_TOKEN (défini dans
// config.php, connu de toi seul) — utilisable une seule fois : refuse si un
// compte enseignant existe déjà. Supprime ce fichier (ou renomme-le) une
// fois le compte créé, par précaution supplémentaire.
require_once __DIR__ . '/auth.php';
configureSession();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(405, ['error' => 'Méthode non autorisée']);
}

$body = jsonBody();
$token = (string) ($body['token'] ?? '');
$username = trim((string) ($body['username'] ?? ''));
$motDePasse = (string) ($body['motDePasse'] ?? '');

if (!hash_equals(SETUP_TOKEN, $token)) {
    jsonResponse(403, ['error' => 'Jeton invalide']);
}

$db = getDb();
$existing = $db->query('SELECT COUNT(*) FROM teachers')->fetchColumn();
if ((int) $existing > 0) {
    jsonResponse(409, ['error' => 'Un compte enseignant existe déjà']);
}

if ($username === '' || mb_strlen($username) > 100) {
    jsonResponse(400, ['error' => 'Identifiant invalide']);
}
if (mb_strlen($motDePasse) < 8) {
    jsonResponse(400, ['error' => 'Le mot de passe doit faire au moins 8 caractères']);
}

$hash = password_hash($motDePasse, PASSWORD_DEFAULT);
$stmt = $db->prepare('INSERT INTO teachers (username, password_hash) VALUES (?, ?)');
$stmt->execute([$username, $hash]);

jsonResponse(201, ['ok' => true]);
