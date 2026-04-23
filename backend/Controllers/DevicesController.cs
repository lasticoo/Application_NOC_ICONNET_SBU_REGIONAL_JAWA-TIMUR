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
    // ── GET /api/devices ──────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> List() =>
        Ok(await db.Devices.Where(d => d.IsActive)
            .Select(d => new DeviceResponse(d.Id, d.Name, d.Label, d.IpAddress,
                d.Vendor, d.IsActive, d.ExtraSteps))
            .OrderBy(d => d.Label)
            .ToListAsync());

    // ── GET /api/devices/{id} ─────────────────────────────────────────────────
    [HttpGet("{id}")]
    public async Task<IActionResult> Get(int id)
    {
        var d = await db.Devices.FindAsync(id);
        if (d == null || !d.IsActive) return NotFound(new { message = "Device tidak ditemukan" });
        return Ok(new DeviceResponse(d.Id, d.Name, d.Label, d.IpAddress,
            d.Vendor, d.IsActive, d.ExtraSteps));
    }

    // ── POST /api/devices ─────────────────────────────────────────────────────
    [HttpPost, Authorize(Roles = "admin")]
    public async Task<IActionResult> Create(DeviceRequest req)
    {
        if (await db.Devices.AnyAsync(d => d.Name == req.Name))
            return BadRequest(new { message = "Nama OLT sudah ada" });

        var device = new Device
        {
            Name       = req.Name,
            Label      = req.Label,
            IpAddress  = req.IpAddress,
            OltUser    = req.OltUser,
            OltPass    = req.OltPass,
            Vendor     = req.Vendor,
            ExtraSteps = req.ExtraStepsJson,
        };

        db.Devices.Add(device);
        await db.SaveChangesAsync();

        return Ok(new DeviceResponse(device.Id, device.Name, device.Label,
            device.IpAddress, device.Vendor, device.IsActive, device.ExtraSteps));
    }

    // ── PATCH /api/devices/{id} ───────────────────────────────────────────────
    [HttpPatch("{id}"), Authorize(Roles = "admin")]
    public async Task<IActionResult> Update(int id, DeviceRequest req)
    {
        var device = await db.Devices.FindAsync(id);
        if (device == null) return NotFound(new { message = "Device tidak ditemukan" });

        device.Label      = req.Label;
        device.IpAddress  = req.IpAddress;
        device.OltUser    = req.OltUser;
        device.OltPass    = req.OltPass;
        device.Vendor     = req.Vendor;
        device.ExtraSteps = req.ExtraStepsJson;

        await db.SaveChangesAsync();
        return Ok(new DeviceResponse(device.Id, device.Name, device.Label,
            device.IpAddress, device.Vendor, device.IsActive, device.ExtraSteps));
    }

    // ── DELETE /api/devices/{id} ──────────────────────────────────────────────
    [HttpDelete("{id}"), Authorize(Roles = "admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var device = await db.Devices.FindAsync(id);
        if (device == null) return NotFound(new { message = "Device tidak ditemukan" });
        device.IsActive = false;
        await db.SaveChangesAsync();
        return Ok();
    }
}
