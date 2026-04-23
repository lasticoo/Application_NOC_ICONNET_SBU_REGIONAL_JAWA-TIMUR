namespace OltApi.Models;

public class Device
{
    public int      Id          { get; set; }
    public string   Name        { get; set; } = "";     // nama OLT lengkap
    public string   Label       { get; set; } = "";     // nama pendek untuk UI
    public string   IpAddress   { get; set; } = "";
    public string   OltUser     { get; set; } = "";
    public string   OltPass     { get; set; } = "";
    public string   Vendor      { get; set; } = "huawei";
    // JSON: [{"trigger":"Password:","response":"secret"}]
    public string?  ExtraSteps  { get; set; }
    public bool     IsActive    { get; set; } = true;
    public DateTime CreatedAt   { get; set; } = DateTime.UtcNow;

    public ICollection<Button>      Buttons { get; set; } = [];
    public ICollection<ActivityLog> Logs    { get; set; } = [];
}
