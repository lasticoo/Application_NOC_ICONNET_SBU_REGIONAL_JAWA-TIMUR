using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OltApi.Data;
using OltApi.Models;
using OltApi.Services;

var builder = WebApplication.CreateBuilder(args);

// ── Database (MySQL) ──────────────────────────────────────────────────────────
var connStr = builder.Configuration.GetConnectionString("Default")!;
builder.Services.AddDbContext<AppDbContext>(opts =>
    opts.UseMySql(connStr, ServerVersion.AutoDetect(connStr))
);

// ── JWT Authentication ────────────────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidAudience            = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(
                                           Encoding.UTF8.GetBytes(jwtKey)),
        };
    });

builder.Services.AddAuthorization();

// ── App Services ──────────────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddSingleton<TokenService>();
builder.Services.AddSingleton<PasswordVault>();
builder.Services.AddScoped<OltEngine>();

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

// ── Swagger ───────────────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "NOC OLT API", Version = "v2" });
    c.AddSecurityDefinition("Bearer", new()
    {
        Name   = "Authorization",
        Type   = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In     = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Masukkan JWT token. Contoh: eyJhbG...",
    });
    c.AddSecurityRequirement(new()
    {
        {
            new() { Reference = new() { Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme, Id = "Bearer" } },
            []
        }
    });
});

var app = builder.Build();

// ── Auto-create / migrate tables + seed admin ────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db    = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var vault = scope.ServiceProvider.GetRequiredService<PasswordVault>();

    // EnsureCreated tidak meng-add kolom baru ke tabel lama. Untuk repo ini
    // skema dibuat dgn EnsureCreated, jadi user perlu:
    //   - DB baru: tabel akan dibuat lengkap dgn semua kolom baru
    //   - DB lama: jalankan SQL migrasi di README (`docs/migrations/2026-04-multi-vendor.sql`)
    await db.Database.EnsureCreatedAsync();

    if (!db.Users.Any(u => u.Username == "admin"))
    {
        const string seedPass = "admin123";
        db.Users.Add(new User
        {
            Username          = "admin",
            FullName          = "Administrator NOC",
            PasswordHash      = BCrypt.Net.BCrypt.HashPassword(seedPass, workFactor: 11),
            EncryptedPassword = vault.Encrypt(seedPass),
            Role              = "admin",
            IsActive          = true,
            CreatedAt         = DateTime.UtcNow,
            UpdatedAt         = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
        Console.WriteLine("Seed: user admin dibuat (password: admin123)");
    }
}

// ── Middleware pipeline ───────────────────────────────────────────────────────
app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "NOC OLT API v2"));
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseLastSeenTracking();   // update Users.LastSeenAt tiap request authorized
app.MapControllers();

// ── Health ────────────────────────────────────────────────────────────────────
app.MapGet("/",       () => Results.Ok(new { service = "NOC OLT API", version = "2.0.0", status = "running", docs = "/swagger" }));
app.MapGet("/health", () => Results.Ok(new { status = "ok", time = DateTime.UtcNow }));

app.Run();
