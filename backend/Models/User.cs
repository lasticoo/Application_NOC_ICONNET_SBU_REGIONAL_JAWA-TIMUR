namespace OltApi.Models;

public class User
{
    public int      Id             { get; set; }
    public string   Username       { get; set; } = "";
    public string   FullName       { get; set; } = "";
    public string   PasswordHash   { get; set; } = "";
    public string   Role           { get; set; } = "user";   // "admin" | "user"
    public bool     IsActive       { get; set; } = true;
    public DateTime CreatedAt      { get; set; } = DateTime.UtcNow;

    public ICollection<Button>       AssignedButtons { get; set; } = [];
    public ICollection<ActivityLog>  Logs            { get; set; } = [];
}
