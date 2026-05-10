using WhichToPay.Core.Domain;

namespace WhichToPay.Core.Ranking;

public sealed record RankingWeights(
    double Urgency = 0.40,
    double BalanceImpact = 0.20,
    double Category = 0.30,
    double OverdueFloorScore = 1000.0)
{
    public static readonly IReadOnlyDictionary<BillCategory, double> CategoryWeights =
        new Dictionary<BillCategory, double>
        {
            [BillCategory.RentMortgage] = 1.00,
            [BillCategory.Loan] = 0.85,
            [BillCategory.CreditCard] = 0.80,
            [BillCategory.Insurance] = 0.65,
            [BillCategory.Utility] = 0.55,
            [BillCategory.Other] = 0.40,
            [BillCategory.Subscription] = 0.25
        };

    public static readonly RankingWeights Default = new();
}
