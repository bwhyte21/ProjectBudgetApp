using WhichToPay.Core.Domain;

namespace WhichToPay.Core.Dtos;

public class BillReadDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public decimal MonthlyAmountOwed { get; set; }
    public decimal? TotalBalance { get; set; }
    public DateOnly DueDate { get; set; }
    public BillCategory Category { get; set; }
    public decimal? MinimumPayment { get; set; }
    public DateOnly? LastPaidPeriod { get; set; }
    public DateTime? LastPaidAt { get; set; }

    public static BillReadDto From(Bill bill) => new()
    {
        Id = bill.Id,
        Name = bill.Name,
        MonthlyAmountOwed = bill.MonthlyAmountOwed,
        TotalBalance = bill.TotalBalance,
        DueDate = bill.DueDate,
        Category = bill.Category,
        MinimumPayment = bill.MinimumPayment,
        LastPaidPeriod = bill.LastPaidPeriod,
        LastPaidAt = bill.LastPaidAt
    };
}
