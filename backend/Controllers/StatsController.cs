using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OltApi.Data;

namespace OltApi.Controllers;

[ApiController, Route("api/stats"), Authorize(Roles = "admin")]
public class StatsController(AppDbContext db) : ControllerBase
{
    static readonly TimeSpan OnlineThreshold = TimeSpan.FromMinutes(5);

    /// GET /api/stats/online — daftar user yang aktif (LastSeenAt < 5 menit).
    [HttpGet("online")]
    public async Task<IActionResult> Online()
    {
        var threshold = DateTime.UtcNow - OnlineThreshold;
        var users = await db.Users
            .Where(u => u.IsActive && u.LastSeenAt != null && u.LastSeenAt > threshold)
            .OrderByDescending(u => u.LastSeenAt)
            .Select(u => new
            {
                u.Id, u.Username, u.FullName, u.Role, u.LastSeenAt,
            })
            .ToListAsync();
        return Ok(users);
    }

    /// GET /api/stats/dashboard — agregat utk halaman Dashboard.
    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        var threshold   = DateTime.UtcNow - OnlineThreshold;
        var todayStart  = DateTime.UtcNow.Date;

        return Ok(new
        {
            totalUsers     = await db.Users.CountAsync(u => u.IsActive),
            onlineUsers    = await db.Users.CountAsync(u =>
                                u.IsActive && u.LastSeenAt != null && u.LastSeenAt > threshold),
            totalDevices   = await db.Devices.CountAsync(d => d.IsActive),
            totalButtons   = await db.Buttons.CountAsync(b => b.IsActive),
            executionsToday= await db.ActivityLogs.CountAsync(l => l.ExecutedAt >= todayStart),
            successRateToday = await SuccessRate(todayStart),
        });
    }

    async Task<double> SuccessRate(DateTime since)
    {
        var total   = await db.ActivityLogs.CountAsync(l => l.ExecutedAt >= since);
        if (total == 0) return 0;
        var success = await db.ActivityLogs.CountAsync(l =>
                          l.ExecutedAt >= since && l.Status == "success");
        return Math.Round((double)success / total * 100, 1);
    }
}
