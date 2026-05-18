using System.ComponentModel.DataAnnotations;

namespace WhichToPay.Core.Dtos;

public sealed class MarkPaidDto
{
    [Required]
    public DateOnly PaidPeriod { get; set; }

    [Range(0, 10_000_000)]
    public decimal? BalancePayment { get; set; }
}
