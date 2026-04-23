namespace OltApi.Models;

public class ActivityLog
{
    public int      Id          { get; set; }
    public int      UserId      { get; set; }
    public User     User        { get; set; } = null!;
    public int      DeviceId    { get; set; }
    public Device   Device      { get; set; } = null!;
    public int?     ButtonId    { get; set; }
    public Button?  Button      { get; set; }
    public string   Command     { get; set; } = "";
    public string?  RawOutput   { get; set; }
    public string   Status      { get; set; } = "";  // "success" | "failed"
    public int      DurationMs  { get; set; }
    public string?  ErrorMsg    { get; set; }
    public DateTime ExecutedAt  { get; set; } = DateTime.UtcNow;
}
