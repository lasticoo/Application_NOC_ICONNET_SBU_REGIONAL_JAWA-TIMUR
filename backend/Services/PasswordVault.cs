// Services/PasswordVault.cs
//
// AES-256 GCM symmetric encryption supaya admin bisa "view password" user setelah
// re-authenticate. Login tetap pakai BCrypt hash di kolom PasswordHash.
//
// Key di-derive dari Jwt:Key di appsettings.json supaya tidak menambah secret baru.
// Format ciphertext: base64( nonce[12] || tag[16] || ciphertext )

using System.Security.Cryptography;
using System.Text;

namespace OltApi.Services;

public class PasswordVault(IConfiguration cfg)
{
    readonly byte[] _key = DeriveKey(cfg["Jwt:Key"]
        ?? throw new InvalidOperationException("Jwt:Key wajib di appsettings"));

    static byte[] DeriveKey(string secret)
    {
        // SHA-256 dari secret → 32 byte key untuk AES-256.
        return SHA256.HashData(Encoding.UTF8.GetBytes(secret));
    }

    public string Encrypt(string plaintext)
    {
        var nonce      = RandomNumberGenerator.GetBytes(12);
        var plainBytes = Encoding.UTF8.GetBytes(plaintext);
        var cipher     = new byte[plainBytes.Length];
        var tag        = new byte[16];

        using var aes = new AesGcm(_key, 16);
        aes.Encrypt(nonce, plainBytes, cipher, tag);

        var output = new byte[nonce.Length + tag.Length + cipher.Length];
        Buffer.BlockCopy(nonce,  0, output, 0,                        nonce.Length);
        Buffer.BlockCopy(tag,    0, output, nonce.Length,             tag.Length);
        Buffer.BlockCopy(cipher, 0, output, nonce.Length + tag.Length, cipher.Length);
        return Convert.ToBase64String(output);
    }

    public string? TryDecrypt(string? ciphertext)
    {
        if (string.IsNullOrEmpty(ciphertext)) return null;
        try
        {
            var blob   = Convert.FromBase64String(ciphertext);
            if (blob.Length < 28) return null;

            var nonce  = blob.AsSpan(0,  12).ToArray();
            var tag    = blob.AsSpan(12, 16).ToArray();
            var cipher = blob.AsSpan(28).ToArray();
            var plain  = new byte[cipher.Length];

            using var aes = new AesGcm(_key, 16);
            aes.Decrypt(nonce, cipher, tag, plain);
            return Encoding.UTF8.GetString(plain);
        }
        catch
        {
            return null;
        }
    }
}
