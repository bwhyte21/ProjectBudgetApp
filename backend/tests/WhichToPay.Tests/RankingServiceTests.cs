using FluentAssertions;
using WhichToPay.Core.Domain;
using WhichToPay.Core.Ranking;
using Xunit;

namespace WhichToPay.Tests;

public class RankingServiceTests
{
    private readonly RankingService _service = new();
    private static readonly DateOnly TodayMid = new(2026, 5, 15);

    private static Bill MakeBill(
        string name,
        decimal monthly,
        int dueDay,
        BillCategory category,
        decimal? totalBalance = null) => new()
        {
            Name = name,
            MonthlyAmountOwed = monthly,
            DueDate = AnchorOn(dueDay),
            Category = category,
            TotalBalance = totalBalance
        };

    private static DateOnly AnchorOn(int day)
    {
        var anchorMonth = new DateOnly(2026, 1, 1);
        var safeDay = Math.Min(day, DateTime.DaysInMonth(anchorMonth.Year, anchorMonth.Month));
        return new DateOnly(anchorMonth.Year, anchorMonth.Month, safeDay);
    }

    [Fact]
    public void Rank_EmptyList_ReturnsEmpty()
    {
        var result = _service.Rank(Array.Empty<Bill>(), TodayMid);
        result.Should().BeEmpty();
    }

    [Fact]
    public void Rank_SingleBill_ScoreReflectsCategoryAndUrgency()
    {
        // Bill anchored Jan 28, today Jan 1 - the bill has not started yet, so it's not overdue.
        var bill = MakeBill("Rent", 1500m, 28, BillCategory.RentMortgage);
        var result = _service.Rank(new[] { bill }, new DateOnly(2026, 1, 1));

        result.Should().HaveCount(1);
        result[0].Score.Should().BeGreaterThan(0);
        result[0].IsOverdue.Should().BeFalse();
    }

    [Fact]
    public void Rank_AllOverdue_AllScoresAboveOverdueFloor()
    {
        var bills = new[]
        {
            MakeBill("A", 50m, 1, BillCategory.Subscription),
            MakeBill("B", 200m, 5, BillCategory.Utility),
            MakeBill("C", 1000m, 10, BillCategory.RentMortgage)
        };
        var today = new DateOnly(2026, 5, 20);

        var result = _service.Rank(bills, today);

        result.Should().HaveCount(3);
        result.Should().OnlyContain(r => r.IsOverdue);
        result.Should().OnlyContain(r => r.Score >= 1000.0);
    }

    [Fact]
    public void Rank_MixedCategories_RentBeatsSubscription_WhenSameDueDay()
    {
        var rent = MakeBill("Rent", 1500m, 20, BillCategory.RentMortgage);
        var netflix = MakeBill("Netflix", 15m, 20, BillCategory.Subscription);

        var result = _service.Rank(new[] { netflix, rent }, TodayMid);

        result[0].Name.Should().Be("Rent");
        result[1].Name.Should().Be("Netflix");
    }

    [Fact]
    public void Rank_LargerCreditCardBalance_OutranksSmaller()
    {
        var big = MakeBill("BigCard", 100m, 25, BillCategory.CreditCard, totalBalance: 8000m);
        var small = MakeBill("SmallCard", 100m, 25, BillCategory.CreditCard, totalBalance: 200m);

        var result = _service.Rank(new[] { small, big }, TodayMid);

        result[0].Name.Should().Be("BigCard");
        result[1].Name.Should().Be("SmallCard");
    }

    [Fact]
    public void Rank_TieBreak_HigherMonthlyAmountFirst()
    {
        var a = MakeBill("Util-A", 50m, 25, BillCategory.Utility);
        var b = MakeBill("Util-B", 200m, 25, BillCategory.Utility);

        var result = _service.Rank(new[] { a, b }, TodayMid);

        result[0].Name.Should().Be("Util-B");
        result[1].Name.Should().Be("Util-A");
    }

    [Fact]
    public void Rank_TieBreak_AlphabeticalNameWhenAmountsEqual()
    {
        var z = MakeBill("Zeta Util", 100m, 25, BillCategory.Utility);
        var a = MakeBill("Alpha Util", 100m, 25, BillCategory.Utility);

        var result = _service.Rank(new[] { z, a }, TodayMid);

        result[0].Name.Should().Be("Alpha Util");
        result[1].Name.Should().Be("Zeta Util");
    }

    [Fact]
    public void Rank_OverdueAlwaysAboveNonOverdue_EvenIfNonOverdueIsRentMortgage()
    {
        var overdueSub = MakeBill("LateSub", 15m, 5, BillCategory.Subscription);
        var futureRent = MakeBill("FutureRent", 1500m, 28, BillCategory.RentMortgage);
        // Today is May 20; rent is due on the 28th and the April cycle was paid - so rent is NOT overdue.
        futureRent.LastPaidPeriod = new DateOnly(2026, 4, 28);

        var result = _service.Rank(new[] { futureRent, overdueSub }, new DateOnly(2026, 5, 20));

        result[0].Name.Should().Be("LateSub");
        result[0].IsOverdue.Should().BeTrue();
        result[1].Name.Should().Be("FutureRent");
        result[1].IsOverdue.Should().BeFalse();
    }

