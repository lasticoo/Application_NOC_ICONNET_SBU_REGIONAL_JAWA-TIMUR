// Services/LastSeenMiddleware.cs
//
// Update kolom Users.LastSeenAt setiap request authorized.
// Throttle: hanya update kalau LastSeenAt > 60 detik lalu, supaya tidak DB-spam.

using Microsoft.EntityFrameworkCore;
using OltApi.Data;

namespace OltApi.Services;

public class LastSeenMiddleware(RequestDelegate next)
{
    static readonly TimeSpan Throttle = TimeSpan.FromSeconds(60);
    static readonly Dictionary<int, DateTime> _cache = new();
    static readonly object _lock = new();

    public async Task Invoke(HttpContext ctx, AppDbContext db)
    {
        if (ctx.User.Identity?.IsAuthenticated == true)
        {
            var idClaim = ctx.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(idClaim, out var uid))
            {
                var now = DateTime.UtcNow;
                bool shouldUpdate;
                lock (_lock)
                {
                    shouldUpdate = !_cache.TryGetValue(uid, out var last) || now - last > Throttle;
                    if (shouldUpdate) _cache[uid] = now;
                }
                if (shouldUpdate)
                {
                    // fire-and-forget — execute update tanpa load entity
                    await db.Users.Where(u => u.Id == uid)
                                  .ExecuteUpdateAsync(s => s.SetProperty(u => u.LastSeenAt, now));
                }
            }
        }
        await next(ctx);
    }
}

public static class LastSeenMiddlewareExtensions
{
    public static IApplicationBuilder UseLastSeenTracking(this IApplicationBuilder app) =>
        app.UseMiddleware<LastSeenMiddleware>();
}
