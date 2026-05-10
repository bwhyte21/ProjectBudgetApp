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
        var bill = MakeBill("Rent", 1500m, 1, BillCategory.RentMortgage);
        var result = _service.Rank(new[] { bill }, new DateOnly(2026, 5, 1));

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

        var result = _service.Rank(new[] { futureRent, overdueSub }, new DateOnly(2026, 5, 20));

        result[0].Name.Should().Be("LateSub");
        result[0].IsOverdue.Should().BeTrue();
        result[1].Name.Should().Be("FutureRent");
        result[1].IsOverdue.Should().BeFalse();
    }

    [Fact]
    public void Rank_DueDay31InFebruary_ClampedCorrectly()
    {
        var bill = MakeBill("EndMonth", 100m, 31, BillCategory.Utility);
        var feb15 = new DateOnly(2026, 2, 15);

        var result = _service.Rank(new[] { bill }, feb15);

        result.Should().HaveCount(1);
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
}
