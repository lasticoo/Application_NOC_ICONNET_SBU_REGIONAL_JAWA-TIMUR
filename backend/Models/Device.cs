namespace OltApi.Models;

/// <summary>
/// Device = perangkat yang dihubungi via jumphost CLI.
/// Bisa OLT, FDT (Fiber Distribution Terminal aktif), atau FAT (Fiber Access Terminal aktif).
///
/// Profile login/CLI di-flat-kan ke kolom-kolom struktural di bawah —
/// jadi admin tidak perlu menulis JSON / extra-steps untuk vendor yang berbeda.
/// </summary>
public class Device
{
    public int      Id          { get; set; }
    public string   Name        { get; set; } = "";   // nama lengkap (mis. JATIM-ULP.KEBON.AGUNG.OLT-RC-03)
    public string   Label       { get; set; } = "";   // nama pendek untuk UI
    public string   IpAddress   { get; set; } = "";

    public string   OltUser     { get; set; } = "";
    public string   OltPass     { get; set; } = "";

    public string   Vendor      { get; set; } = "huawei";
    public string   DeviceType  { get; set; } = "OLT";   // OLT | FDT | FAT

    // ───────── CLI profile (di-set otomatis dari preset, tetap bisa diedit) ─────────
    /// Command jumphost untuk verifikasi device (`{keyword}` di-replace).
    /// Default Huawei/Raisecom: `h {keyword}`. Kosongkan utk skip.
    public string?  VerifyCommand        { get; set; } = "h {keyword}";

    /// Command jumphost utk konek ke device (`{name}` di-replace).
    /// Default: `t {name}` (terminal2 ICON+).
    public string   ConnectCommand       { get; set; } = "t {name}";

    /// CSV pattern prompt yang menunggu username login (mis. ">>User name:,Login:").
    public string   LoginUserPrompts     { get; set; } = ">>User name:,User name:,Username:,Login:";
    /// CSV pattern prompt yang menunggu password login.
    public string   LoginPassPrompts     { get; set; } = ">>User password:,User password:,Password:";

    /// CSV pattern prompt user-mode (non-privileged).
    public string   UserModePrompts      { get; set; } = ">";
    /// CSV pattern prompt privileged-mode (enable mode).
    public string   EnableModePrompts    { get; set; } = "#";

    /// Command utk masuk privileged-mode. Mis: `enable` (Huawei) atau `ena` (Raisecom).
    /// Kosongkan kalau device langsung masuk privileged setelah login.
    public string?  EnableCommand        { get; set; } = "enable";
    /// Password privileged-mode (kalau diminta). Boleh sama / beda dgn login pass.
    public string?  EnablePassword       { get; set; }

    /// Command utk mematikan paging output. Mis: `scroll` (Huawei), `terminal length 0` (Cisco/ZTE).
    public string?  DisablePagingCommand { get; set; } = "scroll";

    /// Trigger paging interaktif (mis. `{ <cr>` Huawei, `--More--` Raisecom/Cisco).
    public string?  PagingTrigger        { get; set; } = "{ <cr>";
    /// Apa yg dikirim balasan saat trigger paging muncul. Default: enter (\n).
    /// Untuk `--More--` biasanya space (` `).
    public string?  PagingResponse       { get; set; } = "\n";

    /// Command tambahan yg dijalankan SEBELUM command utama, satu baris per command.
    /// Contoh utk Cisco: `terminal length 0`. Pisahkan baris dgn newline.
    public string?  PreCommands          { get; set; }

    /// Banner / extra prompt yg muncul sebelum prompt login muncul (mis. `Press 'RETURN'`).
    /// Kalau diisi, engine akan kirim newline ketika trigger ini muncul.
    public string?  PostConnectTrigger   { get; set; }
    public string?  PostConnectResponse  { get; set; } = "\n";

    /// Field warisan — DEPRECATED. Tidak dipakai engine baru, tetap dipertahankan utk migrasi.
    public string?  ExtraSteps           { get; set; }

    public bool     IsActive    { get; set; } = true;
    public DateTime CreatedAt   { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt   { get; set; } = DateTime.UtcNow;

    public ICollection<Button>      Buttons { get; set; } = [];
    public ICollection<ActivityLog> Logs    { get; set; } = [];
}
