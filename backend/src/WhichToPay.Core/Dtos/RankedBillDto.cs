namespace WhichToPay.Core.Dtos;

public sealed class RankedBillDto : BillReadDto
{
    public double Score { get; set; }
    public string RankReason { get; set; } = "";
    public bool IsOverdue { get; set; }
    public bool IsDueToday { get; set; }
    public DateOnly NextDueDate { get; set; }
    public bool IsPaidCurrentCycle { get; set; }
}
