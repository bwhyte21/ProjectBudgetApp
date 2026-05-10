using WhichToPay.Core.Domain;

namespace WhichToPay.Core.Persistence;

public interface IBillRepository
{
    IReadOnlyList<Bill> GetAll();
    Bill? GetById(Guid id);
    Bill Add(Bill bill);
    bool Update(Bill bill);
    bool Delete(Guid id);
}
