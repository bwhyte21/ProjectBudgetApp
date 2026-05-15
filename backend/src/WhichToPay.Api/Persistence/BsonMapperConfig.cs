using System.Globalization;
using LiteDB;

namespace WhichToPay.Api.Persistence;

public static class BsonMapperConfig
{
    private static int _registered;

    public static void RegisterDateOnly()
    {
        if (Interlocked.Exchange(ref _registered, 1) == 1) return;

        BsonMapper.Global.RegisterType<DateOnly>(
            serialize: d => new BsonValue(d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)),
            deserialize: DeserializeDateOnly);
    }

    // Tolerates both the new ISO-string form and the legacy BsonType.DateTime
    // form written before the explicit DateOnly serializer was registered.
    // Legacy DateTime values are normalized via ToUniversalTime() to recover
    // the originally-stored UTC calendar day on any host timezone.
    private static DateOnly DeserializeDateOnly(BsonValue bson) => bson.Type switch
    {
        BsonType.String => DateOnly.ParseExact(bson.AsString, "yyyy-MM-dd", CultureInfo.InvariantCulture),
        BsonType.DateTime => DateOnly.FromDateTime(bson.AsDateTime.ToUniversalTime()),
        _ => throw new LiteException(0, $"Cannot deserialize DateOnly from BsonType {bson.Type}.")
    };
}