    [Fact]
    public void Rank_DueDay31InFebruary_ClampedAndOverdueAgainstPreviousCycle()
    {
        // Bill anchored Jan 31, today Feb 15. clampedThisMonth = min(31, 28) = 28.
        // today.Day=15 < 28 -> most-recent-cycle = Jan 31. today >= Jan 31, no LastPaidPeriod -> overdue.
        // NextDueDate (the displayed missed date) should be Jan 31.
        var bill = MakeBill("EndMonth", 100m, 31, BillCategory.Utility);
        var feb15 = new DateOnly(2026, 2, 15);

        var result = _service.Rank(new[] { bill }, feb15);

        result.Should().HaveCount(1);
        result[0].IsOverdue.Should().BeTrue();
        result[0].NextDueDate.Should().Be(new DateOnly(2026, 1, 31));
    }

    [Fact]
    public void Rank_MarkedPaidThisCycle_NotOverdue()
    {
        var bill = new Bill
        {
            Name = "PaidThisCycle",
            MonthlyAmountOwed = 50m,
            DueDate = new DateOnly(2026, 4, 12),
            Category = BillCategory.Subscription,
            LastPaidPeriod = new DateOnly(2026, 5, 12)
        };
        var today = new DateOnly(2026, 5, 13);

        var result = _service.Rank(new[] { bill }, today);

        result[0].IsOverdue.Should().BeFalse();
        result[0].NextDueDate.Should().Be(new DateOnly(2026, 6, 12));
    }

    [Fact]
    public void Rank_MarkedPaidLastCycleButNewCycleMissed_Overdue()
    {
        var bill = new Bill
        {
            Name = "PaidLastCycle",
            MonthlyAmountOwed = 50m,
            DueDate = new DateOnly(2026, 4, 12),
            Category = BillCategory.Subscription,
            LastPaidPeriod = new DateOnly(2026, 4, 12)
        };
        var today = new DateOnly(2026, 5, 13);

        var result = _service.Rank(new[] { bill }, today);

        result[0].IsOverdue.Should().BeTrue();
        result[0].NextDueDate.Should().Be(new DateOnly(2026, 5, 12));
    }

    [Fact]
    public void Rank_Overdue_NextDueDateIsMissedDate_NotFutureCycle()
    {
        // Regression for the "Overdue with future date" screenshot bug.
        var bill = new Bill
        {
            Name = "OldRepub",
            MonthlyAmountOwed = 57.08m,
            DueDate = new DateOnly(2026, 4, 12),
            Category = BillCategory.Insurance
        };
        var today = new DateOnly(2026, 5, 13);

        var result = _service.Rank(new[] { bill }, today);

        result[0].IsOverdue.Should().BeTrue();
        result[0].NextDueDate.Should().Be(new DateOnly(2026, 5, 12));
    }

    [Fact]
    public void Rank_NotYetReachedDueDay_NotOverdue()
    {
        var bill = new Bill
        {
            Name = "UpcomingUtil",
            MonthlyAmountOwed = 100m,
            DueDate = new DateOnly(2026, 5, 20),
            Category = BillCategory.Utility
        };
        var today = new DateOnly(2026, 5, 13);

        var result = _service.Rank(new[] { bill }, today);

        result[0].IsOverdue.Should().BeFalse();
        result[0].NextDueDate.Should().Be(new DateOnly(2026, 5, 20));
    }

    [Fact]
    public void Rank_LastPaidPeriodInFuture_DoesNotMakeBillOverdue()
    {
        var bill = new Bill
        {
            Name = "OddInput",
            MonthlyAmountOwed = 50m,
            DueDate = new DateOnly(2026, 4, 12),
            Category = BillCategory.Subscription,
            LastPaidPeriod = new DateOnly(2026, 6, 12)
        };
        var today = new DateOnly(2026, 5, 13);

        var result = _service.Rank(new[] { bill }, today);

        result[0].IsOverdue.Should().BeFalse();
    }

    [Fact]
    public void Rank_OverdueOrderedByCompositeFactors()
    {
        var bills = new[]
        {
            MakeBill("OldSub", 15m, 1, BillCategory.Subscription),
            MakeBill("OldRent", 1500m, 1, BillCategory.RentMortgage)
        };
        var today = new DateOnly(2026, 5, 20);

        var result = _service.Rank(bills, today);

        result[0].Name.Should().Be("OldRent");
        result[1].Name.Should().Be("OldSub");
        result[0].Score.Should().BeGreaterThan(result[1].Score);
    }

