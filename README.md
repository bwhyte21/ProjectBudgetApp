# Which To Pay - A Personal Budget App

A local-only bill-prioritization web app. Enter your bills and take-home pay, and the app ranks which bills to pay first using a multi-factor weighted score so you avoid late fees and have money left to spend or save.

- **Backend:** .NET 10 Web API + LiteDB (embedded, file-based)
- **Frontend:** React + TypeScript + Vite + Redux Toolkit + shadcn/ui + Tailwind CSS
- **Storage:** local LiteDB file. No cloud, no accounts, no auth.


**Monthly Summary View**

![mainScreen-monthly_new](https://github.com/user-attachments/assets/947e9a21-db81-40a6-85f2-4b67c5cb8dd3)

**Bi-Weekly Summary View**

![mainScreen-biweekly_new](https://github.com/user-attachments/assets/402a3f74-bd9d-4eaf-bd93-e53bfff57983)

**Edit Bills, Add Notes, or Delete Bills!**

![mainScreen-abilities](https://github.com/user-attachments/assets/3681a6c5-9518-4c73-a682-fbc97f6f04f4)
![BillNotesModal_new](https://github.com/user-attachments/assets/9393708b-f695-4d5e-b978-f5b9b4bb0dae)


## Features

- **Bill ranking** - multi-factor weighted score (urgency, balance, category) surfaces which bill to pay first. Bills due today are flagged and always appear at the top of the ranked list.
- **Mark As Paid** - mark a bill paid for the current cycle; the API records the paid period and rolls `DueDate` forward one month (anchored to the original due day, clamped for short months). For bills with a tracked balance, a dialog prompts for the amount paid - Monthly, Minimum, or Other - and the API subtracts it from `TotalBalance` (floored at 0).
- **Pay-anchor date** - enter a payday anchor date alongside your pay frequency (weekly, biweekly, semimonthly, monthly) so the app shows a paycheck-aware pay-period leftover summary.
- **Delete confirmation** - removing a bill requires confirming in a dialog, so a stray click on the trash icon will not wipe a row.
- **Local-only storage** - all data lives in a single LiteDB file on your machine. No accounts, no cloud sync.

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

Runs the xUnit tests for the ranking service, the LiteDB repository, and the bills controller.

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

| Key                         | Default                 | Purpose                           |
| --------------------------- | ----------------------- | --------------------------------- |
| `LiteDb:Path`               | `./data/whichtopay.db`  | Database file location            |
| `Cors:AllowedOrigin`        | `http://localhost:5173` | Allowed frontend origin           |
| `RateLimit:GlobalPerMinute` | `200`                   | Global per-IP request cap         |
| `RateLimit:ApiPerMinute`    | `60`                    | API-controller per-IP request cap |
| `Kestrel:Port`              | `5180`                  | Backend port                      |

Frontend port is `5173` (set in `frontend/vite.config.ts`).
