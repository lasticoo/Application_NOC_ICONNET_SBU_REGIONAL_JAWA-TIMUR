namespace OltApi.Models;

public class Button
{
    public int      Id                  { get; set; }
    public int      DeviceId            { get; set; }
    public Device   Device              { get; set; } = null!;
    public int      AssignedToUserId    { get; set; }
    public User     AssignedToUser      { get; set; } = null!;
    public int      CreatedByAdminId    { get; set; }
    public string   Label               { get; set; } = "";
    public string?  Description         { get; set; }
    public string   CommandTemplate     { get; set; } = "";
    public string   ParameterKeys       { get; set; } = "";

    /// DEPRECATED — tetap dipertahankan utk migrasi data lama, tidak dipakai engine baru.
    public string?  ExtraSteps          { get; set; }

    public DateTime ExpiresAt           { get; set; }
    public bool     IsActive            { get; set; } = true;
    public int      SortOrder           { get; set; } = 0;
    public DateTime CreatedAt           { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt           { get; set; } = DateTime.UtcNow;

    public ICollection<ActivityLog> Logs { get; set; } = [];
}
