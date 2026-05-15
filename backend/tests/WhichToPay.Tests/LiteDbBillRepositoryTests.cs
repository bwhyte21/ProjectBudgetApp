using FluentAssertions;
using LiteDB;
using WhichToPay.Api.Persistence;
using WhichToPay.Core.Domain;
using Xunit;

namespace WhichToPay.Tests;

public class LiteDbBillRepositoryTests
{
    public LiteDbBillRepositoryTests()
    {
        BsonMapperConfig.RegisterDateOnly();
    }

    [Fact]
    public void DueDate_RoundTripsWithoutTimezoneShift()
    {
        using var db = new LiteDatabase(":memory:");
        var repo = new LiteDbBillRepository(db);

        var bill = new Bill
        {
            Name = "LC",
            MonthlyAmountOwed = 2136m,
            DueDate = new DateOnly(2026, 6, 6),
            Category = BillCategory.RentMortgage
        };
        repo.Add(bill);

        var loaded = repo.GetById(bill.Id);

        loaded.Should().NotBeNull();
        loaded!.DueDate.Should().Be(new DateOnly(2026, 6, 6));
    }

    [Fact]
    public void LastPaidPeriod_RoundTripsWithoutTimezoneShift()
    {
        using var db = new LiteDatabase(":memory:");
        var repo = new LiteDbBillRepository(db);

        var bill = new Bill
        {
            Name = "Synchrony",
            MonthlyAmountOwed = 75m,
            DueDate = new DateOnly(2026, 5, 16),
            Category = BillCategory.CreditCard,
            LastPaidPeriod = new DateOnly(2026, 4, 16)
        };
        repo.Add(bill);

        var loaded = repo.GetById(bill.Id);

        loaded!.LastPaidPeriod.Should().Be(new DateOnly(2026, 4, 16));
    }

    [Fact]
    public void MigrateDateOnlyFromUtcDateTime_RecoversOriginalUtcDate()
    {
        using var db = new LiteDatabase(":memory:");

        // Simulate a row written under the previous buggy serializer: a
        // UTC-midnight DateTime. LiteDB returns DateTime as local on read,
        // so the originally-stored calendar day must be recovered by
        // converting back to UTC during migration. The asserted date is
        // therefore the same on any host timezone.
        var raw = db.GetCollection("bills");
        var legacyDoc = new BsonDocument
        {
            ["_id"] = Guid.NewGuid(),
            ["Name"] = "Legacy LC",
            ["MonthlyAmountOwed"] = 2136m,
            ["DueDate"] = new DateTime(2026, 6, 6, 0, 0, 0, DateTimeKind.Utc),
            ["Category"] = (int)BillCategory.RentMortgage
        };
        raw.Insert(legacyDoc);

        var repo = new LiteDbBillRepository(db);

        var loaded = repo.GetById(legacyDoc["_id"].AsGuid);

        loaded!.DueDate.Should().Be(new DateOnly(2026, 6, 6));
    }

    [Fact]
    public void MigrateDateOnlyFromUtcDateTime_IsIdempotent()
    {
        using var db = new LiteDatabase(":memory:");

        var raw = db.GetCollection("bills");
        var legacyDoc = new BsonDocument
        {
            ["_id"] = Guid.NewGuid(),
            ["Name"] = "Legacy LC",
            ["MonthlyAmountOwed"] = 2136m,
            ["DueDate"] = new DateTime(2026, 6, 6, 0, 0, 0, DateTimeKind.Utc),
            ["Category"] = (int)BillCategory.RentMortgage
        };
        raw.Insert(legacyDoc);

        _ = new LiteDbBillRepository(db);
        var afterFirst = new LiteDbBillRepository(db).GetById(legacyDoc["_id"].AsGuid)!.DueDate;
        var afterSecond = new LiteDbBillRepository(db).GetById(legacyDoc["_id"].AsGuid)!.DueDate;

        afterFirst.Should().Be(new DateOnly(2026, 6, 6));
        afterSecond.Should().Be(afterFirst);
    }

    [Fact]
    public void DateOnlyDeserializer_ReadsLegacyBsonDateTime()
    {
        using var db = new LiteDatabase(":memory:");

        // Simulate a row in a collection that has no explicit migration (e.g.
        // income.PayAnchorDate written under the previous serializer): the
        // DateOnly field is stored as BsonType.DateTime rather than a string.
        var raw = db.GetCollection("bills");
        var id = Guid.NewGuid();
        raw.Insert(new BsonDocument
        {
            ["_id"] = id,
            ["Name"] = "Legacy",
            ["MonthlyAmountOwed"] = 10m,
            ["DueDate"] = new DateTime(2026, 6, 6, 0, 0, 0, DateTimeKind.Utc),
            ["Category"] = (int)BillCategory.Other
        });

        // Bypass the migration to assert the deserializer alone tolerates the
        // legacy DateTime form.
        var typed = db.GetCollection<Bill>("bills");
        var loaded = typed.FindById(id);

        loaded.Should().NotBeNull();
        loaded!.DueDate.Should().Be(new DateOnly(2026, 6, 6));
    }
}
