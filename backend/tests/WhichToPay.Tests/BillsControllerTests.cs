using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using WhichToPay.Api.Controllers;
using WhichToPay.Core.Domain;
using WhichToPay.Core.Dtos;
using WhichToPay.Core.Persistence;

namespace WhichToPay.Tests;

public class BillsControllerTests
{
    private sealed class FakeBillRepository : IBillRepository
    {
        private readonly Dictionary<Guid, Bill> _store = new();

        public IReadOnlyList<Bill> GetAll() => _store.Values.ToList();
        public Bill? GetById(Guid id) => _store.TryGetValue(id, out var b) ? b : null;
        public Bill Add(Bill bill) { _store[bill.Id] = bill; return bill; }
        public bool Update(Bill bill) { _store[bill.Id] = bill; return true; }
        public bool Delete(Guid id) => _store.Remove(id);
    }

    private static (BillsController controller, FakeBillRepository repo, Bill bill) Setup(
        decimal? totalBalance,
        decimal? minimumPayment = null)
    {
        var repo = new FakeBillRepository();
        var bill = new Bill
        {
            Name = "Garmin Intl",
            MonthlyAmountOwed = 87.80m,
            TotalBalance = totalBalance,
            DueDate = new DateOnly(2026, 5, 25),
            Category = BillCategory.Loan,
            MinimumPayment = minimumPayment
        };
        repo.Add(bill);
        return (new BillsController(repo), repo, bill);
    }

    [Fact]
    public void MarkPaid_WithBalancePayment_SubtractsFromTotalBalance()
    {
        var (controller, _, bill) = Setup(totalBalance: 438.99m);
        var dto = new MarkPaidDto { PaidPeriod = new DateOnly(2026, 5, 25), BalancePayment = 87.80m };

        var result = controller.MarkPaid(bill.Id, dto);

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var read = ok.Value.Should().BeOfType<BillReadDto>().Subject;
        read.TotalBalance.Should().Be(351.19m);
        read.LastPaidPeriod.Should().Be(dto.PaidPeriod);
        read.LastPaidAt.Should().NotBeNull();
        read.DueDate.Should().Be(new DateOnly(2026, 6, 25));
    }

    [Fact]
    public void MarkPaid_AdvancesDueDateOneMonthPastPaidPeriod()
    {
        var (controller, _, bill) = Setup(totalBalance: null);
        var dto = new MarkPaidDto { PaidPeriod = new DateOnly(2026, 5, 25) };

        var result = controller.MarkPaid(bill.Id, dto);

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var read = ok.Value.Should().BeOfType<BillReadDto>().Subject;
        read.DueDate.Should().Be(new DateOnly(2026, 6, 25));
    }

    [Fact]
    public void MarkPaid_ShortMonthClampsDueDateToLastDay()
    {
        var repo = new FakeBillRepository();
        var bill = new Bill
        {
            Name = "EndOfMonth",
            MonthlyAmountOwed = 50m,
            DueDate = new DateOnly(2026, 1, 31),
            Category = BillCategory.Utility
        };
        repo.Add(bill);
        var controller = new BillsController(repo);
        var dto = new MarkPaidDto { PaidPeriod = new DateOnly(2026, 1, 31) };

        var result = controller.MarkPaid(bill.Id, dto);

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var read = ok.Value.Should().BeOfType<BillReadDto>().Subject;
        read.DueDate.Should().Be(new DateOnly(2026, 2, 28));
    }

    [Fact]
    public void MarkPaid_PreservesAnchorDay_AcrossShortMonths()
    {
        var repo = new FakeBillRepository();
        var bill = new Bill
        {
            Name = "EndOfMonth",
            MonthlyAmountOwed = 50m,
            DueDate = new DateOnly(2026, 1, 31),
            DueAnchorDay = 31,
            Category = BillCategory.Utility
        };
        repo.Add(bill);
        var controller = new BillsController(repo);

        var first = controller.MarkPaid(bill.Id, new MarkPaidDto { PaidPeriod = new DateOnly(2026, 1, 31) });
        var firstRead = ((OkObjectResult)first.Result!).Value.Should().BeOfType<BillReadDto>().Subject;
        firstRead.DueDate.Should().Be(new DateOnly(2026, 2, 28));
        firstRead.DueAnchorDay.Should().Be(31);

        var second = controller.MarkPaid(bill.Id, new MarkPaidDto { PaidPeriod = new DateOnly(2026, 2, 28) });
        var secondRead = ((OkObjectResult)second.Result!).Value.Should().BeOfType<BillReadDto>().Subject;
        secondRead.DueDate.Should().Be(new DateOnly(2026, 3, 31));
        secondRead.DueAnchorDay.Should().Be(31);

        var third = controller.MarkPaid(bill.Id, new MarkPaidDto { PaidPeriod = new DateOnly(2026, 3, 31) });
        var thirdRead = ((OkObjectResult)third.Result!).Value.Should().BeOfType<BillReadDto>().Subject;
        thirdRead.DueDate.Should().Be(new DateOnly(2026, 4, 30));
        thirdRead.DueAnchorDay.Should().Be(31);
    }

    [Fact]
    public void MarkPaid_WithBalancePaymentGreaterThanBalance_FloorsAtZero()
    {
        var (controller, _, bill) = Setup(totalBalance: 50m);
        var dto = new MarkPaidDto { PaidPeriod = new DateOnly(2026, 5, 25), BalancePayment = 200m };

        var result = controller.MarkPaid(bill.Id, dto);

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var read = ok.Value.Should().BeOfType<BillReadDto>().Subject;
        read.TotalBalance.Should().Be(0m);
    }

    [Fact]
    public void MarkPaid_WithoutBalancePayment_LeavesTotalBalanceUnchanged()
    {
        var (controller, _, bill) = Setup(totalBalance: 438.99m);
        var dto = new MarkPaidDto { PaidPeriod = new DateOnly(2026, 5, 25) };

        var result = controller.MarkPaid(bill.Id, dto);

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var read = ok.Value.Should().BeOfType<BillReadDto>().Subject;
        read.TotalBalance.Should().Be(438.99m);
        read.LastPaidPeriod.Should().Be(dto.PaidPeriod);
        read.LastPaidAt.Should().NotBeNull();
    }

    [Fact]
    public void MarkPaid_BalancePaymentOnNullBalance_LeavesBalanceNull()
    {
        var (controller, _, bill) = Setup(totalBalance: null);
        var dto = new MarkPaidDto { PaidPeriod = new DateOnly(2026, 5, 25), BalancePayment = 100m };

        var result = controller.MarkPaid(bill.Id, dto);

        var ok = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var read = ok.Value.Should().BeOfType<BillReadDto>().Subject;
        read.TotalBalance.Should().BeNull();
        read.LastPaidPeriod.Should().Be(dto.PaidPeriod);
        read.LastPaidAt.Should().NotBeNull();
    }
}
