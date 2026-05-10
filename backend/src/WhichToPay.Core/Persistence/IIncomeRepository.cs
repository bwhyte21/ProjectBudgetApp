using WhichToPay.Core.Domain;

namespace WhichToPay.Core.Persistence;

public interface IIncomeRepository
{
    Income? Get();
    Income Set(Income income);
}
