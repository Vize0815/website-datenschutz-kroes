<?php
declare(strict_types=1);

/**
 * Seminar Anfrage Endpoint
 * Empfängt das Anfrageformular der Seminarseiten (FormData POST)
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

// Honeypot: unsichtbares Feld, nur Bots füllen es aus
if (!empty($_POST['botcheck'])) {
    $respond(200, ['ok' => true]);
}

// Entfernt CR, LF und NUL (Schutz vor Header Injection) und begrenzt die Länge
$clean = static function (string $key, int $max = 200): string {
    $v = (string)($_POST[$key] ?? '');
    $v = str_replace(["\r", "\n", "\0"], ' ', $v);
    return mb_substr(trim($v), 0, $max);
};
// Für den Freitext: Zeilenumbrüche erlaubt, nur NUL entfernt
$cleanText = static function (string $key, int $max = 5000): string {
    $v = str_replace("\0", '', (string)($_POST[$key] ?? ''));
    return mb_substr(trim($v), 0, $max);
};

$seminare = [
    'NIS2 Schulung Österreich',
    'NIS2 Schulung Deutschland',
];
$seminar = $clean('seminar');
if (!in_array($seminar, $seminare, true)) {
    $respond(400, ['ok' => false, 'error' => 'seminar']);
}

$f = [
    'anrede'     => $clean('anrede', 20),
    'titel'      => $clean('titel', 50),
    'vorname'    => $clean('vorname', 100),
    'nachname'   => $clean('nachname', 100),
    'firma'      => $clean('firma', 200),
    'email'      => $clean('email', 200),
    'website'    => $clean('website', 200),
    'telefon'    => $clean('telefon', 50),
    'teilnehmer' => $clean('teilnehmer', 30),
    'ort'        => $clean('ort', 100),
    'termin'     => $clean('termin', 100),
];
$nachricht = $cleanText('nachricht');

foreach (['anrede', 'vorname', 'nachname', 'firma', 'email', 'telefon', 'teilnehmer', 'ort', 'termin'] as $pflicht) {
    if ($f[$pflicht] === '') {
        $respond(400, ['ok' => false, 'error' => 'missing']);
    }
}
if (!filter_var($f['email'], FILTER_VALIDATE_EMAIL)) {
    $respond(400, ['ok' => false, 'error' => 'email']);
}
if (mb_strlen($nachricht) < 10 || empty($_POST['consent'])) {
    $respond(400, ['ok' => false, 'error' => 'missing']);
}

$to   = 'info@datenschutz-kroes.at';
$from = 'info@datenschutz-kroes.at';

$subjTxt = 'Neue Seminaranfrage: ' . $seminar . ' – ' . $f['firma'];
$subject = '=?UTF-8?B?' . base64_encode($subjTxt) . '?=';

$dash  = static fn(string $v): string => $v !== '' ? $v : '—';
$lines = [
    '=== NEUE SEMINARANFRAGE ===',
    '',
    'Seminar:      ' . $seminar,
    'Datum:        ' . date('d.m.Y H:i') . ' Uhr',
    '',
    '— Kontakt —',
    'Anrede:       ' . $f['anrede'],
    'Titel:        ' . $dash($f['titel']),
    'Name:         ' . $f['vorname'] . ' ' . $f['nachname'],
    'Firma:        ' . $f['firma'],
    'E-Mail:       ' . $f['email'],
    'Website:      ' . $dash($f['website']),
    'Telefon:      ' . $f['telefon'],
    '',
    '— Seminar —',
    'Teilnehmer:   ' . $f['teilnehmer'],
    'Ort:          ' . $f['ort'],
    'Termin:       ' . $f['termin'],
    '',
    '— Anforderungen und Ziele —',
    $nachricht,
    '',
    '---',
    'Einwilligung zur Speicherung der Anfrage wurde im Formular erteilt.',
    'Diese E-Mail wurde automatisch über das Anfrageformular auf datenschutz-kroes.at erzeugt.',
];
$body = str_replace("\n", "\r\n", str_replace("\r\n", "\n", implode("\n", $lines)));

$headers = implode("\r\n", [
    'From: Seminaranfrage Datenschutz Kroes <' . $from . '>',
    'Reply-To: ' . $f['email'],
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
