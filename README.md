# Ак-Куу — корпоративный лендинг

Статический лендинг ОАО «Ак-Куу», крупнейшего производителя яиц в Кыргызстане.

Фреймворк: **Astro 6** со статической генерацией — весь сайт собирается в плоские HTML/CSS/JS и разворачивается на любом хостинге без Node.js. Форма обратной связи работает через лёгкий PHP-эндпоинт.

---

## Стек

- **Astro 6** (SSG)
- **React 19** — только для интерактивных островов (карусель, 3D-сцена, форма)
- **Tailwind CSS v4** (CSS-first конфиг)
- **GSAP + ScrollTrigger** — скролл-анимации
- **Lenis** — плавный скролл
- **Three.js + @react-three/fiber + drei** — 3D-яйцо в hero
- **Zod + @hcaptcha/react-hcaptcha** — валидация формы и защита от ботов
- **PHP 7.4+** для серверного endpoint'а формы

## Локальная разработка

```bash
# Один раз
pnpm install

# Dev-сервер с hot-reload
pnpm dev

# Сборка продакшена
pnpm build

# Локальный просмотр продакшен-билда
pnpm preview
```

После `pnpm build` готовые файлы лежат в `dist/` — это **полный деплой**, включая PHP-эндпоинт (из `public/api/`).

## Переменные окружения

### На этапе сборки (`.env.local`)

| Переменная | Описание |
|---|---|
| `PUBLIC_HCAPTCHA_SITE_KEY` | Публичный ключ hCaptcha. Оставь пустым, чтобы отключить виджет. |
| `PUBLIC_CONTACT_ENDPOINT` | Путь к PHP-endpoint'у (по умолчанию `/api/contact.php`). |

### На сервере (для `contact.php`)

Задаются в Plesk → **Веб-хостинг → Переменные окружения** (или `SetEnv` в `.htaccess`).

| Переменная | Обязательно | Описание |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | ✅ | Токен Telegram-бота |
| `TELEGRAM_CHAT_ID` | ✅ | ID чата/канала, куда приходят заявки |
| `HCAPTCHA_SECRET_KEY` | опц. | Secret-ключ hCaptcha. Если пусто — капча отключена. |
| `CONTACT_ALLOW_ORIGIN` | опц. | CORS-origin (по умолчанию `https://akkuu.kg`) |
| `CONTACT_RATE_LIMIT_MAX` | опц. | Макс. запросов от одного IP (по умолчанию 5) |
| `CONTACT_RATE_LIMIT_WINDOW` | опц. | Окно rate-limit в секундах (по умолчанию 3600) |

Rate-limit хранится в SQLite-файле `private/rate-limit.sqlite`, который создаётся автоматически на один уровень выше корня сайта (не доступен извне).

## Быстрый деплой на Vercel (preview / временный хостинг)

Подойдёт, пока основной Plesk-хостинг недоступен, или для превью заказчику.

1. Зайди на <https://vercel.com/new> и подключи репозиторий `SpeedrunDi/akkuu-landing`.
2. Vercel сам определит фреймворк (Astro) и подхватит `vercel.json`. Ничего вручную настраивать не нужно.
3. В **Settings → Environment Variables** добавь минимум:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `PUBLIC_CONTACT_ENDPOINT` = `/api/contact` (**без** `.php` — это ключевое отличие от Plesk)
   - (опц.) `PUBLIC_HCAPTCHA_SITE_KEY` + `HCAPTCHA_SECRET_KEY`
4. Нажми **Deploy**. Через ~90 секунд получишь URL вида `akkuu-landing-xxx.vercel.app`.
5. Подключи кастомный домен (если нужно) в **Settings → Domains**.

Форма на Vercel работает через `api/contact.ts` — Node.js serverless-функция, полностью зеркалирующая PHP-версию (та же валидация, honeypot, hCaptcha, Telegram).

