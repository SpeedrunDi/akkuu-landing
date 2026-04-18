<?php
/**
 * Ак-Куу contact form endpoint.
 *
 * Responsibilities:
 *   - Validate POST payload (name, phone, email?, message)
 *   - Honeypot + simple spam heuristics
 *   - Conditional hCaptcha verification
 *   - Rate-limit by client IP (file-based SQLite fallback)
 *   - Forward submission to Telegram Bot API
 *
 * Required environment variables (via .htaccess SetEnv or server config):
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_CHAT_ID
 *   HCAPTCHA_SECRET_KEY (optional; if empty, captcha is skipped)
 *
 * Optional:
 *   CONTACT_ALLOW_ORIGIN (defaults to https://akkuu.kg)
 *   CONTACT_RATE_LIMIT_MAX (default 5)
 *   CONTACT_RATE_LIMIT_WINDOW (default 3600 seconds)
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');

$allowOrigin = getenv('CONTACT_ALLOW_ORIGIN') ?: 'https://akkuu.kg';
header('Access-Control-Allow-Origin: ' . $allowOrigin);
header('Vary: Origin');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept');
    header('Access-Control-Max-Age: 86400');
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['success' => false, 'message' => 'Метод не поддерживается.']);
}

/* ---------- Helpers ---------- */

function respond(int $code, array $payload): void {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function field(string $key, int $max = 1000): string {
    $v = $_POST[$key] ?? '';
    if (!is_string($v)) return '';
    $v = trim($v);
    if (mb_strlen($v) > $max) $v = mb_substr($v, 0, $max);
    return $v;
}

function clientIp(): string {
    $candidates = [
        $_SERVER['HTTP_CF_CONNECTING_IP'] ?? null,
        $_SERVER['HTTP_X_REAL_IP'] ?? null,
        explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '')[0] ?? null,
        $_SERVER['REMOTE_ADDR'] ?? null,
    ];
    foreach ($candidates as $ip) {
        if ($ip && filter_var(trim($ip), FILTER_VALIDATE_IP)) {
            return trim($ip);
        }
    }
    return '0.0.0.0';
}

function rateLimitCheck(string $ip): array {
    $max = (int) (getenv('CONTACT_RATE_LIMIT_MAX') ?: 5);
    $window = (int) (getenv('CONTACT_RATE_LIMIT_WINDOW') ?: 3600);

    $dir = __DIR__ . '/../../private';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    $dbPath = $dir . '/rate-limit.sqlite';

    try {
        $pdo = new PDO('sqlite:' . $dbPath);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->exec('CREATE TABLE IF NOT EXISTS hits (ip TEXT NOT NULL, ts INTEGER NOT NULL)');
        $pdo->exec('CREATE INDEX IF NOT EXISTS idx_hits_ip_ts ON hits (ip, ts)');

        $now = time();
        $cutoff = $now - $window;
        $pdo->prepare('DELETE FROM hits WHERE ts < ?')->execute([$cutoff]);

        $stmt = $pdo->prepare('SELECT COUNT(*) FROM hits WHERE ip = ? AND ts >= ?');
        $stmt->execute([$ip, $cutoff]);
        $count = (int) $stmt->fetchColumn();

        if ($count >= $max) {
            return ['allowed' => false, 'remaining' => 0, 'retryAfter' => $window];
        }

        $pdo->prepare('INSERT INTO hits (ip, ts) VALUES (?, ?)')->execute([$ip, $now]);
        return ['allowed' => true, 'remaining' => $max - $count - 1, 'retryAfter' => 0];
    } catch (Throwable $e) {
        // If SQLite is unavailable, fail open (don't block legit users)
        error_log('[contact] rate-limit error: ' . $e->getMessage());
        return ['allowed' => true, 'remaining' => $max, 'retryAfter' => 0];
    }
}

function verifyHCaptcha(string $token, string $secret, string $ip): bool {
    $ch = curl_init('https://hcaptcha.com/siteverify');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_POSTFIELDS => http_build_query([
            'secret' => $secret,
            'response' => $token,
            'remoteip' => $ip,
        ]),
    ]);
    $resp = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);
    if ($resp === false) {
        error_log('[contact] hCaptcha curl error: ' . $err);
        return false;
    }
    $data = json_decode($resp, true);
    return is_array($data) && !empty($data['success']);
}

