<?php
header('Content-Type: application/json');
echo json_encode([
    'status' => 'ok',
    'php' => phpversion(),
    'file' => __FILE__,
    'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'not set'
]);
