using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OltApi.Data;
using OltApi.DTOs;
using OltApi.Services;

namespace OltApi.Controllers;

[ApiController, Route("api/logs"), Authorize]
public class LogsController(AppDbContext db) : ControllerBase
{
    // ── GET /api/logs/my — log milik sendiri ──────────────────────────────────
    [HttpGet("my")]
    public async Task<IActionResult> MyLogs([FromQuery] int limit = 50)
    {
        var uid = User.GetUserId();
        return Ok(await GetLogs(uid, null, Math.Min(limit, 200)));
    }

    // ── GET /api/logs — semua log (admin only) ────────────────────────────────
    [HttpGet, Authorize(Roles = "admin")]
    public async Task<IActionResult> AllLogs(
        [FromQuery] int? userId,
        [FromQuery] int? deviceId,
        [FromQuery] int  limit = 100)
        => Ok(await GetLogs(userId, deviceId, Math.Min(limit, 500)));

    // ── GET /api/logs/today — aktivitas hari ini (admin only) ─────────────────
    [HttpGet("today"), Authorize(Roles = "admin")]
    public async Task<IActionResult> TodayActivity()
    {
        var today = DateTime.UtcNow.Date;
        var logs  = await db.ActivityLogs
            .Include(l => l.User)
            .Include(l => l.Device)
            .Include(l => l.Button)
            .Where(l => l.ExecutedAt >= today)
            .OrderByDescending(l => l.ExecutedAt)
            .Take(200)
            .ToListAsync();

        return Ok(logs.Select(MapLog));
    }

    // ── Helper ────────────────────────────────────────────────────────────────
    async Task<List<LogResponse>> GetLogs(int? uid, int? devId, int limit)
    {
        var q = db.ActivityLogs
            .Include(l => l.User)
            .Include(l => l.Device)
            .Include(l => l.Button)
            .AsQueryable();

        if (uid.HasValue)   q = q.Where(l => l.UserId   == uid.Value);
        if (devId.HasValue) q = q.Where(l => l.DeviceId == devId.Value);

        return await q.OrderByDescending(l => l.ExecutedAt)
            .Take(limit)
            .Select(l => MapLog(l))
            .ToListAsync();
    }

    static LogResponse MapLog(ActivityLog l) => new(
        l.Id, l.UserId, l.User.FullName,
        l.DeviceId, l.Device.Name,
        l.ButtonId, l.Button?.Label,
        l.Command, l.Status,
        l.DurationMs, l.ErrorMsg, l.ExecutedAt
    );
}
