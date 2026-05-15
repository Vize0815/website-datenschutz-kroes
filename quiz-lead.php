<?php
declare(strict_types=1);

/**
 * NIS-2 Quiz Lead Endpoint
 * Empfängt JSON-POST aus index.html und schickt eine Benachrichtigung
 * an info@datenschutz-kroes.at via PHP mail().
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

// Diagnose-Logger
$LOG_FILE = __DIR__ . '/quiz-lead.log';
$logIt = static function (string $msg) use ($LOG_FILE): void {
    @file_put_contents(
        $LOG_FILE,
        '[' . date('Y-m-d H:i:s') . '] ' . $msg . PHP_EOL,
        FILE_APPEND
    );
};
$logIt('--- Anfrage: ' . $_SERVER['REQUEST_METHOD'] . ' ' . ($_SERVER['REQUEST_URI'] ?? '') .
       ' von ' . ($_SERVER['REMOTE_ADDR'] ?? '?'));

// GET-Test-Modus: ?test=1 schickt eine Test-Mail OHNE Formulardaten.
// Aufruf: https://datenschutz-kroes.at/quiz-lead.php?test=1
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['test'])) {
    $testTo      = 'info@datenschutz-kroes.at';
    $testFrom    = 'info@datenschutz-kroes.at';
    $testSubject = '=?UTF-8?B?' . base64_encode('NIS-2 Quiz: TEST-MAIL ' . date('H:i:s')) . '?=';
    $testBody    = "Dies ist eine Test-Mail aus quiz-lead.php.\r\n" .
                   "Zeitpunkt: " . date('d.m.Y H:i:s') . "\r\n" .
                   "PHP-Version: " . PHP_VERSION . "\r\n" .
                   "Server: " . ($_SERVER['SERVER_SOFTWARE'] ?? '?') . "\r\n" .
                   "Wenn diese Mail ankommt, funktioniert mail() grundsätzlich.\r\n";
    $testHeaders = implode("\r\n", [
        'From: NIS-2 Quiz Test <' . $testFrom . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'X-Mailer: datenschutz-kroes.at',
    ]);
    $testOk = @mail($testTo, $testSubject, $testBody, $testHeaders, '-f' . $testFrom);
    $logIt('TEST-MAIL: mail() returned ' . ($testOk ? 'TRUE' : 'FALSE'));
    if (!$testOk) {
        $err = error_get_last();
        $logIt('TEST-MAIL last_error=' . ($err ? json_encode($err) : 'none'));
    }
    echo json_encode([
        'ok'         => $testOk,
        'mode'       => 'test',
        'php'        => PHP_VERSION,
        'sapi'       => PHP_SAPI,
        'to'         => $testTo,
        'mail_func'  => function_exists('mail') ? 'available' : 'missing',
        'last_error' => error_get_last(),
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method']);
    exit;
}

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'json']);
    exit;
}

// Honeypot — Bot-Erkennung (Feld 'website' ist im Formular versteckt)
if (!empty($data['website'])) {
    echo json_encode(['ok' => true]);
    exit;
}

// Header-Injection-sicherer Sanitizer (entfernt CR/LF/NUL)
$clean = static function ($v): string {
    $v = (string)$v;
    $v = str_replace(["\r", "\n", "\0"], '', $v);
    return trim($v);
};

$name = $clean($data['name'] ?? '');
if ($name === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'name']);
    exit;
}

$email      = $clean($data['email']   ?? '');
$firma      = $clean($data['firma']   ?? '');
$branche    = $clean($data['branche'] ?? '');
$telefon    = $clean($data['telefon'] ?? '');
$newsletter = !empty($data['newsletter']);

$verdictTitle = $clean($data['verdictTitle'] ?? '');
$verdictLabel = $clean($data['verdictLabel'] ?? '');
$verdictKey   = $clean($data['verdictKey']   ?? '');

$answers = is_array($data['answers'] ?? null) ? $data['answers'] : [];

$to      = 'info@datenschutz-kroes.at';
$subjTxt = 'NIS-2 Quiz: ' . ($verdictTitle !== '' ? $verdictTitle : 'neuer Lead')
         . ' – ' . ($firma !== '' ? $firma : $name);
$subject = '=?UTF-8?B?' . base64_encode($subjTxt) . '?=';

$lines = [];
$lines[] = '=== NEUER NIS-2 QUIZ LEAD ===';
$lines[] = '';
$lines[] = 'Datum:        ' . date('d.m.Y H:i') . ' Uhr';
$lines[] = '';
$lines[] = '— Kontakt —';
$lines[] = 'Name:         ' . $name;
$lines[] = 'E-Mail:       ' . ($email !== '' ? $email : '—');
$lines[] = 'Firma:        ' . ($firma !== '' ? $firma : '—');
$lines[] = 'Branche:      ' . ($branche !== '' ? $branche : '—');
$lines[] = 'Telefon:      ' . ($telefon !== '' ? $telefon : '—');
$lines[] = 'Newsletter:   ' . ($newsletter ? 'JA – bitte in Verteiler aufnehmen' : 'nein');
$lines[] = '';
$lines[] = '— Quiz-Ergebnis —';
$lines[] = 'Einstufung:   ' . ($verdictLabel !== '' ? $verdictLabel : '—');
$lines[] = 'Verdict:      ' . ($verdictTitle !== '' ? $verdictTitle : '—')
                            . ($verdictKey !== '' ? ' (' . $verdictKey . ')' : '');
$lines[] = '';
$lines[] = '— Antworten —';
$lines[] = 'Sektor:       ' . ($clean($answers['sektor']      ?? '') ?: '—');
$lines[] = 'Mitarbeiter:  ' . ($clean($answers['mitarbeiter'] ?? '') ?: '—');
$lines[] = 'Umsatz:       ' . ($clean($answers['umsatz']      ?? '') ?: '—');
$lines[] = 'Lieferkette:  ' . ($clean($answers['lieferkette'] ?? '') ?: '—');

$sonderArr = is_array($answers['sonderfall'] ?? null) ? $answers['sonderfall'] : [];
$sonderClean = array_values(array_filter(array_map($clean, $sonderArr), static fn($v) => $v !== ''));
$lines[] = 'Sonderfall:   ' . (empty($sonderClean) ? '—' : implode(', ', $sonderClean));

$lines[] = '';
$lines[] = '---';
$lines[] = 'Diese E-Mail wurde automatisch durch das NIS-2 Selbsttest-Quiz auf';
$lines[] = 'datenschutz-kroes.at erzeugt. Die Auswertung im PDF des Besuchers';
$lines[] = 'entspricht dieser Einstufung.';

$body = implode("\r\n", $lines);

$fromAddr  = 'info@datenschutz-kroes.at';
$headers   = [];
$headers[] = 'From: NIS-2 Quiz <' . $fromAddr . '>';
if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $headers[] = 'Reply-To: ' . $email;
}
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'Content-Type: text/plain; charset=UTF-8';
$headers[] = 'Content-Transfer-Encoding: 8bit';
$headers[] = 'X-Mailer: datenschutz-kroes.at';

// 5. Parameter setzt den Envelope-Sender (-f). IONOS lehnt mail() sonst oft still ab.
$ok = @mail(
    $to,
    $subject,
    $body,
    implode("\r\n", $headers),
    '-f' . $fromAddr
);

$logIt('POST von ' . ($name !== '' ? $name : '?') . ' / ' . ($email !== '' ? $email : '?') .
       ' — mail() returned ' . ($ok ? 'TRUE' : 'FALSE'));

if (!$ok) {
    $err = error_get_last();
    $logIt('mail() FAILED. last_error=' . ($err ? json_encode($err) : 'none'));
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'mail']);
    exit;
}

echo json_encode(['ok' => true]);
