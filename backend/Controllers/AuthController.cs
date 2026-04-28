using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OltApi.Data;
using OltApi.DTOs;
using OltApi.Models;
using OltApi.Services;

namespace OltApi.Controllers;

[ApiController, Route("api/auth")]
public class AuthController(AppDbContext db, TokenService tokens, PasswordVault vault) : ControllerBase
{
    /// User dianggap "online" kalau LastSeenAt < threshold ini.
    static readonly TimeSpan OnlineThreshold = TimeSpan.FromMinutes(5);

    // ── POST /api/auth/login ──────────────────────────────────────────────────
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Username == req.Username);

        if (user == null || !user.IsActive ||
            !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Username atau password salah" });

        user.LastSeenAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Ok(new LoginResponse(tokens.Generate(user), user.Role, user.FullName, user.Id));
    }

    // ── GET /api/auth/me ──────────────────────────────────────────────────────
    [HttpGet("me"), Authorize]
    public async Task<IActionResult> Me()
    {
        var uid  = User.GetUserId();
        var user = await db.Users.FindAsync(uid);
        if (user == null) return NotFound();
        return Ok(MapUser(user));
    }

    // ── PATCH /api/auth/me — user edit profile sendiri (no role change) ──────
    [HttpPatch("me"), Authorize]
    public async Task<IActionResult> UpdateMe(UpdateUserRequest req)
    {
        var uid  = User.GetUserId();
        var user = await db.Users.FindAsync(uid);
        if (user == null) return NotFound();

        user.FullName    = req.FullName;
        user.PhoneNumber = req.PhoneNumber;
        user.UpdatedAt   = DateTime.UtcNow;
        // role TIDAK boleh diubah dari endpoint /me
        await db.SaveChangesAsync();
        return Ok(MapUser(user));
    }

    // ── POST /api/auth/users (admin) ─────────────────────────────────────────
    [HttpPost("users"), Authorize(Roles = "admin")]
    public async Task<IActionResult> CreateUser(CreateUserRequest req)
    {
        if (await db.Users.AnyAsync(u => u.Username == req.Username))
            return BadRequest(new { message = "Username sudah digunakan" });

        if (!new[] { "admin", "user" }.Contains(req.Role))
            return BadRequest(new { message = "Role harus 'admin' atau 'user'" });

        var user = new User
        {
            Username          = req.Username,
            FullName          = req.FullName,
            PhoneNumber       = req.PhoneNumber,
            PasswordHash      = BCrypt.Net.BCrypt.HashPassword(req.Password, workFactor: 11),
            EncryptedPassword = vault.Encrypt(req.Password),
            Role              = req.Role,
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return Ok(MapUser(user));
    }

    // ── GET /api/auth/users ──────────────────────────────────────────────────
    [HttpGet("users"), Authorize(Roles = "admin")]
    public async Task<IActionResult> ListUsers([FromQuery] bool? online)
    {
        var users = await db.Users.OrderBy(u => u.FullName).ToListAsync();
        var resp  = users.Select(MapUser);
        if (online == true) resp = resp.Where(u => u.IsOnline);
        return Ok(resp);
    }

    // ── PATCH /api/auth/users/{id} (edit profile + role) ────────────────────
    [HttpPatch("users/{id}"), Authorize(Roles = "admin")]
    public async Task<IActionResult> Update(int id, UpdateUserRequest req)
    {
        var user = await db.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "User tidak ditemukan" });

        if (!new[] { "admin", "user" }.Contains(req.Role))
            return BadRequest(new { message = "Role harus 'admin' atau 'user'" });

        // tidak boleh ubah role admin terakhir
        if (user.Role == "admin" && req.Role == "user")
        {
            var adminCount = await db.Users.CountAsync(u => u.Role == "admin" && u.IsActive);
            if (adminCount <= 1)
                return BadRequest(new { message = "Minimal harus ada 1 admin aktif" });
        }

        user.FullName    = req.FullName;
        user.PhoneNumber = req.PhoneNumber;
        user.Role        = req.Role;
        user.UpdatedAt   = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(MapUser(user));
    }

    // ── PATCH /api/auth/users/{id}/deactivate ────────────────────────────────
    [HttpPatch("users/{id}/deactivate"), Authorize(Roles = "admin")]
    public async Task<IActionResult> Deactivate(int id)
    {
        if (id == User.GetUserId())
            return BadRequest(new { message = "Tidak bisa menonaktifkan diri sendiri" });

        var user = await db.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "User tidak ditemukan" });

        user.IsActive  = false;
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok();
    }

    // ── PATCH /api/auth/users/{id}/activate (re-aktivasi) ────────────────────
    [HttpPatch("users/{id}/activate"), Authorize(Roles = "admin")]
    public async Task<IActionResult> Activate(int id)
    {
        var user = await db.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "User tidak ditemukan" });

        user.IsActive  = true;
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok();
    }

    // ── POST /api/auth/users/{id}/password/view (admin re-auth) ──────────────
    [HttpPost("users/{id}/password/view"), Authorize(Roles = "admin")]
    public async Task<IActionResult> ViewPassword(int id, AdminReauthRequest req)
    {
        var admin = await VerifyAdminPassword(req.AdminPassword);
        if (admin == null) return Unauthorized(new { message = "Password admin salah" });

        var user = await db.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "User tidak ditemukan" });

        var plain = vault.TryDecrypt(user.EncryptedPassword);
        if (plain == null)
            return BadRequest(new
            {
                message = "Password tidak bisa ditampilkan untuk user ini "
                        + "(akun lama, dibuat sebelum fitur view-password). "
                        + "Silakan reset password lewat tombol 'Edit Password'."
            });

        return Ok(new { username = user.Username, password = plain });
    }

    // ── POST /api/auth/users/{id}/password/change (admin re-auth) ────────────
    [HttpPost("users/{id}/password/change"), Authorize(Roles = "admin")]
    public async Task<IActionResult> ChangePassword(int id, ChangeUserPasswordRequest req)
    {
        var admin = await VerifyAdminPassword(req.AdminPassword);
        if (admin == null) return Unauthorized(new { message = "Password admin salah" });

        if (string.IsNullOrWhiteSpace(req.NewPassword) || req.NewPassword.Length < 6)
            return BadRequest(new { message = "Password baru minimal 6 karakter" });

        var user = await db.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "User tidak ditemukan" });

        user.PasswordHash      = BCrypt.Net.BCrypt.HashPassword(req.NewPassword, workFactor: 11);
        user.EncryptedPassword = vault.Encrypt(req.NewPassword);
        user.UpdatedAt         = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { message = "Password berhasil diubah" });
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────
    async Task<User?> VerifyAdminPassword(string adminPassword)
    {
        var adminId = User.GetUserId();
        var admin   = await db.Users.FindAsync(adminId);
        if (admin == null || !admin.IsActive || admin.Role != "admin") return null;
        if (!BCrypt.Net.BCrypt.Verify(adminPassword, admin.PasswordHash)) return null;
        return admin;
    }

    static UserResponse MapUser(User u)
    {
        var online = u.IsActive
                  && u.LastSeenAt.HasValue
                  && (DateTime.UtcNow - u.LastSeenAt.Value) < OnlineThreshold;
        return new UserResponse(
            u.Id, u.Username, u.FullName, u.PhoneNumber,
            u.Role, u.IsActive,
            u.LastSeenAt, online,
            u.CreatedAt
        );
    }
}
