using LiteDB;
using WhichToPay.Core.Domain;
using WhichToPay.Core.Persistence;

namespace WhichToPay.Api.Persistence;

public sealed class LiteDbIncomeRepository : IIncomeRepository
{
    private readonly LiteDatabase _db;
    private const string Collection = "income";

    public LiteDbIncomeRepository(LiteDatabase db) => _db = db;

    public Income? Get() =>
        _db.GetCollection<Income>(Collection).FindAll().FirstOrDefault();

    public Income Set(Income income)
    {
        var col = _db.GetCollection<Income>(Collection);
        var existing = col.FindAll().FirstOrDefault();
        if (existing is null)
        {
            col.Insert(income);
        }
        else
        {
            income.Id = existing.Id;
            col.Update(income);
        }
        return income;
    }
}
