using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace OltApi.Services;

/// <summary>
/// Helper dependency untuk ambil info user dari JWT token di controller.
/// </summary>
public static class AuthExtensions
{
    public static int GetUserId(this ClaimsPrincipal user)
        => int.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

    public static string GetRole(this ClaimsPrincipal user)
        => user.FindFirstValue(ClaimTypes.Role)!;

    public static bool IsAdmin(this ClaimsPrincipal user)
        => user.GetRole() == "admin";
}
