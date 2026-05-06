// Services/VendorPresets.cs
//
// Default CLI profile per vendor. Saat admin pilih vendor di form, frontend bisa
// minta preset ini untuk auto-isi field — tetap bisa di-edit manual sebelum simpan.
//
// Tambahkan vendor baru cukup di dictionary `Presets` di bawah.

using OltApi.Models;

namespace OltApi.Services;

public record VendorProfile(
    string VerifyCommand,
    string ConnectCommand,
    string LoginUserPrompts,
    string LoginPassPrompts,
    string UserModePrompts,
    string EnableModePrompts,
    string EnableCommand,
    string DisablePagingCommand,
    string PagingTrigger,
    string PagingResponse,
    string PreCommands,
    string PostConnectTrigger,
    string PostConnectResponse,
    string Notes
);

public static class VendorPresets
{
    public static readonly Dictionary<string, VendorProfile> Presets = new(StringComparer.OrdinalIgnoreCase)
    {
        ["huawei"] = new(
            VerifyCommand:       "h {keyword}",
            ConnectCommand:      "t {name}",
            LoginUserPrompts:    ">>User name:,User name:,Username:",
            LoginPassPrompts:    ">>User password:,User password:,Password:",
            UserModePrompts:     ">",
            EnableModePrompts:   "#",
            EnableCommand:       "enable",
            DisablePagingCommand:"scroll",
            PagingTrigger:       "{ <cr>",
            PagingResponse:      "\n",
            PreCommands:         "",
            PostConnectTrigger:  "",
            PostConnectResponse: "\n",
            Notes:               "Huawei MA5800 / SmartAX. Auto-confirm `{ <cr>` saat ada prompt scroll."
        ),

        ["raisecom"] = new(
            VerifyCommand:       "h {keyword}",
            ConnectCommand:      "t {name}",
            LoginUserPrompts:    "Login:,login:",
            LoginPassPrompts:    "Password:,password:",
            UserModePrompts:     ">",
            EnableModePrompts:   "#",
            EnableCommand:       "ena",
            DisablePagingCommand:"terminal length 0",
            PagingTrigger:       "--More--",
            PagingResponse:      " ",
            PreCommands:         "",
            PostConnectTrigger:  "Press 'RETURN'",
            PostConnectResponse: "\n",
            Notes:               "Raisecom ROAP/ISCOM. `ena` minta password tambahan, retry otomatis kalau ditolak."
        ),

        ["zte"] = new(
            VerifyCommand:       "",
            ConnectCommand:      "t {name}",
            LoginUserPrompts:    "Username:,username:,Login:,login:",
            LoginPassPrompts:    "Password:,password:",
            UserModePrompts:     ">",
            EnableModePrompts:   "#",
            EnableCommand:       "ena",
            DisablePagingCommand:"terminal length 0",
            PagingTrigger:       "--More--",
            PagingResponse:      " ",
            PreCommands:         "",
            PostConnectTrigger:  "",
            PostConnectResponse: "\n",
            Notes:               "ZTE C320/C300. Enable (`ena`) minta password (sama dgn login). Sebagian SKU langsung privileged."
        ),

        ["fiberhome"] = new(
            VerifyCommand:       "h {keyword}",
            ConnectCommand:      "t {name}",
            LoginUserPrompts:    "Login:,login:,Username:",
            LoginPassPrompts:    "Password:,password:",
            UserModePrompts:     ">",
            EnableModePrompts:   "#",
            EnableCommand:       "enable",
            DisablePagingCommand:"cmd-shell-set page off",
            PagingTrigger:       "Press any key",
            PagingResponse:      " ",
            PreCommands:         "",
            PostConnectTrigger:  "",
            PostConnectResponse: "\n",
            Notes:               "FiberHome AN5516."
        ),

        ["nokia"] = new(
            VerifyCommand:       "h {keyword}",
            ConnectCommand:      "t {name}",
            LoginUserPrompts:    "login:,Login:,Username:",
            LoginPassPrompts:    "Password:,password:",
            UserModePrompts:     ">",
            EnableModePrompts:   "#",
            EnableCommand:       "",
            DisablePagingCommand:"environment no more",
            PagingTrigger:       "Press any key",
            PagingResponse:      " ",
            PreCommands:         "",
            PostConnectTrigger:  "",
            PostConnectResponse: "\n",
            Notes:               "Nokia ISAM 7360. CLI langsung privileged setelah login."
        ),

        ["mikrotik"] = new(
            VerifyCommand:       "",
            ConnectCommand:      "ssh {name}",
            LoginUserPrompts:    "Login:,login:",
            LoginPassPrompts:    "Password:,password:",
            UserModePrompts:     ">",
            EnableModePrompts:   ">",
            EnableCommand:       "",
            DisablePagingCommand:"",
            PagingTrigger:       "-- [Q quit",
            PagingResponse:      " ",
            PreCommands:         "",
            PostConnectTrigger:  "",
            PostConnectResponse: "\n",
            Notes:               "MikroTik RouterOS — biasanya lewat SSH langsung. Tidak ada enable mode."
        ),

        ["bdcom"] = new(
            VerifyCommand:       "",
            ConnectCommand:      "t {name}",
            LoginUserPrompts:    "Username:,username:",
            LoginPassPrompts:    "Password:,password:",
            UserModePrompts:     ">",
            EnableModePrompts:   "#",
            EnableCommand:       "",
            DisablePagingCommand:"terminal length 0",
            PagingTrigger:       "--More--",
            PagingResponse:      " ",
            PreCommands:         "",
            PostConnectTrigger:  "",
            PostConnectResponse: "\n",
            Notes:               "BDCOM GP3600 / S2936F. Langsung masuk privileged (#) setelah login, tidak butuh enable."
        ),

        // Generic / custom — semua field default kosong, admin isi manual.
        ["generic"] = new(
            VerifyCommand:       "",
            ConnectCommand:      "t {name}",
            LoginUserPrompts:    "Username:,Login:,login:",
            LoginPassPrompts:    "Password:,password:",
            UserModePrompts:     ">",
            EnableModePrompts:   "#",
            EnableCommand:       "",
            DisablePagingCommand:"",
            PagingTrigger:       "",
            PagingResponse:      "\n",
            PreCommands:         "",
            PostConnectTrigger:  "",
            PostConnectResponse: "\n",
            Notes:               "Custom — admin set sendiri semua field."
        ),
    };

    /// Apply preset values ke device (overwrite kolom CLI profile).
    public static void ApplyPreset(Device d, string vendor)
    {
        if (!Presets.TryGetValue(vendor, out var p)) return;
        d.Vendor               = vendor;
        d.VerifyCommand        = p.VerifyCommand;
        d.ConnectCommand       = p.ConnectCommand;
        d.LoginUserPrompts     = p.LoginUserPrompts;
        d.LoginPassPrompts     = p.LoginPassPrompts;
        d.UserModePrompts      = p.UserModePrompts;
        d.EnableModePrompts    = p.EnableModePrompts;
        d.EnableCommand        = p.EnableCommand;
        d.DisablePagingCommand = p.DisablePagingCommand;
        d.PagingTrigger        = p.PagingTrigger;
        d.PagingResponse       = p.PagingResponse;
        d.PreCommands          = p.PreCommands;
        d.PostConnectTrigger   = p.PostConnectTrigger;
        d.PostConnectResponse  = p.PostConnectResponse;
    }
}
