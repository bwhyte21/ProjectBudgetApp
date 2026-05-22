namespace WhichToPay.Core.Domain;

public sealed class Bill
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = "";
    public decimal MonthlyAmountOwed { get; set; }
    public decimal? TotalBalance { get; set; }
    public DateOnly DueDate { get; set; }
    public int? DueAnchorDay { get; set; }
    public BillCategory Category { get; set; }
    public decimal? MinimumPayment { get; set; }
    public DateOnly? LastPaidPeriod { get; set; }
    public DateTime? LastPaidAt { get; set; }
    public string? Note { get; set; }
}
