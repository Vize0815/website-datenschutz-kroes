<?php
declare(strict_types=1);

/**
 * Rückruf Endpoint
 * Empfängt das Rückruf Formular der Startseite (FormData POST)
 * und schickt die Anfrage per PHP mail() an info@datenschutz-kroes.at.
 * Verarbeitung ausschließlich auf dem IONOS Webspace, keine Speicherung,
 * kein Logging personenbezogener Daten.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

$respond = static function (int $code, array $payload): void {
    http_response_code($code);
    echo json_encode($payload);
    exit;
};

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    $respond(405, ['ok' => false, 'error' => 'method']);
}

// Nur Anfragen von der eigenen Website annehmen
$origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
if ($origin !== '' && !preg_match('#^https://(www\.)?datenschutz-kroes\.at$#', $origin)) {
    $respond(403, ['ok' => false, 'error' => 'origin']);
}

// Honeypot: unsichtbares Feld "website", nur Bots füllen es aus
if (!empty($_POST['website'])) {
    $respond(200, ['ok' => true]);
}

// Entfernt CR, LF und NUL (Schutz vor Header Injection) und begrenzt die Länge
$clean = static function (string $key, int $max): string {
    $v = (string)($_POST[$key] ?? '');
    $v = str_replace(["\r", "\n", "\0"], ' ', $v);
    return mb_substr(trim($v), 0, $max);
};

$name    = $clean('name', 100);
$company = $clean('company', 200);
$phone   = $clean('phone', 50);

if ($name === '' || $company === '' || $phone === '') {
    $respond(400, ['ok' => false, 'error' => 'missing']);
}
if (!preg_match('/^[0-9+()\/ .\-]{5,50}$/', $phone)) {
    $respond(400, ['ok' => false, 'error' => 'phone']);
}

$to   = 'info@datenschutz-kroes.at';
$from = 'info@datenschutz-kroes.at';

$subject = '=?UTF-8?B?' . base64_encode('Neue Rückruf-Anfrage: ' . $company) . '?=';

$body = implode("\r\n", [
    '=== NEUE RÜCKRUF-ANFRAGE ===',
    '',
    'Datum:        ' . date('d.m.Y H:i') . ' Uhr',
    'Name:         ' . $name,
    'Unternehmen:  ' . $company,
    'Telefon:      ' . $phone,
    '',
    '---',
    'Diese E-Mail wurde automatisch über das Rückruf-Formular auf datenschutz-kroes.at erzeugt.',
]);

$headers = implode("\r\n", [
    'From: =?UTF-8?B?' . base64_encode('Rückruf Datenschutz Kroes') . '?= <' . $from . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: datenschutz-kroes.at',
]);

// Envelope Sender (-f) setzen, sonst lehnt IONOS mail() oft still ab
$ok = @mail($to, $subject, $body, $headers, '-f' . $from);

if (!$ok) {
    $respond(500, ['ok' => false, 'error' => 'mail']);
}
$respond(200, ['ok' => true]);
