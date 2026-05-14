using System.ComponentModel.DataAnnotations;
using WhichToPay.Core.Domain;

namespace WhichToPay.Core.Dtos;

public sealed class IncomeDto
{
    [Range(0.01, 1_000_000)]
    public decimal PerPaycheckAmount { get; set; }

    [Required]
    public PayFrequency Frequency { get; set; }

    public decimal MonthlyTakeHome { get; set; }

    public DateOnly? PayAnchorDate { get; set; }

    public static IncomeDto From(Income income) => new()
    {
        PerPaycheckAmount = income.PerPaycheckAmount,
        Frequency = income.Frequency,
        MonthlyTakeHome = income.MonthlyTakeHome,
        PayAnchorDate = income.PayAnchorDate
    };
}
