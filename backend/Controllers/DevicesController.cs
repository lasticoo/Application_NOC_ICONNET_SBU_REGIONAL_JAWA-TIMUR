using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OltApi.Data;
using OltApi.DTOs;
using OltApi.Models;
using OltApi.Services;

namespace OltApi.Controllers;

[ApiController, Route("api/devices"), Authorize]
public class DevicesController(AppDbContext db) : ControllerBase
{
    // ── GET /api/devices ─────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] bool includeInactive = false)
    {
        var q = db.Devices.AsQueryable();
        if (!includeInactive) q = q.Where(d => d.IsActive);
        var list = await q.OrderBy(d => d.Label).ToListAsync();
        return Ok(list.Select(MapDevice));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var d = await db.Devices.FindAsync(id);
        if (d == null) return NotFound(new { message = "Device tidak ditemukan" });
        return Ok(MapDevice(d));
    }

    // ── GET /api/devices/presets — list semua vendor preset utk form admin ──
    [HttpGet("presets"), Authorize(Roles = "admin")]
    public IActionResult Presets()
    {
        var list = VendorPresets.Presets.Select(kv => new VendorPresetResponse(
            kv.Key,
            kv.Value.VerifyCommand,
            kv.Value.ConnectCommand,
            kv.Value.LoginUserPrompts,
            kv.Value.LoginPassPrompts,
            kv.Value.UserModePrompts,
            kv.Value.EnableModePrompts,
            kv.Value.EnableCommand,
            kv.Value.DisablePagingCommand,
            kv.Value.PagingTrigger,
            kv.Value.PagingResponse,
            kv.Value.PreCommands,
            kv.Value.PostConnectTrigger,
            kv.Value.PostConnectResponse,
            kv.Value.Notes
        ));
        return Ok(list);
    }

    // ── POST /api/devices ────────────────────────────────────────────────────
    [HttpPost, Authorize(Roles = "admin")]
    public async Task<IActionResult> Create(DeviceRequest req)
    {
        if (await db.Devices.AnyAsync(d => d.Name == req.Name))
            return BadRequest(new { message = "Nama device sudah ada" });

        var device = new Device
        {
            Name      = req.Name,
            Label     = req.Label,
            IpAddress = req.IpAddress,
            OltUser   = req.OltUser,
            OltPass   = req.OltPass,
        };
        // apply preset dulu, lalu override dengan field yg di-supply admin
        VendorPresets.ApplyPreset(device, req.Vendor);
        ApplyOverrides(device, req);

        db.Devices.Add(device);
        await db.SaveChangesAsync();
        return Ok(MapDevice(device));
    }

    // ── PATCH /api/devices/{id} ──────────────────────────────────────────────
    [HttpPatch("{id}"), Authorize(Roles = "admin")]
    public async Task<IActionResult> Update(int id, DeviceRequest req)
    {
        var d = await db.Devices.FindAsync(id);
        if (d == null) return NotFound(new { message = "Device tidak ditemukan" });

        d.Label     = req.Label;
        d.IpAddress = req.IpAddress;
        d.OltUser   = req.OltUser;
        // password dibiarkan kalau req kosong (UI mengirim "" utk "tidak diubah")
        if (!string.IsNullOrEmpty(req.OltPass)) d.OltPass = req.OltPass;

        // kalau vendor di-ganti, re-apply preset baru sebagai dasar
        if (!string.Equals(d.Vendor, req.Vendor, StringComparison.OrdinalIgnoreCase))
            VendorPresets.ApplyPreset(d, req.Vendor);

        d.Vendor     = req.Vendor;
        d.DeviceType = req.DeviceType;
        ApplyOverrides(d, req);

        d.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(MapDevice(d));
    }

    // ── DELETE /api/devices/{id} (soft-delete) ──────────────────────────────
    [HttpDelete("{id}"), Authorize(Roles = "admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var d = await db.Devices.FindAsync(id);
        if (d == null) return NotFound(new { message = "Device tidak ditemukan" });
        d.IsActive  = false;
        d.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok();
    }

    // ── PATCH /api/devices/{id}/activate ────────────────────────────────────
    [HttpPatch("{id}/activate"), Authorize(Roles = "admin")]
    public async Task<IActionResult> Activate(int id)
    {
        var d = await db.Devices.FindAsync(id);
        if (d == null) return NotFound(new { message = "Device tidak ditemukan" });
        d.IsActive  = true;
        d.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok();
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────
    static void ApplyOverrides(Device d, DeviceRequest r)
    {
        // hanya overwrite kalau admin mengirim nilai (non-null).
        if (r.VerifyCommand        != null) d.VerifyCommand        = r.VerifyCommand;
        if (r.ConnectCommand       != null) d.ConnectCommand       = r.ConnectCommand;
        if (r.LoginUserPrompts     != null) d.LoginUserPrompts     = r.LoginUserPrompts;
        if (r.LoginPassPrompts     != null) d.LoginPassPrompts     = r.LoginPassPrompts;
        if (r.UserModePrompts      != null) d.UserModePrompts      = r.UserModePrompts;
        if (r.EnableModePrompts    != null) d.EnableModePrompts    = r.EnableModePrompts;
        if (r.EnableCommand        != null) d.EnableCommand        = r.EnableCommand;
        if (r.EnablePassword       != null) d.EnablePassword       = r.EnablePassword;
        if (r.DisablePagingCommand != null) d.DisablePagingCommand = r.DisablePagingCommand;
        if (r.PagingTrigger        != null) d.PagingTrigger        = r.PagingTrigger;
        if (r.PagingResponse       != null) d.PagingResponse       = r.PagingResponse;
        if (r.PreCommands          != null) d.PreCommands          = r.PreCommands;
        if (r.PostConnectTrigger   != null) d.PostConnectTrigger   = r.PostConnectTrigger;
        if (r.PostConnectResponse  != null) d.PostConnectResponse  = r.PostConnectResponse;
    }

    static DeviceResponse MapDevice(Device d) => new(
        d.Id, d.Name, d.Label, d.IpAddress, d.Vendor, d.DeviceType, d.IsActive,
        d.VerifyCommand, d.ConnectCommand,
        d.LoginUserPrompts, d.LoginPassPrompts,
        d.UserModePrompts,  d.EnableModePrompts,
        d.EnableCommand,
        d.DisablePagingCommand, d.PagingTrigger, d.PagingResponse,
        d.PreCommands,
        d.PostConnectTrigger, d.PostConnectResponse,
        d.CreatedAt, d.UpdatedAt
    );
}
