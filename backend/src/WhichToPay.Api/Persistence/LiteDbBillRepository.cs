using System.Globalization;
using LiteDB;
using WhichToPay.Core.Domain;
using WhichToPay.Core.Persistence;

namespace WhichToPay.Api.Persistence;

public sealed class LiteDbBillRepository : IBillRepository
{
    private readonly LiteDatabase _db;
    private const string Collection = "bills";
    private const string MigrationsCollection = "_migrations";
    private const string DateOnlyShiftFixKey = "DateOnlyUtcShiftFix_v1";

    public LiteDbBillRepository(LiteDatabase db)
    {
        _db = db;
        var col = _db.GetCollection<Bill>(Collection);
        col.EnsureIndex(b => b.Id, unique: true);
        MigrateLegacyDueDayOfMonth();
        MigrateDateOnlyFromUtcDateTime();
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
            doc["DueDate"] = new DateOnly(today.Year, today.Month, clamped)
                .ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            doc.Remove("DueDayOfMonth");
            raw.Update(doc);
        }
    }

    // Repairs rows written under the previous DateOnly serializer, which stored
    // the value as a UTC-midnight DateTime. LiteDB returns DateTime in local on
    // read, so on hosts west of UTC the previous read path produced a date one
    // day earlier than the user originally entered. To recover the intended
    // calendar day on any host, normalize the stored DateTime back to UTC and
    // take its date — that's the value originally written, regardless of the
    // current host timezone. Idempotent via marker doc.
    private void MigrateDateOnlyFromUtcDateTime()
    {
        var meta = _db.GetCollection(MigrationsCollection);
        if (meta.FindById(DateOnlyShiftFixKey) is not null) return;

        var raw = _db.GetCollection(Collection);
        foreach (var doc in raw.FindAll().ToList())
        {
            var changed = NormalizeIfBsonDateTime(doc, "DueDate")
                        | NormalizeIfBsonDateTime(doc, "LastPaidPeriod");
            if (changed) raw.Update(doc);
        }

        meta.Insert(new BsonDocument
        {
            ["_id"] = DateOnlyShiftFixKey,
            ["ranAt"] = DateTime.UtcNow
        });
    }

    private static bool NormalizeIfBsonDateTime(BsonDocument doc, string field)
    {
        if (!doc.ContainsKey(field) || doc[field].IsNull) return false;
        if (doc[field].Type != BsonType.DateTime) return false;
        var utc = doc[field].AsDateTime.ToUniversalTime();
        doc[field] = DateOnly.FromDateTime(utc)
            .ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        return true;
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