    [Fact]
    public void Rank_BillDueInFutureMonth_NotOverdue()
    {
        // Today is May 9; bill due June 2 — must not be overdue even though day 2 < 9
        var bill = new Bill
        {
            Name = "SlvrCrd",
            MonthlyAmountOwed = 273m,
            DueDate = new DateOnly(2026, 6, 2),
            Category = BillCategory.CreditCard
        };
        var today = new DateOnly(2026, 5, 9);

        var result = _service.Rank(new[] { bill }, today);

        result[0].IsOverdue.Should().BeFalse();
        result[0].NextDueDate.Should().Be(new DateOnly(2026, 6, 2));
    }

    [Fact]
    public void Rank_BillDueInFutureMonth_NextDueDateIsInitialDueDate()
    {
        // Today is May 9; bill due June 15 — NextDueDate should be June 15, not May 15
        var bill = new Bill
        {
            Name = "FutureBill",
            MonthlyAmountOwed = 100m,
            DueDate = new DateOnly(2026, 6, 15),
            Category = BillCategory.Utility
        };
        var today = new DateOnly(2026, 5, 9);

        var result = _service.Rank(new[] { bill }, today);

        result[0].IsOverdue.Should().BeFalse();
        result[0].NextDueDate.Should().Be(new DateOnly(2026, 6, 15));
    }

    [Fact]
    public void Rank_MarkedPaidEarly_NextDueDateAdvancesOneMonth()
    {
        // Today is May 13; DueDate = May 18; bill was marked paid early with paidPeriod = May 18.
        // NextDueDate should advance to June 18, not remain at May 18.
        var bill = new Bill
        {
            Name = "BlueCrd",
            MonthlyAmountOwed = 115m,
            DueDate = new DateOnly(2026, 5, 18),
            Category = BillCategory.CreditCard,
            LastPaidPeriod = new DateOnly(2026, 5, 18)
        };
        var today = new DateOnly(2026, 5, 13);

        var result = _service.Rank(new[] { bill }, today);

        result[0].IsOverdue.Should().BeFalse();
        result[0].NextDueDate.Should().Be(new DateOnly(2026, 6, 18));
    }

    [Fact]
    public void Rank_BillDueToday_IsDueTodayNotOverdue()
    {
        var bill = new Bill
        {
            Name = "DueTodayBill",
            MonthlyAmountOwed = 44.70m,
            DueDate = new DateOnly(2026, 5, 14),
            Category = BillCategory.Loan
        };
        var today = new DateOnly(2026, 5, 14);

        var result = _service.Rank(new[] { bill }, today);

        result[0].IsOverdue.Should().BeFalse();
        result[0].IsDueToday.Should().BeTrue();
        result[0].NextDueDate.Should().Be(today);
    }

    [Fact]
    public void Rank_BillDueToday_PaidThisCycle_IsNotDueToday()
    {
        var today = new DateOnly(2026, 5, 14);
        var bill = new Bill
        {
            Name = "PaidDueTodayBill",
            MonthlyAmountOwed = 44.70m,
            DueDate = new DateOnly(2026, 5, 14),
            Category = BillCategory.Loan,
            LastPaidPeriod = today
        };

        var result = _service.Rank(new[] { bill }, today);

        result[0].IsOverdue.Should().BeFalse();
        result[0].IsDueToday.Should().BeFalse();
        result[0].IsPaidCurrentCycle.Should().BeTrue();
    }

    [Fact]
    public void Rank_BillDueYesterday_StillOverdue()
    {
        var bill = new Bill
        {
            Name = "YesterdayBill",
            MonthlyAmountOwed = 100m,
            DueDate = new DateOnly(2026, 5, 13),
            Category = BillCategory.Utility
        };
        var today = new DateOnly(2026, 5, 14);

        var result = _service.Rank(new[] { bill }, today);

        result[0].IsOverdue.Should().BeTrue();
        result[0].IsDueToday.Should().BeFalse();
    }

    [Fact]
    public void Rank_MarkedPaidEarlyFutureMonth_NextDueDateAdvancesBeyondFuture()
    {
        // Today is May 9; DueDate = June 2; bill was marked paid early with paidPeriod = June 2.
        // NextDueDate should advance to July 2.
        var bill = new Bill
        {
            Name = "SlvrCrd",
            MonthlyAmountOwed = 273m,
            DueDate = new DateOnly(2026, 6, 2),
            Category = BillCategory.CreditCard,
            LastPaidPeriod = new DateOnly(2026, 6, 2)
        };
        var today = new DateOnly(2026, 5, 9);

        var result = _service.Rank(new[] { bill }, today);

        result[0].IsOverdue.Should().BeFalse();
        result[0].NextDueDate.Should().Be(new DateOnly(2026, 7, 2));
    }
}