⚠️ Rate-limit на Vercel хранится в памяти инстанса (теряется между cold-start'ами). Для продакшена на Vercel лучше подключить Upstash Redis (бесплатный tier). На Plesk рейт-лимит в SQLite работает корректно.

## Деплой на Plesk-хостинг

### 1. Подготовь билд локально

```bash
pnpm install
pnpm build
```

### 2. Залей содержимое `dist/` в корень сайта

Через FTP / Plesk File Manager: скопируй **всё содержимое** папки `dist/` в корневую директорию домена (обычно `httpdocs/`).

Структура на сервере должна выглядеть так:

```
httpdocs/
├── index.html
├── assets/           ← CSS + JS + шрифты
├── images/           ← фото продуктов и фермы
├── api/
│   ├── contact.php
│   └── .htaccess
├── favicon.svg
├── favicon.ico
├── logo.webp
├── robots.txt
├── sitemap-index.xml
└── …
```

### 3. Настрой переменные окружения в Plesk

1. Зайди в Plesk → **Сайты и домены → akkuu.kg → Хостинг и DNS → Веб-хостинг**.
2. Открой **Dedicated PHP settings** или **Variables of environment**.
3. Добавь переменные из таблицы выше (минимум `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`).
4. Сохрани — Plesk перезапустит PHP-FPM автоматически.

Альтернатива: раскомментируй `SetEnv` строки в `api/.htaccess` и вставь значения там.

### 4. Проверь PHP-extensions

В Plesk → **PHP Settings** убедись, что включены:

- `curl` — для запросов к Telegram и hCaptcha API
- `pdo_sqlite` — для rate-limit'а (обычно включён по умолчанию)

### 5. Проверь, что работает

1. Открой `https://akkuu.kg` — должна загрузиться главная.
2. Открой форму, отправь тестовое сообщение → должно прийти в Telegram.
3. В браузере DevTools → Network → `POST /api/contact.php` должен вернуть `{"success": true, ...}`.

## Частые проблемы

**Форма возвращает 500** — скорее всего, не заданы `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`. Проверь логи PHP в Plesk → **Logs → error_log**.

**hCaptcha не появляется** — значит `PUBLIC_HCAPTCHA_SITE_KEY` не был задан на этапе билда. Задай, собери заново (`pnpm build`) и загрузи `dist/`.

**Шрифты не подгружаются** — убедись, что папка `assets/` залита целиком. Все шрифты self-hosted, никаких внешних CDN.

**3D-яйцо не рендерится на мобильном** — WebGL может быть отключён на очень старых устройствах. Страница работает и без него, просто не будет 3D-элемента.

## Контент

Все тексты, продукты, контакты лежат в `src/data/`:

- `src/data/company.ts` — базовая информация, статистика
- `src/data/products.ts` — продуктовая линейка
- `src/data/contacts.ts` — телефоны, email, адрес
- `src/data/content.ts` — стандарты качества, преимущества, меню

После редактирования нужно пересобрать: `pnpm build`.

## Изображения

Все изображения лежат в `public/images/`. Рекомендуется:

- Загружать в формате **WebP** (или AVIF, если есть исходники)
- Для hero-сцены: минимум 1920×1080, желательно 2400×1600
- Для продуктов: квадратные, 1000×1000 минимум, с прозрачным фоном
- Для about: портретные 900×1125 или пейзаж 1600×1000

Плейсхолдер `public/images/about/facility.webp` — перенесён из старого проекта. Рекомендуется заменить на реальное фото производства.

## Структура проекта

```
akkuu-landing/
├── src/
│   ├── components/       ← переиспользуемые Astro-компоненты (Header, иконки, SectionHeader)
│   ├── islands/          ← React-компоненты для client:* гидратации
│   ├── sections/         ← секции главной страницы
│   ├── layouts/          ← базовый Layout.astro с мета/SEO
│   ├── data/             ← контент (тексты, продукты, контакты)
│   ├── lib/              ← утилиты (cn)
│   ├── styles/global.css ← Tailwind + токены дизайн-системы
│   └── pages/index.astro ← главная страница
├── public/
│   ├── api/              ← PHP-endpoint формы
│   ├── images/           ← статические изображения
│   ├── logo.webp         ← фирменный логотип
│   └── favicon*.{svg,ico,png}
├── astro.config.mjs
├── tsconfig.json
└── package.json
```
