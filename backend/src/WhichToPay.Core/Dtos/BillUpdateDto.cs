using System.ComponentModel.DataAnnotations;
using WhichToPay.Core.Domain;

namespace WhichToPay.Core.Dtos;

public sealed class BillUpdateDto
{
    [Required, StringLength(80)]
    public string Name { get; set; } = "";

    [Range(0.01, 1_000_000)]
    public decimal MonthlyAmountOwed { get; set; }

    [Range(0, 10_000_000)]
    public decimal? TotalBalance { get; set; }

    [Required]
    public DateOnly DueDate { get; set; }

    [Required]
    public BillCategory Category { get; set; }

    [Range(0, 1_000_000)]
    public decimal? MinimumPayment { get; set; }
}
