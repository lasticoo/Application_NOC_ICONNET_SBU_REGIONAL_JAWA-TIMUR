// Services/OltEngine.cs
//
// Vendor-agnostic CLI engine. Profile login & paging dibaca dari kolom Device
// (lihat Models/Device.cs) — admin tidak perlu menulis JSON apapun.
//
// Flow generik:
//   1. TCP check ke jumphost
//   2. SSH ke jumphost
//   3. (opsional) jalankan VerifyCommand utk memastikan device terdaftar
//   4. ConnectCommand   ⟶ telnet/ssh ke device
//   5. (opsional) PostConnectTrigger banner handling
//   6. Login (user/pass) dgn auto-retry sekali kalau pass ditolak
//   7. (opsional) EnableCommand + EnablePassword
//   8. (opsional) DisablePagingCommand
//   9. (opsional) PreCommands (multi-baris)
//  10. Eksekusi command utama, auto-handle PagingTrigger interaktif

using System.Diagnostics;
using System.Text;
using Renci.SshNet;
using Renci.SshNet.Common;
using OltApi.Models;

namespace OltApi.Services;

public record OltRequest(Device Device, string Command);
public record OltResult(bool Success, string Output, string Error, int DurationMs);

public class OltEngine(IConfiguration cfg, ILogger<OltEngine> log)
{
    readonly string _host       = cfg["JumpHost:Host"]!;
    readonly int    _port       = int.Parse(cfg["JumpHost:Port"]!);
    readonly string _user       = cfg["JumpHost:User"]!;
    readonly string _pass       = cfg["JumpHost:Pass"]!;
    readonly int    _sshTimeout = int.TryParse(cfg["SshConnectTimeout"], out var st) ? st : 15;
    readonly int    _cmdTimeout = int.TryParse(cfg["OltCommandTimeout"],  out var ct) ? ct : 60;

    static readonly string[] JumpPrompts = ["~]#", "~]$", "$ "];

