# Which To Pay

A local-only bill-prioritization web app. Enter your bills and take-home pay, and the app ranks which bills to pay first using a multi-factor weighted score so you avoid late fees and have money left to spend or save.

- **Backend:** .NET 10 Web API + LiteDB (embedded, file-based)
- **Frontend:** React + TypeScript + Vite + Redux Toolkit + MUI
- **Storage:** local LiteDB file. No cloud, no accounts, no auth.

<img width="2175" height="898" alt="mainScreenshot" src="https://github.com/user-attachments/assets/167a3bb9-54b1-4f79-8509-3ff5a501018c" />


## Project Layout

```text
ProjectBudgetApp/
  backend/         .NET solution (Api + Core + Tests)
  frontend/        Vite React + TypeScript app
  docs/            Reference docs (ranking algorithm, Redux state)
  README.md
  .gitignore
```

## Prerequisites

- .NET 10 SDK
- Node.js 20 or newer (project tested with Node 22)
- npm 10 or newer

## Run the App

Open **two terminals**.

### Terminal 1 - backend

```text
cd backend
dotnet run --project src/WhichToPay.Api
```

The API listens on `http://localhost:5180`. The LiteDB file is created at `backend/src/WhichToPay.Api/data/whichtopay.db` on first run.

### Terminal 2 - frontend

```text
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in a browser. Vite proxies `/api/*` to the backend.

## Run the Tests

```text
cd backend
dotnet test
```

Runs the xUnit tests for the ranking service. Expect 10 green tests.

## Inspect / Access LiteDB

The data lives in a single file: `backend/src/WhichToPay.Api/data/whichtopay.db`. The path is configurable in `backend/src/WhichToPay.Api/appsettings.json` under `LiteDb:Path`.

**GUI option:** install [LiteDB Studio](https://github.com/mbdavid/LiteDB.Studio) (free, official). Stop the backend first, then open the `.db` file. Browse the `bills` and `income` collections.

**Programmatic option:** any C# script that does `new LiteDatabase(path)` can read the file. The LiteDB Shell is also available.

**IMPORTANT:** the file is locked while the backend is running. Stop the API before opening the file in another tool.

## Backup and Reset

- **Backup:** stop the API, then copy `backend/src/WhichToPay.Api/data/whichtopay.db` somewhere safe.
- **Reset all data:** stop the API, then delete `backend/src/WhichToPay.Api/data/whichtopay.db`. The API recreates an empty file on next startup.

## Reference Docs

- [docs/ranking-algorithm.md](docs/ranking-algorithm.md) - how the ranking math works, with worked examples.
- [docs/redux-state.md](docs/redux-state.md) - frontend state model, slices, and the action -> reducer -> UI loop.

## Security Notes

This app has no user authentication because it is intended for local use only. The backend still applies several defenses:

- Listens on `localhost` only (binds via Kestrel `ListenLocalhost`).
- CORS allowlist permits only `http://localhost:5173`.
- Security headers: `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, plus HSTS in production.
- Rate limiting: global 200 req/min/IP, API 60 req/min/IP, with `429` and `Retry-After` on rejection.
- DataAnnotations validation + an `InputSanitizer` denylist on string fields (defense-in-depth, not the primary defense).
- React auto-escaping prevents stored XSS in the UI.
- LiteDB's typed/parameterized API prevents NoSQL injection.

## Configuration

Backend settings live in `backend/src/WhichToPay.Api/appsettings.json`:

| Key | Default | Purpose |
| --- | --- | --- |
| `LiteDb:Path` | `./data/whichtopay.db` | Database file location |
| `Cors:AllowedOrigin` | `http://localhost:5173` | Allowed frontend origin |
| `RateLimit:GlobalPerMinute` | `200` | Global per-IP request cap |
| `RateLimit:ApiPerMinute` | `60` | API-controller per-IP request cap |
| `Kestrel:Port` | `5180` | Backend port |

Frontend port is `5173` (set in `frontend/vite.config.ts`).
