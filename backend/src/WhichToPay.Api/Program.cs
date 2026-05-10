using System.Threading.RateLimiting;
using LiteDB;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.RateLimiting;
using WhichToPay.Api.Middleware;
using WhichToPay.Api.Persistence;
using WhichToPay.Core.Persistence;
using WhichToPay.Core.Ranking;

var builder = WebApplication.CreateBuilder(args);

var port = builder.Configuration.GetValue<int>("Kestrel:Port", 5180);
builder.WebHost.ConfigureKestrel(o => o.ListenLocalhost(port));

var dbPath = builder.Configuration.GetValue<string>("LiteDb:Path") ?? "./data/whichtopay.db";
var dbDir = Path.GetDirectoryName(Path.GetFullPath(dbPath));
if (!string.IsNullOrEmpty(dbDir))
    Directory.CreateDirectory(dbDir);

BsonMapper.Global.RegisterType<DateOnly>(
    serialize: d => new BsonValue(d.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc)),
    deserialize: bson => DateOnly.FromDateTime(bson.AsDateTime));

builder.Services.AddSingleton<LiteDatabase>(_ => new LiteDatabase(dbPath));
builder.Services.AddScoped<IBillRepository, LiteDbBillRepository>();
builder.Services.AddScoped<IIncomeRepository, LiteDbIncomeRepository>();
builder.Services.AddSingleton<IRankingService, RankingService>();

var allowedOrigin = builder.Configuration.GetValue<string>("Cors:AllowedOrigin")
                    ?? "http://localhost:5173";
builder.Services.AddCors(o => o.AddPolicy("frontend", p => p
    .WithOrigins(allowedOrigin)
    .WithMethods("GET", "POST", "PUT", "DELETE")
    .WithHeaders("Content-Type")));

var globalLimit = builder.Configuration.GetValue<int>("RateLimit:GlobalPerMinute", 200);
var apiLimit = builder.Configuration.GetValue<int>("RateLimit:ApiPerMinute", 60);

builder.Services.AddRateLimiter(opts =>
{
    opts.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    opts.OnRejected = async (ctx, ct) =>
    {
        ctx.HttpContext.Response.Headers["Retry-After"] = "60";
        await ctx.HttpContext.Response.WriteAsync("Too many requests", ct);
    };

    opts.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(http =>
        RateLimitPartition.GetFixedWindowLimiter(
            http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = globalLimit,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));

    opts.AddPolicy("api", http =>
        RateLimitPartition.GetFixedWindowLimiter(
            http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = apiLimit,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
});

builder.Services.AddControllers();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseExceptionHandler(errApp =>
    {
        errApp.Run(async ctx =>
        {
            ctx.Response.StatusCode = StatusCodes.Status500InternalServerError;
            ctx.Response.ContentType = "application/json";
            await ctx.Response.WriteAsync("{\"error\":\"An unexpected error occurred.\"}");
        });
    });
}

app.UseSecurityHeaders();
app.UseCors("frontend");
app.UseRateLimiter();
app.UseRouting();

app.MapControllers().RequireRateLimiting("api");

app.Run();
