# KPD — TikTok trends analytics

Стек: NestJS, Angular 22, Optimus UI, PostgreSQL, Docker, nginx.

## Структура

- `backend/` — NestJS API (auth + users)
- `frontend/` — Angular 22 + Optimus UI (login / profile), nginx отдаёт build
- `docker-compose.yml` — web + API + PostgreSQL

## Как поднять

### Вариант 1 — Docker (всё сразу)

```bash
cp .env.example .env
docker compose up --build
```

- UI (nginx): http://localhost  
- API напрямую: http://localhost:4000/api  
- Swagger: http://localhost:4000/api/docs  
- Postgres: `localhost:5432` (user/pass/db: `kpd`)

nginx проксирует `/api` → backend. Порт UI: `UI_PORT` в `.env` (по умолчанию `80`).

Backend в Docker — hot reload (`start:dev`). Frontend в Docker — production build; для live-правок UI см. ниже.

Остановить: `docker compose down`

### Frontend локально (dev)

```bash
docker compose up -d db api
cd frontend
npm install
npm start
```

- UI: http://localhost:4200  
- Proxy `/api` → `http://localhost:4000`

### Вариант 2 — API локально

1. Поднимите Postgres:

```bash
docker compose up -d db
```

Или вручную:

```bash
sudo service postgresql start
sudo -u postgres createuser -s kpd
sudo -u postgres psql -c "ALTER USER kpd WITH PASSWORD 'kpd';"
sudo -u postgres createdb -O kpd kpd
```

2. Запустите API:

```bash
cp backend/.env.example backend/.env
cd backend
npm install
npm run start:dev
```

- API: http://localhost:4000/api  
- Swagger: http://localhost:4000/api/docs  

В Swagger нажми **Authorize** и вставь `accessToken` из `/auth/login` или `/auth/register`.

## Auth API

| Method | Path | Описание |
|--------|------|----------|
| `POST` | `/api/auth/register` | Регистрация |
| `POST` | `/api/auth/login` | Вход |
| `GET` | `/api/users/me` | Текущий пользователь (Bearer JWT) |
| `GET` | `/api/health` | Healthcheck |

### Примеры

```bash
# через nginx
curl -s -X POST http://localhost/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password123","name":"User"}'

# напрямую к API
curl -s -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password123"}'

curl -s http://localhost/api/users/me \
  -H "Authorization: Bearer <accessToken>"
```
