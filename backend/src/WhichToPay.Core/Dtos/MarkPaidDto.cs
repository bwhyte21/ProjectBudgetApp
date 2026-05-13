using System.ComponentModel.DataAnnotations;

namespace WhichToPay.Core.Dtos;

public sealed class MarkPaidDto
{
    [Required]
    public DateOnly PaidPeriod { get; set; }
}
