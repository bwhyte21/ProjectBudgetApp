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
            deserialize: bson => DateOnly.ParseExact(bson.AsString, "yyyy-MM-dd", CultureInfo.InvariantCulture));
    }
}
