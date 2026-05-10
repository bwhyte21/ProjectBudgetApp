using LiteDB;
using WhichToPay.Core.Domain;
using WhichToPay.Core.Persistence;

namespace WhichToPay.Api.Persistence;

public sealed class LiteDbBillRepository : IBillRepository
{
    private readonly LiteDatabase _db;
    private const string Collection = "bills";

    public LiteDbBillRepository(LiteDatabase db)
    {
        _db = db;
        var col = _db.GetCollection<Bill>(Collection);
        col.EnsureIndex(b => b.Id, unique: true);
        MigrateLegacyDueDayOfMonth();
    }

    private void MigrateLegacyDueDayOfMonth()
    {
        var raw = _db.GetCollection(Collection);
        var today = DateOnly.FromDateTime(DateTime.Today);
        var daysInMonth = DateTime.DaysInMonth(today.Year, today.Month);

        foreach (var doc in raw.FindAll().ToList())
        {
            var hasDueDate = doc.ContainsKey("DueDate") && !doc["DueDate"].IsNull;
            var hasLegacy = doc.ContainsKey("DueDayOfMonth") && !doc["DueDayOfMonth"].IsNull;
            if (hasDueDate || !hasLegacy) continue;

            var legacyDay = doc["DueDayOfMonth"].AsInt32;
            var clamped = Math.Clamp(legacyDay, 1, daysInMonth);
            doc["DueDate"] = new DateTime(today.Year, today.Month, clamped, 0, 0, 0, DateTimeKind.Utc);
            doc.Remove("DueDayOfMonth");
            raw.Update(doc);
        }
    }

    public IReadOnlyList<Bill> GetAll() =>
        _db.GetCollection<Bill>(Collection).FindAll().ToList();

    public Bill? GetById(Guid id) =>
        _db.GetCollection<Bill>(Collection).FindOne(b => b.Id == id);

    public Bill Add(Bill bill)
    {
        _db.GetCollection<Bill>(Collection).Insert(bill);
        return bill;
    }

    public bool Update(Bill bill) =>
        _db.GetCollection<Bill>(Collection).Update(bill);

    public bool Delete(Guid id) =>
        _db.GetCollection<Bill>(Collection).DeleteMany(b => b.Id == id) > 0;
}
