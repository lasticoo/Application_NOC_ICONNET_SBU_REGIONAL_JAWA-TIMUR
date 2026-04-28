using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OltApi.Data;
using OltApi.DTOs;
using OltApi.Models;
using OltApi.Services;

namespace OltApi.Controllers;

[ApiController, Route("api/execute"), Authorize]
public class ExecuteController(AppDbContext db, OltEngine engine) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Execute(ExecuteRequest req)
    {
        var userId = User.GetUserId();
        var role   = User.GetRole();

        var btn = await db.Buttons
            .Include(b => b.Device)
            .FirstOrDefaultAsync(b => b.Id == req.ButtonId && b.IsActive);

        if (btn == null)
            return NotFound(new { message = "Button tidak ditemukan atau nonaktif" });

        if (role == "user" && btn.AssignedToUserId != userId)
            return Forbid();

        if (btn.ExpiresAt < DateTime.UtcNow)
            return BadRequest(new { message = "Button sudah expired" });

        // validasi parameter
        var requiredKeys = btn.ParameterKeys
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(k => k.Trim())
            .Where(k => !string.IsNullOrEmpty(k))
            .ToList();

        var missing = requiredKeys
            .Where(k => !req.Parameters?.ContainsKey(k) ?? true)
            .ToList();

        if (missing.Count > 0)
            return BadRequest(new { message = $"Parameter kurang: {string.Join(", ", missing)}" });

        // render command template
        var command = btn.CommandTemplate;
        if (req.Parameters != null)
            foreach (var kv in req.Parameters)
                command = command.Replace($"{{{kv.Key}}}", kv.Value);

        // eksekusi via engine generic — semua profile ada di Device entity
        var executedAt = DateTime.UtcNow;
        var result = await engine.ExecuteAsync(new OltRequest(btn.Device, command));

        // audit log
        db.ActivityLogs.Add(new ActivityLog
        {
            UserId     = userId,
            DeviceId   = btn.DeviceId,
            ButtonId   = btn.Id,
            Command    = command,
            RawOutput  = result.Success ? result.Output : result.Error,
            Status     = result.Success ? "success" : "failed",
            DurationMs = result.DurationMs,
            ErrorMsg   = result.Success ? null : result.Error,
            ExecutedAt = executedAt,
        });
        await db.SaveChangesAsync();

        if (!result.Success)
            return StatusCode(502, new { message = $"Eksekusi device gagal: {result.Error}" });

        return Ok(new ExecuteResponse(
            true, command, result.Output, null,
            result.DurationMs, executedAt
        ));
    }
}