function isHighRisk(array $data): bool {
    $text = mb_strtolower($data['name'] . ' ' . $data['message']);
    $keywords = ['casino', 'bitcoin', 'forex', 'crypto', 'viagra', 'loan', 'реклама', 'seo-продвижение', 'http://', 'https://'];
    foreach ($keywords as $kw) {
        if (mb_strpos($text, $kw) !== false) return true;
    }
    if (preg_match('/[\d@#$%^&*()+=\[\]{};:"\\\\|<>\/?]/u', $data['name'])) return true;
    if (mb_strlen($data['message']) < 10) return true;
    return false;
}

function sendTelegram(string $token, string $chatId, string $text): bool {
    $url = 'https://api.telegram.org/bot' . $token . '/sendMessage';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode([
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'HTML',
            'disable_web_page_preview' => true,
        ], JSON_UNESCAPED_UNICODE),
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($resp === false || $code !== 200) {
        error_log('[contact] Telegram error: ' . ($err ?: $resp));
        return false;
    }
    return true;
}

function esc(string $s): string {
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/* ---------- Main flow ---------- */

$ip = clientIp();

// Honeypot — bots tend to fill hidden "website" field
if (!empty($_POST['website'])) {
    respond(200, ['success' => false, 'message' => 'Сообщение отправлено.']);
}

// Rate limit
$rl = rateLimitCheck($ip);
if (!$rl['allowed']) {
    header('Retry-After: ' . $rl['retryAfter']);
    respond(429, [
        'success' => false,
        'message' => 'Слишком много запросов. Попробуйте через час.',
    ]);
}

$data = [
    'name' => field('name', 60),
    'phone' => field('phone', 25),
    'email' => field('email', 120),
    'message' => field('message', 2000),
];

// Validation
$errors = [];
if (mb_strlen($data['name']) < 2) $errors['name'] = 'Укажите имя';
if (mb_strlen($data['phone']) < 10) $errors['phone'] = 'Укажите телефон';
if (mb_strlen($data['message']) < 10) $errors['message'] = 'Сообщение минимум 10 символов';
if ($data['email'] !== '' && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Неверный email';
}

if (!empty($errors)) {
    respond(422, [
        'success' => false,
        'message' => 'Пожалуйста, исправьте ошибки в форме.',
        'errors' => $errors,
    ]);
}

// Captcha (only when suspicious or always if token provided)
$captchaToken = field('hcaptcha-token', 2000);
$hcaptchaSecret = getenv('HCAPTCHA_SECRET_KEY') ?: '';
$suspicious = isHighRisk($data);

if ($hcaptchaSecret) {
    if ($captchaToken) {
        if (!verifyHCaptcha($captchaToken, $hcaptchaSecret, $ip)) {
            respond(400, ['success' => false, 'message' => 'Проверка безопасности не пройдена.']);
        }
    } elseif ($suspicious) {
        respond(400, ['success' => false, 'needsCaptcha' => true, 'message' => 'Пройдите проверку безопасности.']);
    }
}

// Telegram
$botToken = getenv('TELEGRAM_BOT_TOKEN') ?: '';
$chatId = getenv('TELEGRAM_CHAT_ID') ?: '';

if (!$botToken || !$chatId) {
    error_log('[contact] Telegram credentials missing');
    respond(500, ['success' => false, 'message' => 'Сервис временно недоступен. Попробуйте позже или позвоните.']);
}

$localTime = (new DateTimeImmutable('now', new DateTimeZone('Asia/Bishkek')))->format('d.m.Y H:i');

$text = "🔔 <b>Новое сообщение с сайта Ак-Куу</b>\n\n"
      . "👤 <b>Имя:</b> " . esc($data['name']) . "\n"
      . "📱 <b>Телефон:</b> " . esc($data['phone']) . "\n"
      . "📧 <b>Email:</b> " . ($data['email'] !== '' ? esc($data['email']) : 'Не указан') . "\n\n"
      . "💬 <b>Сообщение:</b>\n" . esc($data['message']) . "\n\n"
      . "⏰ <b>Время (Бишкек):</b> " . esc($localTime) . "\n"
      . "🌐 <b>IP:</b> <code>" . esc($ip) . "</code>";

if (!sendTelegram($botToken, $chatId, $text)) {
    respond(502, ['success' => false, 'message' => 'Не удалось отправить сообщение. Пожалуйста, позвоните нам.']);
}

respond(200, [
    'success' => true,
    'message' => 'Спасибо за ваше сообщение! Мы свяжемся с вами в ближайшее время.',
]);
