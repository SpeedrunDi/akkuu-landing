/**
 * Vercel serverless mirror of public/api/contact.php.
 *
 * Runtime: Node.js 20 (Vercel default).
 *
 * Required env vars (set in Vercel Project Settings → Environment Variables):
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_CHAT_ID
 *   HCAPTCHA_SECRET_KEY  (optional; if empty, captcha is skipped)
 *   CONTACT_ALLOW_ORIGIN (optional; defaults to request origin)
 *   CONTACT_RATE_LIMIT_MAX    (default 5)
 *   CONTACT_RATE_LIMIT_WINDOW (default 3600 seconds)
 *
 * NOTE on rate-limit persistence:
 *   Vercel serverless functions don't share memory between cold starts and
 *   different regions. The in-memory Map below rate-limits per-instance only —
 *   good enough to slow down bots, not bulletproof. For production-grade
 *   rate-limiting, wire this up to Upstash Redis (free tier).
 */

type Body = {
  name: string;
  phone: string;
  email: string;
  message: string;
  'hcaptcha-token'?: string;
  website?: string;
};

type Incoming = {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  socket?: { remoteAddress?: string };
};

type Outgoing = {
  status: (code: number) => Outgoing;
  setHeader: (name: string, value: string) => Outgoing;
  json: (value: unknown) => void;
  end: (chunk?: string) => void;
};

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const SPAM_KEYWORDS = [
  'casino', 'bitcoin', 'forex', 'crypto', 'viagra', 'loan',
  'реклама', 'seo-продвижение', 'http://', 'https://',
];

function field(body: unknown, key: keyof Body, max = 1000): string {
  if (!body || typeof body !== 'object') return '';
  const v = (body as Record<string, unknown>)[key];
  if (typeof v !== 'string') return '';
  const trimmed = v.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function clientIp(req: Incoming): string {
  const xff = req.headers['x-forwarded-for'];
  const real = req.headers['x-real-ip'];
  const candidates: string[] = [];
  if (typeof xff === 'string') candidates.push(xff.split(',')[0].trim());
  if (Array.isArray(xff)) candidates.push(String(xff[0] ?? '').split(',')[0].trim());
  if (typeof real === 'string') candidates.push(real);
  if (req.socket?.remoteAddress) candidates.push(req.socket.remoteAddress);
  for (const ip of candidates) {
    if (ip && /^[0-9a-f.:]+$/i.test(ip)) return ip;
  }
  return '0.0.0.0';
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const max = Number(process.env.CONTACT_RATE_LIMIT_MAX ?? 5);
  const window = Number(process.env.CONTACT_RATE_LIMIT_WINDOW ?? 3600) * 1000;
  const now = Date.now();

  // Evict expired entries occasionally
  if (rateLimitStore.size > 500) {
    for (const [k, v] of rateLimitStore) {
      if (v.resetAt < now) rateLimitStore.delete(k);
    }
  }

  const entry = rateLimitStore.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + window });
    return { allowed: true, retryAfter: 0 };
  }
  if (entry.count >= max) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { allowed: true, retryAfter: 0 };
}

async function verifyHCaptcha(token: string, secret: string, ip: string): Promise<boolean> {
  try {
    const res = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (e) {
    console.error('[contact] hCaptcha error:', e);
    return false;
  }
}

function isHighRisk(data: Body): boolean {
  const text = `${data.name} ${data.message}`.toLowerCase();
  if (SPAM_KEYWORDS.some((kw) => text.includes(kw))) return true;
  if (/[\d@#$%^&*()+=[\]{};:"\\|<>/?]/.test(data.name)) return true;
  if (data.message.length < 10) return true;
  return false;
}

async function sendTelegram(token: string, chatId: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error('[contact] Telegram error:', res.status, await res.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (e) {
    console.error('[contact] Telegram network error:', e);
    return false;
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function handler(req: Incoming, res: Outgoing): Promise<void> {
  const allowOrigin = process.env.CONTACT_ALLOW_ORIGIN || (req.headers.origin as string) || '*';
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Метод не поддерживается.' });
    return;
  }

  const ip = clientIp(req);

  // Honeypot
  if (field(req.body, 'website', 500)) {
    res.status(200).json({ success: false, message: 'Сообщение отправлено.' });
    return;
  }

  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    res.status(429).json({ success: false, message: 'Слишком много запросов. Попробуйте через час.' });
    return;
  }

  const data: Body = {
    name: field(req.body, 'name', 60),
    phone: field(req.body, 'phone', 25),
    email: field(req.body, 'email', 120),
    message: field(req.body, 'message', 2000),
  };

  const errors: Partial<Record<keyof Body, string>> = {};
  if (data.name.length < 2) errors.name = 'Укажите имя';
  if (data.phone.length < 10) errors.phone = 'Укажите телефон';
  if (data.message.length < 10) errors.message = 'Сообщение минимум 10 символов';
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Неверный email';
  }

  if (Object.keys(errors).length > 0) {
    res.status(422).json({
      success: false,
      message: 'Пожалуйста, исправьте ошибки в форме.',
      errors,
    });
    return;
  }

  const hcaptchaSecret = process.env.HCAPTCHA_SECRET_KEY || '';
  const captchaToken = field(req.body, 'hcaptcha-token', 2000);
  const suspicious = isHighRisk(data);

  if (hcaptchaSecret) {
    if (captchaToken) {
      if (!(await verifyHCaptcha(captchaToken, hcaptchaSecret, ip))) {
        res.status(400).json({ success: false, message: 'Проверка безопасности не пройдена.' });
        return;
      }
    } else if (suspicious) {
      res.status(400).json({
        success: false,
        needsCaptcha: true,
        message: 'Пройдите проверку безопасности.',
      });
      return;
    }
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
  const chatId = process.env.TELEGRAM_CHAT_ID || '';

  if (!botToken || !chatId) {
    console.error('[contact] Telegram credentials missing');
    res.status(500).json({
      success: false,
      message: 'Сервис временно недоступен. Попробуйте позже или позвоните.',
    });
    return;
  }

  const localTime = new Date().toLocaleString('ru-RU', {
    timeZone: 'Asia/Bishkek',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const text =
    `🔔 <b>Новое сообщение с сайта Ак-Куу</b>\n\n` +
    `👤 <b>Имя:</b> ${esc(data.name)}\n` +
    `📱 <b>Телефон:</b> ${esc(data.phone)}\n` +
    `📧 <b>Email:</b> ${data.email ? esc(data.email) : 'Не указан'}\n\n` +
    `💬 <b>Сообщение:</b>\n${esc(data.message)}\n\n` +
    `⏰ <b>Время (Бишкек):</b> ${esc(localTime)}\n` +
    `🌐 <b>IP:</b> <code>${esc(ip)}</code>`;

  const sent = await sendTelegram(botToken, chatId, text);
  if (!sent) {
    res.status(502).json({ success: false, message: 'Не удалось отправить сообщение. Пожалуйста, позвоните нам.' });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Спасибо за ваше сообщение! Мы свяжемся с вами в ближайшее время.',
  });
}
