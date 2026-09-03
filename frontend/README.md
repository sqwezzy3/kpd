# KPD Frontend

Angular 22 + Optimus UI.

## Docker (nginx)

Из корня репозитория:

```bash
docker compose up --build web
```

nginx отдаёт production-сборку и проксирует `/api` на сервис `api`.

- UI: http://localhost (`UI_PORT`, по умолчанию 80)

## Локальный dev

```bash
npm install
npm start
```

- UI: http://localhost:4200  
- Proxy `/api` → `http://localhost:4000`

## Структура

```
src/app/
  core/
    guards/
    interceptors/
    models/
    pages/
      login/
      profile/
    services/
    utils/
  layout/
  shared/theme/
Dockerfile
nginx.conf
```
