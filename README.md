# KPD — TikTok trends analytics

Стек: NestJS, Angular 22, Optimus UI, PostgreSQL, Docker.

## Структура

- `backend/` — NestJS API (auth + users)
- `frontend/` — Angular (позже)
- `docker-compose.yml` — API + PostgreSQL

## Как поднять

### Вариант 1 — Docker (API + Postgres, hot reload)

Нужен установленный Docker.

```bash
cp .env.example .env
docker compose up --build
```

Исходники `backend/src` смонтированы в контейнер: Nest работает в `start:dev` (`--watch`), правки в коде подхватываются без ручной пересборки образа.

Если меняешь `package.json` / lockfile:

```bash
docker compose up --build --watch
```

- API: http://localhost:4000/api  
- Swagger: http://localhost:4000/api/docs  
- Postgres: `localhost:5432` (user/pass/db: `kpd`)

Остановить: `docker compose down`

### Вариант 2 — локально (dev)

1. Поднимите Postgres (Docker только БД или свой инстанс):

```bash
docker compose up -d db
```

Если Docker нет — создайте БД вручную:

```bash
sudo service postgresql start
sudo -u postgres createuser -s kpd   # или: createuser / createdb
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
# Register
curl -s -X POST http://localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password123","name":"User"}'

# Login
curl -s -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password123"}'

# Me
curl -s http://localhost:4000/api/users/me \
  -H "Authorization: Bearer <accessToken>"
```
