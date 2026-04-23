using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OltApi.Data;
using OltApi.DTOs;
using OltApi.Models;
using OltApi.Services;

namespace OltApi.Controllers;

[ApiController, Route("api/auth")]
public class AuthController(AppDbContext db, TokenService tokens) : ControllerBase
{
    // ── POST /api/auth/login ──────────────────────────────────────────────────
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Username == req.Username);

        if (user == null || !user.IsActive ||
            !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Username atau password salah" });

        return Ok(new LoginResponse(tokens.Generate(user), user.Role, user.FullName, user.Id));
    }

    // ── GET /api/auth/me ──────────────────────────────────────────────────────
    [HttpGet("me"), Authorize]
    public async Task<IActionResult> Me()
    {
        var uid  = User.GetUserId();
        var user = await db.Users.FindAsync(uid);
        if (user == null) return NotFound();
        return Ok(new UserResponse(user.Id, user.Username, user.FullName, user.Role, user.IsActive));
    }

    // ── POST /api/auth/users — buat user baru (admin only) ───────────────────
    [HttpPost("users"), Authorize(Roles = "admin")]
    public async Task<IActionResult> CreateUser(CreateUserRequest req)
    {
        if (await db.Users.AnyAsync(u => u.Username == req.Username))
            return BadRequest(new { message = "Username sudah digunakan" });

        if (!new[] { "admin", "user" }.Contains(req.Role))
            return BadRequest(new { message = "Role harus 'admin' atau 'user'" });

        var user = new User
        {
            Username     = req.Username,
            FullName     = req.FullName,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password, workFactor: 11),
            Role         = req.Role,
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return Ok(new UserResponse(user.Id, user.Username, user.FullName, user.Role, user.IsActive));
    }

    // ── GET /api/auth/users — daftar user (admin only) ───────────────────────
    [HttpGet("users"), Authorize(Roles = "admin")]
    public async Task<IActionResult> ListUsers()
    {
        var users = await db.Users
            .Select(u => new UserResponse(u.Id, u.Username, u.FullName, u.Role, u.IsActive))
            .ToListAsync();
        return Ok(users);
    }

    // ── PATCH /api/auth/users/{id}/deactivate ────────────────────────────────
    [HttpPatch("users/{id}/deactivate"), Authorize(Roles = "admin")]
    public async Task<IActionResult> Deactivate(int id)
    {
        if (id == User.GetUserId())
            return BadRequest(new { message = "Tidak bisa menonaktifkan diri sendiri" });

        var user = await db.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "User tidak ditemukan" });

        user.IsActive = false;
        await db.SaveChangesAsync();
        return Ok();
    }
}
