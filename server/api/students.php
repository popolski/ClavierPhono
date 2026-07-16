<?php
require_once __DIR__ . '/auth.php';
configureSession();
requireTeacher();

$db = getDb();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $db->query('SELECT id, prenom, created_at FROM students ORDER BY prenom');
    jsonResponse(200, ['students' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    $body = jsonBody();
    $prenom = trim((string) ($body['prenom'] ?? ''));
    $motDePasse = (string) ($body['motDePasse'] ?? '');

    if ($prenom === '' || mb_strlen($prenom) > 100) {
        jsonResponse(400, ['error' => 'Prénom invalide']);
    }
    if (mb_strlen($motDePasse) < 4) {
        jsonResponse(400, ['error' => 'Le mot de passe doit faire au moins 4 caractères']);
    }

    $hash = password_hash($motDePasse, PASSWORD_DEFAULT);
    $stmt = $db->prepare('INSERT INTO students (prenom, password_hash) VALUES (?, ?)');
    $stmt->execute([$prenom, $hash]);

    jsonResponse(201, ['id' => (int) $db->lastInsertId(), 'prenom' => $prenom]);
}

if ($method === 'DELETE') {
    $id = (int) ($_GET['id'] ?? 0);
    if ($id <= 0) {
        jsonResponse(400, ['error' => 'id manquant']);
    }
    $stmt = $db->prepare('DELETE FROM students WHERE id = ?');
    $stmt->execute([$id]);
    jsonResponse(200, ['ok' => true]);
}

jsonResponse(405, ['error' => 'Méthode non autorisée']);
