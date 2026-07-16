<?php
require_once __DIR__ . '/auth.php';
configureSession();

$_SESSION = [];
session_destroy();

jsonResponse(200, ['ok' => true]);
