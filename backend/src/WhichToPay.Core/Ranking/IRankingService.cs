using WhichToPay.Core.Domain;
using WhichToPay.Core.Dtos;

namespace WhichToPay.Core.Ranking;

public interface IRankingService
{
    IReadOnlyList<RankedBillDto> Rank(
        IEnumerable<Bill> bills,
        DateOnly today,
        RankingWeights? weights = null);
}