    // ─── Public entry point ────────────────────────────────────────────────────
    public async Task<OltResult> ExecuteAsync(OltRequest req)
    {
        var sw = Stopwatch.StartNew();
        var d  = req.Device;

        // STEP 1: TCP check
        try
        {
            using var tcp = new System.Net.Sockets.TcpClient();
            var ar = tcp.BeginConnect(_host, _port, null, null);
            if (!ar.AsyncWaitHandle.WaitOne(TimeSpan.FromSeconds(8)))
                return Fail("TCP jumphost timeout — pastikan VPN aktif", sw);
            tcp.EndConnect(ar);
        }
        catch (Exception e) { return Fail($"TCP check gagal: {e.Message}", sw); }

        // STEP 2: SSH connect
        using var client = new SshClient(_host, _port, _user, _pass);
        try
        {
            client.ConnectionInfo.Timeout = TimeSpan.FromSeconds(_sshTimeout);
            client.Connect();
        }
        catch (SshAuthenticationException e) { return Fail($"Auth jumphost gagal: {e.Message}", sw); }
        catch (Exception e) { return Fail($"SSH jumphost error: {e.Message}", sw); }

        try
        {
            using var ch = client.CreateShellStream("vt100", 200, 50, 800, 600, 65536);

            // tunggu prompt jumphost
            var buf = Recv(ch, JumpPrompts, 15);
            if (!ContainsAny(buf, JumpPrompts))
                return Fail("Prompt jumphost tidak muncul", sw);

            // STEP 3: VerifyCommand (opsional)
            if (!string.IsNullOrWhiteSpace(d.VerifyCommand))
            {
                var keyword = d.Name.Split('.').Length > 1
                    ? d.Name.Split('.')[1].ToLower()
                    : d.Name.ToLower();
                var verify  = d.VerifyCommand.Replace("{keyword}", keyword)
                                             .Replace("{name}",    d.Name);
                ch.Write(verify + "\n");
                buf = Recv(ch, JumpPrompts, 10);
                if (!buf.Contains(d.Name))
                    return Fail($"Device '{d.Name}' tidak ditemukan di jumphost (verify command).", sw);
            }

            // STEP 4: ConnectCommand
            var connect = (d.ConnectCommand ?? "t {name}")
                            .Replace("{name}",     d.Name)
                            .Replace("{ip}",       d.IpAddress)
                            .Replace("{user}",     d.OltUser);
            ch.Write(connect + "\n");

            // STEP 5: PostConnect banner — kalau ada trigger, kirim respons-nya
            var loginUserSet = Csv(d.LoginUserPrompts);
            var stopList     = MergeArrays(loginUserSet,
                                          string.IsNullOrEmpty(d.PostConnectTrigger) ? [] : [d.PostConnectTrigger!]);

            buf = Recv(ch, stopList, 25);

            if (!string.IsNullOrEmpty(d.PostConnectTrigger) && buf.Contains(d.PostConnectTrigger))
            {
                ch.Write(d.PostConnectResponse ?? "\n");
                buf = Recv(ch, loginUserSet, 15);
            }

            if (!ContainsAny(buf, loginUserSet))
                return Fail("Prompt login device tidak muncul setelah connect", sw);

            // STEP 6: Login (user, pass) dgn retry
            ch.Write(d.OltUser + "\n");
            Recv(ch, Csv(d.LoginPassPrompts), 10);
            ch.Write(d.OltPass + "\n");

            var afterLogin = MergeArrays(Csv(d.UserModePrompts),
                                         Csv(d.EnableModePrompts),
                                         ["incorrect", "Password:", "fail"]);
            buf = Recv(ch, afterLogin, 20);

            if (buf.ToLower().Contains("incorrect") ||
                (buf.Contains("Password:") && !buf.Contains(">") && !buf.Contains("#")))
            {
                log.LogWarning("Password device pertama ditolak, retry...");
                ch.Write(d.OltPass + "\n");
                buf = Recv(ch, MergeArrays(Csv(d.UserModePrompts), Csv(d.EnableModePrompts)), 20);
            }

            if (!ContainsAny(buf, MergeArrays(Csv(d.UserModePrompts), Csv(d.EnableModePrompts))))
                return Fail("Login device gagal — periksa OLT_USER / OLT_PASS", sw);

            var enablePrompts = Csv(d.EnableModePrompts);
            var alreadyPriv   = ContainsAny(buf, enablePrompts) && !ContainsAny(buf, OnlyUser(d));

            // STEP 7: Enable mode
            if (!alreadyPriv && !string.IsNullOrWhiteSpace(d.EnableCommand))
            {
                ch.Write(d.EnableCommand + "\n");
                var pwTriggers = MergeArrays(Csv(d.LoginPassPrompts), enablePrompts, ["incorrect", "fail"]);
                var afterEnable = Recv(ch, pwTriggers, 10);

                if (ContainsAny(afterEnable, Csv(d.LoginPassPrompts)))
                {
                    var enaPass = string.IsNullOrEmpty(d.EnablePassword) ? d.OltPass : d.EnablePassword!;
                    ch.Write(enaPass + "\n");
                    afterEnable = Recv(ch, MergeArrays(enablePrompts, ["incorrect", "fail"]), 10);

                    if (afterEnable.ToLower().Contains("incorrect") || afterEnable.ToLower().Contains("fail"))
                    {
                        // satu retry
                        ch.Write(enaPass + "\n");
                        afterEnable = Recv(ch, enablePrompts, 10);
                    }
                }

                if (!ContainsAny(afterEnable, enablePrompts))
                    return Fail("Gagal masuk privileged-mode (enable). Cek EnableCommand / EnablePassword.", sw);
            }

            // STEP 8: Disable paging
            if (!string.IsNullOrWhiteSpace(d.DisablePagingCommand))
                Send(ch, d.DisablePagingCommand!, enablePrompts, 10, d);

            // STEP 9: Pre-commands
            if (!string.IsNullOrWhiteSpace(d.PreCommands))
            {
                foreach (var line in d.PreCommands.Split('\n', StringSplitOptions.RemoveEmptyEntries))
                {
                    var pre = line.Trim();
                    if (pre.Length == 0) continue;
                    Send(ch, pre, enablePrompts, 15, d);
                }
            }

            // STEP 10: Command utama
            var raw = Send(ch, req.Command, enablePrompts, _cmdTimeout, d);

            sw.Stop();
            var clean = CleanOutput(raw, req.Command, MergeArrays(Csv(d.UserModePrompts), enablePrompts));

            log.LogInformation("OK | {Vendor}/{Type} | {Olt} | {Cmd} | {Ms}ms",
                d.Vendor, d.DeviceType, d.Name, req.Command, sw.ElapsedMilliseconds);

            return new OltResult(true, clean, "", (int)sw.ElapsedMilliseconds);
        }
        catch (Exception e)
        {
            sw.Stop();
            log.LogError(e, "OltEngine error");
            return new OltResult(false, "", $"[{e.GetType().Name}] {e.Message}", (int)sw.ElapsedMilliseconds);
        }
        finally
        {
            if (client.IsConnected) client.Disconnect();
        }
    }

