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
builder.Services.AddScoped<OltEngine>();

// ── CORS (izinkan mobile & web admin) ────────────────────────────────────────
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

// ── Swagger ───────────────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "NOC OLT API", Version = "v1" });
    // Tambah JWT auth ke Swagger UI
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

// ── Auto-create tables + seed admin ──────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    // EnsureCreated: buat semua tabel dari EF model (tidak butuh migration)
    await db.Database.EnsureCreatedAsync();

    // Seed admin default jika belum ada
    if (!db.Users.Any(u => u.Username == "admin"))
    {
        db.Users.Add(new User
        {
            Username     = "admin",
            FullName     = "Administrator NOC",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123", workFactor: 11),
            Role         = "admin",
            IsActive     = true,
            CreatedAt    = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
        Console.WriteLine("✅ Seed: user admin dibuat (password: admin123)");
    }
}

// ── Middleware pipeline ───────────────────────────────────────────────────────
app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "NOC OLT API v1"));
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// ── Health check ──────────────────────────────────────────────────────────────
app.MapGet("/",       () => Results.Ok(new { service = "NOC OLT API", version = "1.0.0", status = "running", docs = "/swagger" }));
app.MapGet("/health", () => Results.Ok(new { status = "ok", time = DateTime.UtcNow }));

app.Run();
