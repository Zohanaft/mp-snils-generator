# SNILS Generator

## Шаблоны и переменные окружения

Проект использует шаблоны и собирает сайт в отдельную публичную директорию:

- `index.template.html` -> `public/index.html`
- `robots.template.txt` -> `public/robots.txt`
- `src/tailwind.css` -> `public/tailwind.css`

Важно: публиковать нужно только содержимое папки `public`.  
`.env`, шаблоны и скрипты остаются вне web-root и не доступны извне.

Переменные задаются в `.env`:

- `METRICS_ENABLED` - `true` или `false`
- `YANDEX_METRIKA_ID` - ID счетчика Яндекс.Метрики
- `SITE_URL` - полный URL сайта, например `https://mysite.ru`

Шаблон подставляет:

- код Яндекс.Метрики в `<head>` и `<noscript>`
- `canonical`, `og:url`, `schema url`
- `Sitemap` в `robots.txt`

## Быстрый старт

1. Скопируйте `.env.example` в `.env`.
2. Укажите реальные значения.
3. Сгенерируйте публичные файлы:

```bash
npm run build
```
