# Redux State Reference

## What Redux Is Solving Here

The frontend has four kinds of shared state: bills (a list), income (a singleton), the latest calculation result, and the user's theme preference. Several components read and write the same data - the bill form mutates the list, the ranked view reads it, and editing income should refresh the ranking. Centralizing this in Redux means each component can subscribe to exactly what it needs without prop-drilling and without inventing ad-hoc cross-component event channels.

## Mental Model

1. A component **dispatches an action** (a plain object describing what happened, e.g. "add this bill").
2. A **reducer** in the matching slice computes the next state from the old state plus that action - it is a pure function with no side effects.
3. Components that **subscribe via `useAppSelector`** automatically re-render when their slice of state changes.
4. **Async work** (HTTP calls) goes through `createAsyncThunk`, which dispatches three actions: `pending`, `fulfilled`, and `rejected`. The slice handles each.

## The Four Slices

### 1. billsSlice

- **State:** `{ items: Bill[]; status: 'idle' | 'loading' | 'error'; error?: string }`
- **Thunks:** `fetchBills`, `createBill`, `updateBill`, `deleteBill`
- **Triggered by:** `BillsListPage` mount (fetches), `BillFormDialog` submit (creates or updates), the row delete button.
- **Side effect:** any successful mutation should also dispatch `fetchCalculation` so the ranked view stays in sync. The current code does this in `BillsListPage` after each thunk resolves.
- **Implementation:** [frontend/src/features/bills/billsSlice.ts](../frontend/src/features/bills/billsSlice.ts)

### 2. incomeSlice

- **State:** `{ value: Income | null; status: 'idle' | 'loading' | 'error'; error?: string }`
- **Thunks:** `fetchIncome`, `saveIncome`
- **Triggered by:** `IncomeForm` mount and submit.
- **Side effect:** `saveIncome` success dispatches `fetchCalculation`.
- **Implementation:** [frontend/src/features/income/incomeSlice.ts](../frontend/src/features/income/incomeSlice.ts)

### 3. calculationSlice

- **State:** `{ result: CalculationResult | null; status: 'idle' | 'loading' | 'error'; error?: string }`
- **Thunk:** `fetchCalculation`
- **Triggered by:** the "Recalculate" button explicitly, or automatically after any bill or income mutation.
- **Why a separate slice:** the ranked output depends on the raw bill list and income, but is computed by the backend. Keeping it separate lets the UI distinguish "bills changed" (instant) from "calculation re-ran" (round-trip), and makes it easy to add a "stale" indicator later without touching `billsSlice`.
- **Implementation:** [frontend/src/features/calculation/calculationSlice.ts](../frontend/src/features/calculation/calculationSlice.ts)

### 4. themeSlice

- **State:** `{ mode: 'light' | 'dark' | 'system' }`
- **Reducer:** `setMode`
- **Triggered by:** `ThemeToggle` clicks.
- **Persistence:** the reducer writes the new mode to `localStorage['whichtopay.themeMode']`. The slice's `loadInitialMode()` reads it on app boot, so the user's choice survives reloads. The "System" option always defers to `prefers-color-scheme` at render time via `useMediaQuery`.
- **Implementation:** [frontend/src/theme/themeSlice.ts](../frontend/src/theme/themeSlice.ts)

## Data Flow Diagram

```text
+------------------+     dispatch       +-----------------+
|  React Component | -----------------> |     Thunk       |
|  (e.g. Dialog)   |                    | (createAsyncThk)|
+------------------+                    +--------+--------+
         ^                                       |
         |                                       | fetch('/api/...')
         |                                       v
         |                              +-----------------+
         |                              |   .NET API      |
         |                              | (LiteDB on disk)|
         |                              +--------+--------+
         |                                       |
         |                                       | JSON
         |                                       v
         |                              +-----------------+
         |          subscribe           |   Slice Reducer |
         +----- (useAppSelector) ------ + (pending /      |
                                        |  fulfilled /    |
                                        |  rejected)      |
                                        +-----------------+
```

## Typed Hooks

We use `useAppDispatch` and `useAppSelector` (in [frontend/src/store/hooks.ts](../frontend/src/store/hooks.ts)) instead of the raw `useDispatch` / `useSelector`. These wrappers bake in the store's `RootState` and `AppDispatch` types so every selector and dispatch is type-safe without extra annotations at the call site.

## Status Field Convention

Each async slice uses the same three-state status field:

- `idle` - never fetched, or last fetch finished cleanly. Components should NOT show a spinner.
- `loading` - a request is in flight. Components show a spinner or disable the form.
- `error` - the last request failed. The slice also stores `error?: string` from `action.error.message`.

This pattern matches Redux Toolkit's conventions and keeps the reducer code uniform across slices.

## Worked Example: User Edits a Bill

1. User clicks **Save** in `BillFormDialog`.
2. The dialog's `onSubmit` calls `dispatch(updateBill({ id, input }))`.
3. RTK fires `updateBill.pending`. Nothing visible changes (the form is already disabled via `isSubmitting`).
4. The thunk runs `PUT /api/bills/{id}` via the fetch wrapper.
5. The backend validates the DTO, sanitizes the name, persists to LiteDB, and returns the updated bill.
6. RTK fires `updateBill.fulfilled` with the new bill. The reducer replaces the matching item in `state.items`.
7. `BillsListPage` is subscribed to `state.bills.items`, so the row re-renders.
8. The component then dispatches `fetchCalculation()` to refresh the ranked view.
9. `calculationSlice` cycles through `loading -> idle`, the `result` field updates, and `RankedBillsView` + `LeftoverSummaryCard` re-render with new numbers.

## What Is Deliberately NOT in Redux

- **Form draft state.** `react-hook-form` owns it. Putting drafts in Redux would cause a re-render on every keystroke and add boilerplate for no benefit.
- **MUI dialog open/close.** Local component state via `useState`. It is ephemeral, scoped to one component, and never read elsewhere.
- **Routing.** No router yet - the app is a single page. If we ever add routing, prefer `react-router` over storing the URL in Redux.

Keeping ephemeral UI state out of the store reduces boilerplate, prevents accidental coupling, and minimizes re-renders.
