// Services/OltEngine.cs
// SSH/OLT Engine — menangani seluruh alur koneksi dari jumphost hingga output OLT.
// Flow: TCP check → SSH jumphost → h keyword → t OLT → login (retry) → enable → scroll → command

using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Renci.SshNet;
using Renci.SshNet.Common;

namespace OltApi.Services;

public record ExtraStep(string Trigger, string Response);

public record OltRequest(
    string OltName,
    string OltUser,
    string OltPass,
    string Command,
    List<ExtraStep>? DeviceExtraSteps  = null,
    List<ExtraStep>? CommandExtraSteps = null
);

public record OltResult(bool Success, string Output, string Error, int DurationMs);

public class OltEngine(IConfiguration cfg, ILogger<OltEngine> log)
{
    // Semua prompt konfirmasi Huawei OLT selalu diawali dengan "{ <cr>"
    const string HUAWEI_CONFIRM = "{ <cr>";

    readonly string _host    = cfg["JumpHost:Host"]!;
    readonly int    _port    = int.Parse(cfg["JumpHost:Port"]!);
    readonly string _user    = cfg["JumpHost:User"]!;
    readonly string _pass    = cfg["JumpHost:Pass"]!;
    readonly int    _sshTimeout = int.TryParse(cfg["SshConnectTimeout"], out var st) ? st : 15;
    readonly int    _cmdTimeout = int.TryParse(cfg["OltCommandTimeout"],  out var ct) ? ct : 60;

    // ─── Public entry point ────────────────────────────────────────────────────
    public async Task<OltResult> ExecuteAsync(OltRequest req)
    {
        var sw = Stopwatch.StartNew();

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
        catch (SshAuthenticationException e)
        {
            return Fail($"Auth jumphost gagal: {e.Message}", sw);
        }
        catch (Exception e)
        {
            return Fail($"SSH jumphost error: {e.Message}", sw);
        }

        try
        {
            using var ch = client.CreateShellStream("vt100", 200, 50, 800, 600, 65536);

            // Tunggu prompt jumphost [user@terminal ~]#
            var buf = Recv(ch, ["~]#", "~]$", "$ "], 15);
            if (!ContainsAny(buf, ["~]#", "~]$", "$ "]))
                return Fail("Prompt jumphost tidak muncul", sw);

            // STEP 3: h keyword — verifikasi OLT ada
            var keyword = req.OltName.Split('.')[1].ToLower();
            ch.Write($"h {keyword}\n");
            buf = Recv(ch, ["~]#", "~]$", "$ "], 10);
            if (!buf.Contains(req.OltName))
                return Fail($"OLT '{req.OltName}' tidak ditemukan di jumphost. Periksa olt_name.", sw);

            // STEP 4: t OLT_NAME — telnet ke OLT
            ch.Write($"t {req.OltName}\n");
            buf = Recv(ch, [">>User name:", "User name:", "Username:"], 20);
            if (!ContainsAny(buf, [">>User name:", "User name:", "Username:"]))
                return Fail("Prompt login OLT tidak muncul setelah telnet", sw);

            // STEP 5: Login OLT (dengan auto-retry jika password pertama ditolak)
            ch.Write(req.OltUser + "\n");
            Recv(ch, [">>User password:", "User password:", "Password:"], 10);
            ch.Write(req.OltPass + "\n");

            buf = Recv(ch, [">", "#", "incorrect", "Password:", "fail"], 20);

            if (buf.ToLower().Contains("incorrect") ||
                (buf.Contains("Password:") && !buf.Contains(">")))
            {
                log.LogWarning("Password OLT pertama ditolak, retry...");
                ch.Write(req.OltPass + "\n");
                buf = Recv(ch, [">", "#"], 20);
            }

            if (!buf.Contains(">") && !buf.Contains("#"))
                return Fail("Login OLT gagal — periksa OLT_USER / OLT_PASS", sw);

            // Device-level extra steps (e.g. login kedua untuk vendor non-Huawei)
            if (req.DeviceExtraSteps?.Count > 0)
                buf = RunExtraSteps(ch, buf, req.DeviceExtraSteps);

            string[] oltPrompts = ["OLT-01#", "OLT-02#", "MA5801#", "#"];

            // STEP 6: enable mode
            Send(ch, "enable", oltPrompts, 10);

            // STEP 7: scroll (no paging) — auto-confirm { <cr>|scrollnum }:
            Send(ch, "scroll", oltPrompts, 10);

            // STEP 8: eksekusi command dengan command-level extra steps
            var raw = SendWithExtra(ch, req.Command, oltPrompts, req.CommandExtraSteps, _cmdTimeout);

            sw.Stop();
            var clean = CleanOutput(raw, req.Command, oltPrompts);

            log.LogInformation("OK | OLT={Olt} | CMD={Cmd} | {Ms}ms",
                req.OltName, req.Command, sw.ElapsedMilliseconds);

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

    // ─── Recv: baca output sampai keyword ditemukan ────────────────────────────
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
            else Thread.Sleep(200);
        }
        return sb.ToString();
    }

