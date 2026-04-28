using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OltApi.Data;
using OltApi.DTOs;
using OltApi.Models;
using OltApi.Services;

namespace OltApi.Controllers;

[ApiController, Route("api/buttons"), Authorize]
public class ButtonsController(AppDbContext db) : ControllerBase
{
    // ── POST /api/buttons (admin) ────────────────────────────────────────────
    [HttpPost, Authorize(Roles = "admin")]
    public async Task<IActionResult> Create(ButtonRequest req)
    {
        var adminId = User.GetUserId();

        var device = await db.Devices.FindAsync(req.DeviceId);
        if (device == null || !device.IsActive)
            return BadRequest(new { message = "Device tidak ditemukan" });

        var user = await db.Users.FindAsync(req.AssignedToUserId);
        if (user == null || !user.IsActive)
            return BadRequest(new { message = "User tidak ditemukan" });

        var btn = new Button
        {
            DeviceId          = req.DeviceId,
            AssignedToUserId  = req.AssignedToUserId,
            CreatedByAdminId  = adminId,
            Label             = req.Label,
            Description       = req.Description,
            CommandTemplate   = req.CommandTemplate,
            ParameterKeys     = req.ParameterKeys,
            ExpiresAt         = DateTime.UtcNow.AddHours(req.ExpiresInHours),
            SortOrder         = req.SortOrder,
            CreatedAt         = DateTime.UtcNow,
            UpdatedAt         = DateTime.UtcNow,
        };

        db.Buttons.Add(btn);
        await db.SaveChangesAsync();

        return Ok(MapButton(btn, device, user));
    }

    // ── GET /api/buttons (admin) ─────────────────────────────────────────────
    [HttpGet, Authorize(Roles = "admin")]
    public async Task<IActionResult> ListAll(
        [FromQuery] int? userId,
        [FromQuery] int? deviceId,
        [FromQuery] bool includeInactive = false)
    {
        var q = db.Buttons
            .Include(b => b.Device)
            .Include(b => b.AssignedToUser)
            .AsQueryable();

        if (!includeInactive) q = q.Where(b => b.IsActive);
        if (userId.HasValue)   q = q.Where(b => b.AssignedToUserId == userId.Value);
        if (deviceId.HasValue) q = q.Where(b => b.DeviceId        == deviceId.Value);

        var result = await q.OrderByDescending(b => b.CreatedAt)
            .Select(b => MapButton(b, b.Device, b.AssignedToUser))
            .ToListAsync();

        return Ok(result);
    }

    // ── GET /api/buttons/my (user) ───────────────────────────────────────────
    [HttpGet("my")]
    public async Task<IActionResult> ListMy([FromQuery] int? deviceId)
    {
        var uid = User.GetUserId();
        var now = DateTime.UtcNow;

        var q = db.Buttons
            .Include(b => b.Device)
            .Include(b => b.AssignedToUser)
            .Where(b => b.AssignedToUserId == uid
                     && b.IsActive
                     && b.ExpiresAt > now);

        if (deviceId.HasValue) q = q.Where(b => b.DeviceId == deviceId.Value);

        var today  = now.Date;
        var doneIds = await db.ActivityLogs
            .Where(l => l.UserId == uid
                     && l.ExecutedAt >= today
                     && l.Status == "success")
            .Select(l => l.ButtonId)
            .ToListAsync();

        var btns = await q.OrderBy(b => b.SortOrder).ToListAsync();

        return Ok(btns.Select(b => new
        {
            button     = MapButton(b, b.Device, b.AssignedToUser),
            done_today = doneIds.Contains(b.Id),
        }));
    }

    // ── GET /api/buttons/{id} ────────────────────────────────────────────────
    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var btn = await db.Buttons
            .Include(b => b.Device)
            .Include(b => b.AssignedToUser)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (btn == null) return NotFound(new { message = "Button tidak ditemukan" });
        return Ok(MapButton(btn, btn.Device, btn.AssignedToUser));
    }

    // ── PATCH /api/buttons/{id} (admin) ──────────────────────────────────────
    [HttpPatch("{id}"), Authorize(Roles = "admin")]
    public async Task<IActionResult> Update(int id, ButtonRequest req)
    {
        var btn = await db.Buttons
            .Include(b => b.Device)
            .Include(b => b.AssignedToUser)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (btn == null) return NotFound(new { message = "Button tidak ditemukan" });

        btn.DeviceId         = req.DeviceId;
        btn.AssignedToUserId = req.AssignedToUserId;
        btn.Label            = req.Label;
        btn.Description      = req.Description;
        btn.CommandTemplate  = req.CommandTemplate;
        btn.ParameterKeys    = req.ParameterKeys;
        btn.ExpiresAt        = DateTime.UtcNow.AddHours(req.ExpiresInHours);
        btn.SortOrder        = req.SortOrder;
        btn.UpdatedAt        = DateTime.UtcNow;

        await db.SaveChangesAsync();

        // re-load relasi kalau Device/User diubah
        await db.Entry(btn).Reference(b => b.Device).LoadAsync();
        await db.Entry(btn).Reference(b => b.AssignedToUser).LoadAsync();
        return Ok(MapButton(btn, btn.Device, btn.AssignedToUser));
    }

    // ── DELETE /api/buttons/{id} ─────────────────────────────────────────────
    [HttpDelete("{id}"), Authorize(Roles = "admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var btn = await db.Buttons.FindAsync(id);
        if (btn == null) return NotFound(new { message = "Button tidak ditemukan" });
        btn.IsActive  = false;
        btn.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok();
    }

    // ── PATCH /api/buttons/{id}/activate ────────────────────────────────────
    [HttpPatch("{id}/activate"), Authorize(Roles = "admin")]
    public async Task<IActionResult> Activate(int id)
    {
        var btn = await db.Buttons.FindAsync(id);
        if (btn == null) return NotFound(new { message = "Button tidak ditemukan" });
        btn.IsActive  = true;
        btn.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok();
    }

    // ─── Helper ──────────────────────────────────────────────────────────────
    static ButtonResponse MapButton(Button b, Device d, User u) => new(
        b.Id, b.DeviceId, d.Label, d.Name,
        b.AssignedToUserId, u.FullName,
        b.Label, b.Description,
        b.CommandTemplate, b.ParameterKeys,
        b.ExpiresAt, b.IsActive, b.SortOrder, b.CreatedAt, b.UpdatedAt
    );
}
