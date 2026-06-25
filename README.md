# IT.TECH.SUPP

IT.TECH.SUPP — полнофункциональная система обработки заявок технической поддержки для образовательного учреждения.

## Технологии

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MySQL 8
- Reverse proxy / static hosting: Nginx
- Deployment: Docker Compose

## Структура проекта

- `frontend/` — клиентское приложение
- `backend/` — API и работа с базой данных
- `nginx/` — конфигурация веб-сервера
- `docker-compose.yml` — запуск всех сервисов

## Быстрый старт

1. Скопируйте переменные окружения:
   ```bash
   cp .env.example .env
   ```
2. Запустите приложение:
   ```bash
   docker-compose up --build
   ```
3. Откройте в браузере `http://localhost`.

## Доступ по умолчанию

- Администратор: `admin` / `admin123`
- Преподаватель: `teacher` / `admin123`

## Backend API

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
- `GET/POST /api/tickets`
- `GET/PUT/DELETE /api/tickets/:id`
- `GET/POST /api/tickets/:ticketId/comments`
- `GET/POST /api/tickets/:ticketId/attachments`
- `GET /api/tickets/:ticketId/attachments/download/:attachmentId`
- `GET/POST/PUT/DELETE /api/users`
- `POST /api/users/:id/reset-password`
- `GET /api/reports/stats`
- `GET /api/reports/monthly`
- `GET /api/reports/by-category`
- `GET /api/reports/export/pdf`
- `GET /api/reports/export/excel`

## Особенности

- JWT-аутентификация и разграничение ролей
- Создание заявок, комментарии и вложения
- Админ-панель с фильтрами, аналитикой и экспортами
- Светлый интерфейс преподавателя и тёмный интерфейс администратора
- Автоматический seed пользователей при первом запуске

## Локальная разработка без Docker

### Backend
```bash
cd backend
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Для локальной разработки убедитесь, что MySQL доступен и параметры подключения соответствуют `backend/src/config/database.js`.
