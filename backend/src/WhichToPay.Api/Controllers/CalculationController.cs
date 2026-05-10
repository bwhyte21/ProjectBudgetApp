using Microsoft.AspNetCore.Mvc;
using WhichToPay.Core.Dtos;
using WhichToPay.Core.Persistence;
using WhichToPay.Core.Ranking;

namespace WhichToPay.Api.Controllers;

[ApiController]
[Route("api/calculation")]
public sealed class CalculationController : ControllerBase
{
    private readonly IBillRepository _bills;
    private readonly IIncomeRepository _income;
    private readonly IRankingService _ranking;

    public CalculationController(
        IBillRepository bills,
        IIncomeRepository income,
        IRankingService ranking)
    {
        _bills = bills;
        _income = income;
        _ranking = ranking;
    }

    [HttpPost]
    public ActionResult<CalculationResultDto> Calculate()
    {
        var bills = _bills.GetAll();
        var income = _income.Get();
        var today = DateOnly.FromDateTime(DateTime.Today);

        var ranked = _ranking.Rank(bills, today);
        var totalMonthly = bills.Sum(b => b.MonthlyAmountOwed);
        var monthlyTakeHome = income?.MonthlyTakeHome ?? 0m;

        return Ok(new CalculationResultDto
        {
            MonthlyTakeHome = decimal.Round(monthlyTakeHome, 2),
            TotalMonthlyOwed = decimal.Round(totalMonthly, 2),
            Leftover = decimal.Round(monthlyTakeHome - totalMonthly, 2),
            RankedBills = ranked
        });
    }
}
