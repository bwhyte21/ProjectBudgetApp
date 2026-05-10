namespace WhichToPay.Api.Middleware;

public sealed class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;
    private readonly bool _isProduction;

    public SecurityHeadersMiddleware(RequestDelegate next, IHostEnvironment env)
    {
        _next = next;
        _isProduction = env.IsProduction();
    }

    public async Task InvokeAsync(HttpContext ctx)
    {
        var headers = ctx.Response.Headers;
        headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'";
        headers["X-Content-Type-Options"] = "nosniff";
        headers["X-Frame-Options"] = "DENY";
        headers["Referrer-Policy"] = "no-referrer";
        if (_isProduction)
        {
            headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains";
        }
        await _next(ctx);
    }
}

public static class SecurityHeadersMiddlewareExtensions
{
    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app) =>
        app.UseMiddleware<SecurityHeadersMiddleware>();
}
