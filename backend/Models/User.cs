namespace OltApi.Models;

public class User
{
    public int      Id             { get; set; }
    public string   Username       { get; set; } = "";
    public string   FullName       { get; set; } = "";
    public string?  PhoneNumber    { get; set; }
    public string   PasswordHash   { get; set; } = "";
    /// <summary>
    /// AES-encrypted plaintext password — supaya admin bisa "view password"
    /// setelah re-authenticate. Login tetap pakai BCrypt hash di kolom PasswordHash.
    /// Kolom ini OPSIONAL: kalau null artinya akun lama (sebelum fitur view-password).
    /// </summary>
    public string?  EncryptedPassword { get; set; }
    public string   Role           { get; set; } = "user";   // "admin" | "user"
    public bool     IsActive       { get; set; } = true;

    /// Timestamp aktivitas terakhir user (di-update oleh middleware tiap request authorized).
    public DateTime? LastSeenAt    { get; set; }

    public DateTime CreatedAt      { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt      { get; set; } = DateTime.UtcNow;

    public ICollection<Button>       AssignedButtons { get; set; } = [];
    public ICollection<ActivityLog>  Logs            { get; set; } = [];
}
