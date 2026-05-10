namespace WhichToPay.Core.Dtos;

public sealed class CalculationResultDto
{
    public decimal MonthlyTakeHome { get; set; }
    public decimal TotalMonthlyOwed { get; set; }
    public decimal Leftover { get; set; }
    public IReadOnlyList<RankedBillDto> RankedBills { get; set; } = Array.Empty<RankedBillDto>();
}