    // ─── Send: kirim command + auto-confirm { <cr> } ──────────────────────────
    string Send(ShellStream ch, string cmd, string[] prompts, int timeout)
    {
        ch.Write(cmd + "\n");
        var sb = new StringBuilder();
        var sw = Stopwatch.StartNew();

        while (sw.Elapsed.TotalSeconds < timeout)
        {
            if (ch.DataAvailable)
            {
                var chunk = ch.Read();
                if (string.IsNullOrEmpty(chunk)) { Thread.Sleep(50); continue; }
                sb.Append(chunk);

                if (chunk.Contains(HUAWEI_CONFIRM))
                {
                    Thread.Sleep(100);
                    log.LogDebug("[AUTO-CONFIRM] {Cmd}", cmd);
                    ch.Write("\n");
                    continue;
                }

                if (ContainsAny(sb.ToString(), prompts)) break;
            }
            else Thread.Sleep(200);
        }
        return sb.ToString();
    }

    // ─── SendWithExtra: send + handle extra steps command-level ───────────────
    string SendWithExtra(ShellStream ch, string cmd, string[] prompts,
                         List<ExtraStep>? extras, int timeout)
    {
        ch.Write(cmd + "\n");
        var sb = new StringBuilder();
        var sw = Stopwatch.StartNew();

        while (sw.Elapsed.TotalSeconds < timeout)
        {
            if (ch.DataAvailable)
            {
                var chunk = ch.Read();
                if (string.IsNullOrEmpty(chunk)) { Thread.Sleep(50); continue; }
                sb.Append(chunk);

                // Auto-confirm Huawei
                if (chunk.Contains(HUAWEI_CONFIRM))
                {
                    Thread.Sleep(100);
                    ch.Write("\n");
                    continue;
                }

                // Command-level extra steps
                if (extras?.Count > 0)
                {
                    foreach (var step in extras)
                    {
                        if (chunk.Contains(step.Trigger))
                        {
                            Thread.Sleep(100);
                            log.LogDebug("ExtraStep triggered: {T}", step.Trigger);
                            ch.Write(step.Response + "\n");
                            break;
                        }
                    }
                }

                if (ContainsAny(sb.ToString(), prompts)) break;
            }
            else Thread.Sleep(200);
        }
        return sb.ToString();
    }

    // ─── RunExtraSteps: device-level extra steps setelah login ────────────────
    string RunExtraSteps(ShellStream ch, string currentBuf, List<ExtraStep> steps)
    {
        var buf = currentBuf;
        foreach (var step in steps)
        {
            var received = Recv(ch, [step.Trigger], 10);
            buf += received;
            if (received.Contains(step.Trigger))
            {
                ch.Write(step.Response + "\n");
                Thread.Sleep(300);
            }
        }
        return buf;
    }

    // ─── CleanOutput: buang echo command & prompt akhir ───────────────────────
    static string CleanOutput(string raw, string command, string[] prompts)
    {
        var lines  = raw.Split('\n');
        var result = new List<string>();
        var cmdStr = command.Replace(" ", "");

        foreach (var line in lines)
        {
            var s = line.Trim();
            if (s.Replace(" ", "") == cmdStr) continue;
            if (prompts.Any(p => s.Contains(p))) continue;
            if (s.Contains("[AUTO-CONFIRM]")) continue;
            result.Add(line);
        }
        return string.Join("\n", result).Trim();
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────
    static bool ContainsAny(string text, string[] arr) => arr.Any(text.Contains);

    static OltResult Fail(string msg, Stopwatch sw) =>
        new(false, "", msg, (int)sw.ElapsedMilliseconds);

    // ─── Parse extra steps dari JSON string ───────────────────────────────────
    public static List<ExtraStep>? ParseSteps(string? json)
    {
        if (string.IsNullOrEmpty(json)) return null;
        try
        {
            return JsonSerializer.Deserialize<List<ExtraStep>>(json,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch { return null; }
    }
}
