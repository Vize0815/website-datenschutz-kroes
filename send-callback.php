<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
    exit;
}

// Honeypot — wenn ausgefüllt, lautlos "Erfolg" zurückgeben
if (!empty($_POST['website'] ?? '')) {
    echo json_encode(['ok' => true]);
    exit;
}

$name    = trim((string)($_POST['name']    ?? ''));
$company = trim((string)($_POST['company'] ?? ''));
$phone   = trim((string)($_POST['phone']   ?? ''));

if ($name === '' || $company === '' || $phone === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'missing_fields']);
    exit;
}

if (mb_strlen($name) > 120 || mb_strlen($company) > 200 || mb_strlen($phone) > 60) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'invalid_length']);
    exit;
}

// Header-Injection-Schutz: keine CR/LF in Eingaben
foreach ([$name, $company, $phone] as $v) {
    if (preg_match('/[\r\n]/', $v)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'invalid_input']);
        exit;
    }
}

$to      = 'info@datenschutz-kroes.at';
$subject = 'Neue Rückruf-Anfrage von ' . $name;

$body  = "Neue Rückruf-Anfrage über die Website\r\n";
$body .= "----------------------------------------\r\n\r\n";
$body .= "Name:         {$name}\r\n";
$body .= "Unternehmen:  {$company}\r\n";
$body .= "Telefon:      {$phone}\r\n\r\n";
$body .= "Eingegangen:  " . date('d.m.Y H:i') . " Uhr\r\n";
$body .= "IP:           " . ($_SERVER['REMOTE_ADDR'] ?? 'unbekannt') . "\r\n";

// IONOS verlangt eine echte Mailbox als Absender → dieselbe wie Empfänger.
$fromAddr = $to;

$headers   = [];
$headers[] = 'From: =?UTF-8?B?' . base64_encode('Datenschutz Kroes Website') . '?= <' . $fromAddr . '>';
$headers[] = 'Reply-To: ' . $fromAddr;
$headers[] = 'X-Mailer: PHP/' . phpversion();
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-Type: text/plain; charset=UTF-8';

// -f setzt den Envelope-Sender; auf IONOS oft Pflicht
$ok = @mail(
    $to,
    '=?UTF-8?B?' . base64_encode($subject) . '?=',
    $body,
    implode("\r\n", $headers),
    '-f' . $fromAddr
);

if (!$ok) {
    $err = error_get_last();
    http_response_code(500);
    echo json_encode([
        'ok'    => false,
        'error' => 'mail_failed',
        'detail'=> $err['message'] ?? 'unknown',
    ]);
    exit;
}

echo json_encode(['ok' => true]);
