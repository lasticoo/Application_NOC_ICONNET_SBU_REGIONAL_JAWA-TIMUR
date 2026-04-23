using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using OltApi.Models;

namespace OltApi.Services;

public class TokenService(IConfiguration cfg)
{
    public string Generate(User user)
    {
        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(cfg["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var exp   = DateTime.UtcNow.AddHours(double.Parse(cfg["Jwt:ExpireHours"]!));

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name,           user.Username),
            new Claim(ClaimTypes.Role,           user.Role),
            new Claim("fullName",                user.FullName),
        };

        var token = new JwtSecurityToken(
            issuer:             cfg["Jwt:Issuer"],
            audience:           cfg["Jwt:Audience"],
            claims:             claims,
            expires:            exp,
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
