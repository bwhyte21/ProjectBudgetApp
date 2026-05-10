# Ranking Algorithm Reference

## Goal

Given a list of bills and today's date, the ranking algorithm decides which bill the user should pay first. "First" means the one whose payment most reduces overall financial risk - late fees, principal accumulation, and high-priority obligations like rent or mortgage. The output is the same list of bills, sorted from highest score (pay first) to lowest score (pay last or skip if the budget is tight).

The implementation lives in [backend/src/WhichToPay.Core/Ranking/RankingService.cs](../backend/src/WhichToPay.Core/Ranking/RankingService.cs). All weights are in [backend/src/WhichToPay.Core/Ranking/RankingWeights.cs](../backend/src/WhichToPay.Core/Ranking/RankingWeights.cs).

## The Four Factors

### 1. Urgency (how soon is it due)

- **What it measures:** how close the bill's due day is to today.
- **Why it matters:** a bill due tomorrow is more urgent than one due in 30 days.
- **How it's computed:**
  - Find the next occurrence of `DueDate.Day` on or after today (the day is clamped to the length of the current month so February gets a 28-or-29-day cap).
  - `daysUntilDue = nextDueDate - today` (in days).
  - `urgency = 1 - clamp(daysUntilDue / 31, 0, 1)`.
  - Range: `0.0` (a full month away) to `1.0` (due today).

### 2. Balance impact (how big is the debt)

- **What it measures:** how much principal is sitting unpaid on this bill, normalized so a giant balance does not crush every other factor.
- **Why it matters:** a $5,000 credit-card balance has more long-term impact than a $50 streaming bill, even if both are due tomorrow.
- **How it's computed:**
  - For Loan and CreditCard categories: `log10(1 + balance) / log10(1 + maxBalanceInSet)`. Log scaling prevents one $200,000 mortgage from making everything else look like noise.
  - For all other categories: `monthlyAmountOwed / maxMonthlyInSet` (linear).
  - Range: `0.0` to `1.0`.

### 3. Category weight (a roof matters more than Netflix)

- **What it measures:** how essential the bill type is.
- **Why it matters:** missing rent has bigger consequences than missing a subscription.
- **How it's computed:** lookup table in `RankingWeights.CategoryWeights`.
- **Range:** `0.25` to `1.00`.

### 4. Overdue floor (anything past due jumps to the top)

- **What it measures:** whether today's day-of-month is already past the bill's due day.
- **Why it matters:** late fees compound. An overdue bill should always rank above non-overdue bills regardless of category.
- **How it's computed:** if `today.Day > min(DueDate.Day, daysInThisMonth)`, the bill is overdue and we add `OverdueFloorScore` (default `1000.0`) to its composite score. The floor is large enough that no combination of urgency + balance + category can overcome it.

## The Composite Formula

```text
score = (Urgency*urgency + BalanceImpact*balanceImpact + Category*categoryWeight) * 100
      + (isOverdue ? OverdueFloorScore : 0)
```

Multiplying by 100 keeps the non-overdue range in tens-to-hundreds, well below the overdue floor of 1000.

## Default Weights

| Weight              | Default  | Rationale                                                                     |
| ------------------- | -------- | ----------------------------------------------------------------------------- |
| `Urgency`           | `0.40`   | Highest single factor - missing a due date causes the most immediate harm.    |
| `Category`          | `0.30`   | Second-highest - bill type strongly predicts consequence severity.            |
| `BalanceImpact`     | `0.20`   | Tertiary - debt size matters but should not overshadow urgency on a $50 bill. |
| `OverdueFloorScore` | `1000.0` | Large enough that any overdue bill always sorts above any non-overdue bill.   |

## Category Weight Table

| Category     | Weight | Rationale                                                            |
| ------------ | ------ | -------------------------------------------------------------------- |
| RentMortgage | `1.00` | Eviction or foreclosure is the highest-stakes outcome.               |
| Loan         | `0.85` | Personal/auto/student - missed payments hit credit and add interest. |
| CreditCard   | `0.80` | High APR means missed payments compound fastest.                     |
| Insurance    | `0.65` | Lapsed coverage carries large but conditional risk.                  |
| Utility      | `0.55` | Usually has a grace period, but disconnection is disruptive.         |
| Other        | `0.40` | Conservative middle for unclassified items.                          |
| Subscription | `0.25` | Lowest stakes - service simply turns off.                            |

## Tie-Breakers

When two bills produce the same composite score, the algorithm orders them by:

1. Higher `MonthlyAmountOwed` first.
2. Then alphabetical `Name` (case-insensitive).

These keep the output deterministic even for synthetic inputs.

## Worked Examples

### Example A: 4 typical bills, none overdue

Today is `2026-05-10`. Bills (the day component of each `DueDate` drives the recurring-monthly math):

