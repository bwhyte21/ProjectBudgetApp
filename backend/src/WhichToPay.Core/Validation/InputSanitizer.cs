namespace WhichToPay.Core.Validation;

public static class InputSanitizer
{
    private static readonly string[] Sentinels =
    {
        "<script", "</", "javascript:", "onerror=", "onload=", ";--", "${", "<%", "%>"
    };

    public static (bool Ok, string? Reason) Check(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return (true, null);

        var lower = value.ToLowerInvariant();
        foreach (var s in Sentinels)
        {
            if (lower.Contains(s))
                return (false, $"Input contains disallowed pattern: '{s}'");
        }
        return (true, null);
    }
}
