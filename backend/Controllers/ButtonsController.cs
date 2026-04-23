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
    // ── POST /api/buttons — buat button (admin only) ──────────────────────────
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
            ExtraSteps        = req.ExtraStepsJson,
            ExpiresAt         = DateTime.UtcNow.AddHours(req.ExpiresInHours),
            SortOrder         = req.SortOrder,
        };

        db.Buttons.Add(btn);
        await db.SaveChangesAsync();

        return Ok(MapButton(btn, device, user));
    }

    // ── GET /api/buttons — semua button (admin only) ──────────────────────────
    [HttpGet, Authorize(Roles = "admin")]
    public async Task<IActionResult> ListAll([FromQuery] int? userId, [FromQuery] int? deviceId)
    {
        var q = db.Buttons
            .Include(b => b.Device)
            .Include(b => b.AssignedToUser)
            .AsQueryable();

        if (userId.HasValue)   q = q.Where(b => b.AssignedToUserId == userId.Value);
        if (deviceId.HasValue) q = q.Where(b => b.DeviceId        == deviceId.Value);

        var result = await q.OrderByDescending(b => b.CreatedAt)
            .Select(b => MapButton(b, b.Device, b.AssignedToUser))
            .ToListAsync();

        return Ok(result);
    }

    // ── GET /api/buttons/my — button milik teknisi (aktif + belum expired) ────
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

        // Cek button mana yang sudah dieksekusi hari ini
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
            button    = MapButton(b, b.Device, b.AssignedToUser),
            done_today = doneIds.Contains(b.Id),
        }));
    }

    // ── GET /api/buttons/{id} ─────────────────────────────────────────────────
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

    // ── PATCH /api/buttons/{id} (admin only) ──────────────────────────────────
    [HttpPatch("{id}"), Authorize(Roles = "admin")]
    public async Task<IActionResult> Update(int id, ButtonRequest req)
    {
        var btn = await db.Buttons
            .Include(b => b.Device)
            .Include(b => b.AssignedToUser)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (btn == null) return NotFound(new { message = "Button tidak ditemukan" });

        btn.Label           = req.Label;
        btn.Description     = req.Description;
        btn.CommandTemplate = req.CommandTemplate;
        btn.ParameterKeys   = req.ParameterKeys;
        btn.ExtraSteps      = req.ExtraStepsJson;
        btn.ExpiresAt       = DateTime.UtcNow.AddHours(req.ExpiresInHours);
        btn.SortOrder       = req.SortOrder;
        btn.UpdatedAt       = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(MapButton(btn, btn.Device, btn.AssignedToUser));
    }

    // ── DELETE /api/buttons/{id} (admin only) ─────────────────────────────────
    [HttpDelete("{id}"), Authorize(Roles = "admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var btn = await db.Buttons.FindAsync(id);
        if (btn == null) return NotFound(new { message = "Button tidak ditemukan" });
        btn.IsActive = false;
        await db.SaveChangesAsync();
        return Ok();
    }

    // ─── Helper ───────────────────────────────────────────────────────────────
    static ButtonResponse MapButton(Button b, Device d, User u) => new(
        b.Id, b.DeviceId, d.Label, d.Name,
        b.AssignedToUserId, u.FullName,
        b.Label, b.Description,
        b.CommandTemplate, b.ParameterKeys,
        b.ExtraSteps,
        b.ExpiresAt, b.IsActive, b.SortOrder, b.CreatedAt
    );
}