| Name     | Category     | Monthly | Balance | Due date     |
| -------- | ------------ | ------- | ------- | ------------ |
| Rent     | RentMortgage | $1500   | -       | `2026-06-01` |
| Visa     | CreditCard   | $75     | $3500   | `2026-05-25` |
| Electric | Utility      | $120    | -       | `2026-05-14` |
| Netflix  | Subscription | $15     | -       | `2026-05-20` |

- Rent: next due day is the 1st of next month. ~21 days away. urgency ~ 0.32. category 1.00. balanceImpact 1.00 (max monthly). composite = (0.40 _ 0.32 + 0.30 _ 1.00 + 0.20 _ 1.00) _ 100 = 62.8.
- Visa: due in 15 days. urgency ~ 0.52. category 0.80. balanceImpact 1.00 (only credit card, so max). composite ~ (0.40 _ 0.52 + 0.30 _ 0.80 + 0.20 _ 1.00) _ 100 = 64.8.
- Electric: due in 4 days. urgency ~ 0.87. category 0.55. balanceImpact = 120 / 1500 ~ 0.08. composite ~ (0.40 _ 0.87 + 0.30 _ 0.55 + 0.20 _ 0.08) _ 100 = 52.9.
- Netflix: due in 10 days. urgency ~ 0.68. category 0.25. balanceImpact = 15 / 1500 ~ 0.01. composite ~ (0.40 _ 0.68 + 0.30 _ 0.25 + 0.20 _ 0.01) _ 100 = 35.0.

Sorted: Visa (64.8) -> Rent (62.8) -> Electric (52.9) -> Netflix (35.0). Visa wins because it combines a near due date, a credit-card category, and a real outstanding balance.

### Example B: same 4 bills, but Electric is now overdue

Today is the 20th. Electric was due on the 14th.

- Electric: overdue. composite = base composite + 1000 = ~1052.
- Visa: still ~64.8 (not overdue).
- Rent: still ~62.8.
- Netflix: still ~35.0.

Sorted: Electric (1052) -> Visa (64.8) -> Rent (62.8) -> Netflix (35.0). The overdue floor lifts Electric far above everything, exactly as intended.

### Example C: log scaling for big mortgages

Two credit cards: SmallCard $200 balance, BigCard $8000 balance, both with $100 monthly, both due day 25, today is the 15th.

- maxBalanceInSet = 8000.
- SmallCard balanceImpact = log10(201) / log10(8001) ~ 2.30 / 3.90 ~ 0.59.
- BigCard balanceImpact = log10(8001) / log10(8001) = 1.00.

Without log scaling, SmallCard's 200/8000 = 0.025 - a 40x gap. Log scaling turns it into a 1.7x gap, which still ranks BigCard ahead but does not pretend SmallCard is irrelevant. Useful when the dataset has one very large mortgage and several smaller credit cards.

## Scoring Pipeline (ASCII)

```text
bill ---> [urgency factor]   ---\
     ---> [balance factor]   ----+--> weighted sum --> *100 --> [+ overdue floor] --> score
     ---> [category factor]  ---/
```

## How To Tune

All knobs are in `RankingWeights.cs`. Adjustable behavior:

- **Want urgency to dominate even more?** Raise `Urgency` (e.g. `0.50`) and reduce `Category` and/or `BalanceImpact` so the three top weights still sum to about `0.90`.
- **Care more about debt principal than category?** Bump `BalanceImpact` and lower `Category`.
- **Want overdue items to sit at the top but still be sorted by composite among themselves?** The current design already does this: the overdue floor is added on top of the same composite, so two overdue bills sort by composite, and both still beat any non-overdue bill.
- **Want categories closer together?** Edit the values in `CategoryWeights`. Keep the relative ordering: RentMortgage > Loan > CreditCard > Insurance > Utility > Other > Subscription.

After any change, the unit tests in [backend/tests/WhichToPay.Tests/RankingServiceTests.cs](../backend/tests/WhichToPay.Tests/RankingServiceTests.cs) will tell you whether the behavioral guarantees still hold.

## What This Algorithm Deliberately Does NOT Consider

- **Interest rate (APR).** A higher-APR card is "worse" debt than a lower-APR one. Adding APR could let the algorithm prefer high-APR debt in the avalanche style. v1 omits it to keep the bill form simple.
- **Payment history / partial payments.** The app does not track what has already been paid this month. Each calculation is a fresh snapshot.
- **Pay-cycle alignment.** Income frequency affects monthly take-home (and therefore leftover) but does not influence ranking. The algorithm assumes you decide which bill to pay first; it does not try to align a paycheck with a specific due date.
- **Snowball strategy.** The algorithm favors a "biggest impact first" stance, not the snowball-style "smallest balance first" psychological strategy. If you prefer snowball, sort the ranked output by `MonthlyAmountOwed` ascending in the UI instead.
