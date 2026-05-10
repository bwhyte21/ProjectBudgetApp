using WhichToPay.Core.Domain;
using WhichToPay.Core.Dtos;

namespace WhichToPay.Core.Ranking;

public sealed class RankingService : IRankingService
{
    public IReadOnlyList<RankedBillDto> Rank(
        IEnumerable<Bill> bills,
        DateOnly today,
        RankingWeights? weights = null)
    {
        var w = weights ?? RankingWeights.Default;
        var list = bills.ToList();
        if (list.Count == 0)
            return Array.Empty<RankedBillDto>();

        var maxBalance = list
            .Where(b => b.Category is BillCategory.Loan or BillCategory.CreditCard)
            .Select(b => (double)(b.TotalBalance ?? b.MonthlyAmountOwed))
            .DefaultIfEmpty(0.0)
            .Max();

        var maxMonthly = list
            .Select(b => (double)b.MonthlyAmountOwed)
            .DefaultIfEmpty(0.0)
            .Max();

        var ranked = list.Select(b => Score(b, today, w, maxBalance, maxMonthly)).ToList();

        return ranked
            .OrderByDescending(r => r.Score)
            .ThenByDescending(r => r.MonthlyAmountOwed)
            .ThenBy(r => r.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static RankedBillDto Score(
        Bill bill,
        DateOnly today,
        RankingWeights w,
        double maxBalance,
        double maxMonthly)
    {
        var nextDue = NextDueDate(today, bill.DueDate);
        var daysUntilDue = (nextDue.DayNumber - today.DayNumber);
        var urgency = 1.0 - Math.Clamp(daysUntilDue / 31.0, 0.0, 1.0);

        var isOverdue = today >= bill.DueDate
            && today.Day > Math.Min(bill.DueDate.Day, DateTime.DaysInMonth(today.Year, today.Month));

        double balanceImpact;
        if (bill.Category is BillCategory.Loan or BillCategory.CreditCard)
        {
            var balance = (double)(bill.TotalBalance ?? bill.MonthlyAmountOwed);
            balanceImpact = maxBalance > 0
                ? Math.Log10(1 + balance) / Math.Log10(1 + maxBalance)
                : 0.0;
        }
        else
        {
            balanceImpact = maxMonthly > 0
                ? (double)bill.MonthlyAmountOwed / maxMonthly
                : 0.0;
        }

        var categoryWeight = RankingWeights.CategoryWeights.TryGetValue(bill.Category, out var cw) ? cw : 0.4;

        var composite = (w.Urgency * urgency
                       + w.BalanceImpact * balanceImpact
                       + w.Category * categoryWeight) * 100.0;

        var score = composite + (isOverdue ? w.OverdueFloorScore : 0.0);

        var reason = BuildReason(isOverdue, urgency, balanceImpact, categoryWeight, w);

        return new RankedBillDto
        {
            Id = bill.Id,
            Name = bill.Name,
            MonthlyAmountOwed = bill.MonthlyAmountOwed,
            TotalBalance = bill.TotalBalance,
            DueDate = bill.DueDate,
            Category = bill.Category,
            MinimumPayment = bill.MinimumPayment,
            Score = Math.Round(score, 2),
            RankReason = reason,
            IsOverdue = isOverdue,
            NextDueDate = nextDue
        };
    }

    private static DateOnly NextDueDate(DateOnly today, DateOnly dueDate)
    {
        if (today < dueDate)
            return dueDate;

        var dueDayOfMonth = dueDate.Day;
        var daysThisMonth = DateTime.DaysInMonth(today.Year, today.Month);
        var clampedThisMonth = Math.Min(dueDayOfMonth, daysThisMonth);

        if (today.Day <= clampedThisMonth)
            return new DateOnly(today.Year, today.Month, clampedThisMonth);

        var nextMonth = today.AddMonths(1);
        var daysNextMonth = DateTime.DaysInMonth(nextMonth.Year, nextMonth.Month);
        var clampedNextMonth = Math.Min(dueDayOfMonth, daysNextMonth);
        return new DateOnly(nextMonth.Year, nextMonth.Month, clampedNextMonth);
    }

    private static string BuildReason(bool isOverdue, double urgency, double balance, double category, RankingWeights w)
    {
        if (isOverdue)
            return "Overdue - pay immediately to avoid late fees";

        var factors = new[]
        {
            ("urgency", w.Urgency * urgency),
            ("balance", w.BalanceImpact * balance),
            ("category", w.Category * category)
        };
        var dominant = factors.OrderByDescending(f => f.Item2).First().Item1;

        return dominant switch
        {
            "urgency" => "Due soon",
            "balance" => "Large outstanding balance",
            "category" => "High-priority category",
            _ => ""
        };
    }
}
