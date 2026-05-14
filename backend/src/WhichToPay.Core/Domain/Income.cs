namespace WhichToPay.Core.Domain;

public sealed class Income
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public decimal PerPaycheckAmount { get; set; }
    public PayFrequency Frequency { get; set; }
    public DateOnly? PayAnchorDate { get; set; }

    public decimal MonthlyTakeHome => Frequency switch
    {
        PayFrequency.Weekly => PerPaycheckAmount * 52m / 12m,
        PayFrequency.Biweekly => PerPaycheckAmount * 26m / 12m,
        PayFrequency.Semimonthly => PerPaycheckAmount * 2m,
        PayFrequency.Monthly => PerPaycheckAmount,
        _ => 0m
    };
}