    // ─── IO helpers ───────────────────────────────────────────────────────────
    string Recv(ShellStream ch, string[] keywords, int timeout)
    {
        var sb = new StringBuilder();
        var sw = Stopwatch.StartNew();
        while (sw.Elapsed.TotalSeconds < timeout)
        {
            if (ch.DataAvailable)
            {
                var chunk = ch.Read();
                if (string.IsNullOrEmpty(chunk)) { Thread.Sleep(50); continue; }
                sb.Append(chunk);
                if (ContainsAny(sb.ToString(), keywords)) break;
            }
            else Thread.Sleep(150);
        }
        return sb.ToString();
    }

    /// Send command + auto-handle paging trigger device-specific.
    string Send(ShellStream ch, string cmd, string[] prompts, int timeout, Device d)
    {
        ch.Write(cmd + "\n");
        var sb = new StringBuilder();
        var sw = Stopwatch.StartNew();
        var pagingTrigger  = d.PagingTrigger ?? "";
        var pagingResponse = d.PagingResponse ?? "\n";

        while (sw.Elapsed.TotalSeconds < timeout)
        {
            if (ch.DataAvailable)
            {
                var chunk = ch.Read();
                if (string.IsNullOrEmpty(chunk)) { Thread.Sleep(50); continue; }
                sb.Append(chunk);

                if (!string.IsNullOrEmpty(pagingTrigger) && chunk.Contains(pagingTrigger))
                {
                    Thread.Sleep(80);
                    ch.Write(pagingResponse);
                    continue;
                }

                if (ContainsAny(sb.ToString(), prompts)) break;
            }
            else Thread.Sleep(150);
        }
        return sb.ToString();
    }

    // ─── Output cleaner ───────────────────────────────────────────────────────
    static string CleanOutput(string raw, string command, string[] prompts)
    {
        var lines  = raw.Split('\n');
        var result = new List<string>();
        var cmdNoSpace = command.Replace(" ", "");

        foreach (var line in lines)
        {
            var s = line.Trim();
            if (s.Replace(" ", "") == cmdNoSpace) continue;
            // baris yg HANYA prompt akhir → buang
            if (prompts.Any(p => !string.IsNullOrEmpty(p) && s.EndsWith(p) && s.Length <= 120 && !s.Contains(' ')))
                continue;
            result.Add(line);
        }
        return string.Join("\n", result).Trim();
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────
    static bool ContainsAny(string text, string[] arr) =>
        arr.Any(a => !string.IsNullOrEmpty(a) && text.Contains(a));

    static OltResult Fail(string msg, Stopwatch sw) =>
        new(false, "", msg, (int)sw.ElapsedMilliseconds);

    static string[] Csv(string? s) =>
        string.IsNullOrWhiteSpace(s) ? []
        : s.Split(',', StringSplitOptions.RemoveEmptyEntries)
           .Select(x => x.Trim())
           .Where(x => x.Length > 0)
           .ToArray();

    static string[] MergeArrays(params string[][] arrs) =>
        arrs.SelectMany(a => a).Distinct().ToArray();

    /// User-mode prompt kalau enable & user prompt set-nya overlap (mis. keduanya `>` & `#`).
    static string[] OnlyUser(Device d) =>
        Csv(d.UserModePrompts).Except(Csv(d.EnableModePrompts)).ToArray();
}
