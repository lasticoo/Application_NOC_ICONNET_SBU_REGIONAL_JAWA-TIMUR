
# NOC OLT Management System

Sistem manajemen OLT/FDT/FAT multi-vendor untuk NOC & teknisi lapangan
PLN Icon+ SBU Regional Jawa Timur.

> **Stack**: ASP.NET Core 10 · MySQL · React + Vite · React Native (Expo SDK 54)

---

## Daftar Isi
1. [Arsitektur](#1-arsitektur)
2. [Apa yang Baru (v2)](#2-apa-yang-baru-v2)
3. [Setup & Menjalankan](#3-setup--menjalankan)
4. [Migrasi Database](#4-migrasi-database)
5. [Multi-Vendor Device Profile](#5-multi-vendor-device-profile)
6. [Vendor Preset Bawaan](#6-vendor-preset-bawaan)
7. [Manajemen User](#7-manajemen-user)
8. [Online User Monitoring](#8-online-user-monitoring)
9. [Mobile App (Teknisi)](#9-mobile-app-teknisi)
10. [API Reference](#10-api-reference)
11. [Default Credentials & Catatan Keamanan](#11-default-credentials--catatan-keamanan)

---

## 1. Arsitektur

```
noc-system/
├── backend/          ← ASP.NET Core 10 API + EF Core (MySQL)
│   ├── Controllers/  ← Auth, Devices, Buttons, Execute, Logs, Stats
│   ├── Services/     ← OltEngine, VendorPresets, PasswordVault, LastSeenMiddleware
│   └── Models/       ← User, Device, Button, ActivityLog
├── noc-admin/        ← React + Vite admin web (login admin, kelola user/device/button/log)
├── noc-mobile/       ← React Native (Expo) untuk teknisi lapangan
└── docs/migrations/  ← SQL migration scripts (idempotent)
```

**Alur eksekusi command** (single SSH-jumphost pattern):

```
Mobile App → Backend API → SSH ke jumphost (10.14.4.5) → Telnet/SSH ke OLT/FDT/FAT
                                                       → login + (opsional) enable mode
                                                       → disable paging
                                                       → kirim command + auto-handle paging
                                                       → simpan output ke ActivityLog
```

---

## 2. Apa yang Baru (v2)

| Area | Sebelumnya | Sekarang |
|------|-----------|----------|
| Multi-vendor | Hardcode Huawei + JSON `extra_step` | **Form-based**, 8 preset (Huawei, Raisecom, ZTE, BDCOM, Fiberhome, Nokia, Mikrotik, Generic), bisa diatur admin tanpa coding |
| Tipe device | OLT saja | OLT, FDT, FAT |
| Edit data | Hanya tambah/hapus | **Edit penuh** untuk Devices, Buttons, Users (log activity tetap read-only) |
| Password user | Hanya hash, tidak bisa dilihat admin | Hash tetap dipakai untuk login + **plaintext ter-enkripsi AES-256 GCM** untuk fitur view & change (admin re-auth) |
| Aktivasi user | Hanya bisa nonaktif | **Aktifkan kembali** user yang sudah dinonaktifkan |
| Online user | Tidak ada | **Indikator online** (LastSeenAt + middleware) + widget di dashboard |
| Mobile UI | Plain navy | **Theme pink ICONNET** + bottom nav tabs (Activity, Home, Profile) |
| Mobile terminal | Output kepotong | Scroll horizontal + vertikal, monospace, **brightness otomatis 100 %** |
| Mobile profile | — | Layar Profile + Edit Profile |

---

## 3. Setup & Menjalankan

### 3.1 MySQL
```bash
mysql -u root -p
CREATE DATABASE noc_db CHARACTER SET utf8mb4;
EXIT;
```

Edit `backend/appsettings.json` → ganti `YOUR_MYSQL_PASSWORD`.

### 3.2 Backend (.NET 10)
```bash
cd backend
dotnet restore
dotnet build
dotnet run
# http://0.0.0.0:5006     · Swagger: /swagger
```

User `admin / admin123` otomatis dibuat saat pertama kali run (dengan hash login + plaintext ter-enkripsi AES untuk fitur view password).

### 3.3 Admin Web (React + Vite)
```bash
cd noc-admin
npm install
npm run dev      # http://localhost:5173
```

### 3.4 Mobile (Expo)
```bash
cd noc-mobile
node --version           # pastikan Node 20.x

# Tambahan dep baru (lihat catatan di bagian 9):
npm i expo-brightness

# Edit api/client.js → ganti IP dengan IP laptop di WiFi
npm install
npx expo start --clear
```

---

## 4. Migrasi Database

> **Wajib jalankan** sebelum start backend versi v2 (kalau database lama sudah ada data).
> Script bersifat **idempotent** — aman dijalankan berulang.

```bash
mysql -u root -p noc_db < docs/migrations/2026-04-multi-vendor.sql
```

Script ini menambahkan kolom-kolom baru ke 3 tabel:

| Tabel    | Kolom Baru |
|----------|------------|
| Devices  | `DeviceType`, `VerifyCommand`, `ConnectCommand`, `LoginUserPrompts`, `LoginPassPrompts`, `UserModePrompts`, `EnableModePrompts`, `EnableCommand`, `EnablePassword`, `DisablePagingCommand`, `PagingTrigger`, `PagingResponse`, `PreCommands`, `PostConnectTrigger`, `PostConnectResponse`, `UpdatedAt` |
| Users    | `PhoneNumber`, `EncryptedPassword`, `LastSeenAt`, `UpdatedAt` |
| Buttons  | `UpdatedAt` |

**Tidak ada perubahan struktur tabel `ActivityLogs`.** Field `RawOutput` sudah ada
sejak v1, dan sekarang juga ditampilkan di admin web.

> Kalau database masih kosong / fresh, EF Core akan otomatis bikin schema saat
> `dotnet run` pertama (`EnsureCreatedAsync`). Migration SQL hanya perlu dijalankan
> kalau Anda upgrade dari v1.

---

## 5. Multi-Vendor Device Profile

Di **v1**, device hanya punya field auth dasar (user/password) plus `extraStepsJson` —
admin harus paham JSON. Di **v2** kita pakai **form terstruktur** yang dibaca
oleh `OltEngine` secara generic. Admin tinggal pilih vendor → preset terisi
otomatis → tweak field bila perlu.

### 5.1 Anatomi `Device` (15 field CLI profile)

| Field | Default (Huawei) | Fungsi |
|-------|------------------|--------|
| `DeviceType` | `olt` | `olt`, `fdt`, atau `fat` |
| `Vendor` | `huawei` | Untuk preset matching |
| `VerifyCommand` | *(kosong)* | Misal `tlist {keyword}` di jumphost untuk verifikasi nama |
| `ConnectCommand` | `t {name}` | Command di jumphost untuk konek ke OLT |
| `LoginUserPrompts` | `User name:,Login:,Username:` | CSV prompt yang menandakan minta username |
| `LoginPassPrompts` | `User password:,Password:` | CSV prompt yang menandakan minta password |
| `UserModePrompts` | `>` | Karakter prompt user-mode (sebelum enable) |
| `EnableModePrompts` | `#` | Karakter prompt privileged-mode |
| `EnableCommand` | `enable` | Diisi kalau perlu privilege escalation; kosongkan kalau tidak |
| `EnablePassword` | *(kosong)* | Password untuk perintah enable; biarkan kosong kalau enable tidak minta password |
| `DisablePagingCommand` | *(kosong)* | Misal `terminal length 0` (Raisecom). Kalau kosong, paging di-handle generik |
| `PagingTrigger` | `{ <cr>` | Substring yang muncul saat paging perlu dilanjutkan |
| `PagingResponse` | `\n` | Yang dikirim saat trigger ditemukan (`\n`, `space`, `\r`, dst) |
| `PreCommands` | *(kosong)* | Multi-line command yang dijalankan sebelum command utama |
| `PostConnectTrigger` | *(kosong)* | Banner yang muncul setelah connect (mis. Raisecom: `Press 'RETURN'`) |
| `PostConnectResponse` | *(kosong)* | Reply atas banner di atas (mis. `\r\n`) |

### 5.2 Generic 10-Step Flow di `OltEngine`

```
1. TCP-check ke jumphost (8 detik timeout)
2. SSH connect ke jumphost (Renci.SshNet → ShellStream)
3. Tunggu prompt jumphost (~]#, ~]$, $)
4. (Opsional) Kirim VerifyCommand
5. Kirim ConnectCommand (placeholder {name},{ip},{user})
6. (Opsional) Tangani PostConnectTrigger / PostConnectResponse
7. Login: kirim user+password dengan auto-retry kalau gagal
8. (Opsional) EnableCommand → kalau prompt minta password, kirim EnablePassword
9. (Opsional) DisablePagingCommand
10. Kirim PreCommands (kalau ada) lalu command utama, dengan
    auto-handle paging (cek PagingTrigger di stream → kirim PagingResponse)
```

Semua step yang opsional dilewati kalau field-nya kosong, jadi **flow bisa berbeda
per vendor tanpa coding**:

- **Huawei** sederhana: butuh `enable` (tanpa password), paging via `{ <cr>`.
- **Raisecom** kompleks: ada banner `Press 'RETURN'` setelah connect, butuh
  `ena` + password yang kadang gagal sekali (engine retry otomatis), paging via
  `--More--` direspons `<space>`, dan `terminal length 0` opsional untuk disable paging.
- **Mikrotik / FAT**: tidak butuh enable, prompt-nya `[user@router] >`.

### 5.3 Cara Admin Menambah / Edit Device (UI)

1. Buka **Devices** → **Tambah Perangkat**.
2. Isi: nama, label, IP, user/password OLT.
3. Pilih **Vendor** dari dropdown — preset terisi otomatis di section "Advanced".
4. (Opsional) tweak field di "Advanced" untuk customisasi unik.
5. **Simpan**.

Field utama: <ref_file file="/home/ubuntu/repos/Application_NOC_ICONNET_SBU_REGIONAL_JAWA-TIMUR/noc-admin/src/pages/DevicesPage.jsx" />

---

## 6. Vendor Preset Bawaan

Disimpan di `backend/Services/VendorPresets.cs`. Sekarang ada 8 preset; tinggal
tambah entry di dictionary kalau ada vendor baru.

| Vendor | EnableCommand | Paging Trigger | Paging Response | Disable Paging | Catatan |
|--------|--------------|---------------|----------------|---------------|---------|
| huawei | `enable` | `{ <cr>` | `\n` | — | Default v1 |
| raisecom | `ena` (+pass) | `--More--` | ` ` (space) | `terminal length 0` | Banner `Press 'RETURN'` setelah connect |
| zte | `ena` (+pass) | `--More--` | ` ` | `terminal length 0` | Enable minta password (sama dgn login) |
| bdcom | *(kosong)* | `--More--` | ` ` (space) | `terminal length 0` | Langsung privileged setelah login |
| fiberhome | `enable` | `Press any key` | `\n` | `screen-length 0` | |
| nokia | `enable` (+pass) | `Press any key` | `\n` | `environment no more` | Banner login `Username:` |
| mikrotik | *(kosong)* | — | — | — | Tidak butuh enable; prompt `[user@host] >` |
| generic | `enable` | `--More--` | ` ` | — | Fallback aman |

> File: <ref_file file="/home/ubuntu/repos/Application_NOC_ICONNET_SBU_REGIONAL_JAWA-TIMUR/backend/Services/VendorPresets.cs" />

---

## 7. Manajemen User

### 7.1 Endpoint Baru

| Endpoint | Role | Fungsi |
|----------|------|--------|
| `PATCH /api/auth/users/{id}` | admin | Edit fullName / phoneNumber / role |
| `PATCH /api/auth/users/{id}/deactivate` | admin | Soft-delete |
| `PATCH /api/auth/users/{id}/activate` | admin | Re-aktifkan user yang sudah dinonaktifkan |
| `POST  /api/auth/users/{id}/password/view` | admin | Body: `{adminPassword}`. Re-auth admin → return plaintext (didekripsi dari `EncryptedPassword`) |
| `POST  /api/auth/users/{id}/password/change` | admin | Body: `{adminPassword,newPassword}`. Re-auth → hash + encrypt + simpan |
| `GET   /api/auth/me` / `PATCH /api/auth/me` | any | Self profile (mobile) |

### 7.2 Penyimpanan Password Ganda

| Kolom | Tipe | Dipakai untuk |
|-------|------|--------------|
| `PasswordHash` | BCrypt hash (tetap) | Verifikasi login (one-way, tidak pernah didekripsi) |
| `EncryptedPassword` | AES-256 GCM ciphertext (base64) | Fitur "view password" admin (key derived dari `Jwt:Key` via SHA-256) |

**Kenapa dua-duanya?** Karena kebutuhan "lihat password" ≠ "verifikasi password".
BCrypt one-way (idiomatic & aman untuk login), AES reversible (bisa didekripsi
oleh admin saat butuh handover). Keduanya selalu di-update bersamaan via
`POST /password/change`.

> File: <ref_file file="/home/ubuntu/repos/Application_NOC_ICONNET_SBU_REGIONAL_JAWA-TIMUR/backend/Services/PasswordVault.cs" /> · `Encrypt()` / `TryDecrypt()`.

### 7.3 Proteksi

- Tidak bisa nonaktif/turunkan role admin terakhir (`AuthController.UpdateUser` &
  `Deactivate`).
- View/Change password **wajib** kirim `adminPassword` dari admin yang sedang login
  (bukan password user target). Server verifikasi via `VerifyAdminPassword()`.

---

## 8. Online User Monitoring

### 8.1 Mekanisme

1. `LastSeenMiddleware` dipasang setelah `UseAuthorization()`.
2. Setiap request dengan JWT valid → update `Users.LastSeenAt = DateTime.UtcNow`.
3. Throttled 60 detik per user via `IMemoryCache` agar tidak spam DB.
4. User dianggap **online** kalau `LastSeenAt > now - 5 menit`.

### 8.2 Endpoint

| Endpoint | Fungsi |
|----------|--------|
| `GET /api/stats/online` | List user online (5 menit terakhir), urut LastSeenAt desc |
| `GET /api/stats/dashboard` | `{ totalUsers, onlineUsers, totalDevices, totalButtons, executionsToday, successRateToday }` |

UI: dashboard admin punya widget "User Online" yang refresh tiap 30 detik
(<ref_file file="/home/ubuntu/repos/Application_NOC_ICONNET_SBU_REGIONAL_JAWA-TIMUR/noc-admin/src/pages/DashboardPage.jsx" />).

### 8.3 Indikator di Tabel User

`UsersPage.jsx` menampilkan titik hijau di samping nama user yang online dan
kolom "Last Seen" (jam terakhir aktif). Auto-refresh 30 detik.

---

## 9. Mobile App (Teknisi)

### 9.1 Dependency Baru

```bash
cd noc-mobile
npm i expo-brightness          # untuk paksa brightness 100%
```

> Kalau `expo-brightness` belum terpasang, kode `utils/brightness.js` otomatis
> jadi no-op tanpa crash, jadi aman dijalankan dulu walau lupa install.

### 9.2 Struktur Layar

```
App.js                         ← Stack navigator: Login → Main → Result/EditProfile
screens/
├── LoginScreen.js             ← Theme pink ICONNET, brand ICON+
├── MainScreen.js              ← Container 3-tab (Activity / Home / Profile)
├── tabs/
│   ├── HomeTab.js             ← Greeting + grid kota (auto dari device.name) + tugas hari ini
│   ├── ActivityTab.js         ← History eksekusi user (call /api/logs/my)
│   └── ProfileTab.js          ← Profile + tombol edit + logout
├── EditProfileScreen.js       ← Edit nama + no telp (call PATCH /api/auth/me)
└── ResultScreen.js            ← Output terminal: scroll H+V, monospace, brightness 100%
theme.js                       ← Token warna/spacing/radius global
utils/brightness.js            ← forceMax() / restore() pakai expo-brightness
```

### 9.3 Fix Terminal Terpotong

Output sebelumnya dibungkus 1 ScrollView vertikal saja → baris panjang ter-wrap
dan tabel CLI rusak. Sekarang:

```jsx
<ScrollView vertical>
  <ScrollView horizontal>
    <Text style={{ fontFamily: 'monospace' }}>{output}</Text>
  </ScrollView>
</ScrollView>
```

`Text` di dalam `<ScrollView horizontal>` tidak wrap, jadi tabel `display ont info`
dari Huawei / `show int gpon-onu online-information` Raisecom tetap utuh dan
bisa di-scroll dua arah.

### 9.4 Brightness Otomatis

Di `App.js` saat boot, `forceMax()` request permission lalu set system brightness
= 1.0. Di `ResultScreen` kita panggil lagi (kalau-kalau user matikan layar).
`Profile → Logout` memanggil `restore()` untuk balikin ke setting awal.

---

## 10. API Reference

### Auth
| Method | URL | Role | Body |
|--------|-----|------|------|
| POST | `/api/auth/login` | — | `{username,password}` |
| GET  | `/api/auth/me` | any | — |
| PATCH| `/api/auth/me` | any | `{fullName,phoneNumber,role}` |
| POST | `/api/auth/users` | admin | `{username,password,fullName,phoneNumber,role}` |
| GET  | `/api/auth/users?online=true` | admin | — |
| PATCH| `/api/auth/users/{id}` | admin | `{fullName,phoneNumber,role}` |
| PATCH| `/api/auth/users/{id}/deactivate` | admin | — |
| PATCH| `/api/auth/users/{id}/activate` | admin | — |
| POST | `/api/auth/users/{id}/password/view` | admin | `{adminPassword}` |
| POST | `/api/auth/users/{id}/password/change` | admin | `{adminPassword,newPassword}` |

### Devices
| Method | URL | Role |
|--------|-----|------|
| GET    | `/api/devices?includeInactive=true` | any |
| GET    | `/api/devices/{id}` | any |
| GET    | `/api/devices/presets` | admin |
| POST   | `/api/devices` | admin |
| PATCH  | `/api/devices/{id}` | admin |
| DELETE | `/api/devices/{id}` | admin |
| PATCH  | `/api/devices/{id}/activate` | admin |

### Buttons
| Method | URL | Role |
|--------|-----|------|
| GET    | `/api/buttons?includeInactive=true&userId=&deviceId=` | admin |
| GET    | `/api/buttons/my` | user |
| POST   | `/api/buttons` | admin |
| PATCH  | `/api/buttons/{id}` | admin |
| DELETE | `/api/buttons/{id}` | admin |
| PATCH  | `/api/buttons/{id}/activate` | admin |

### Execute / Logs / Stats
| Method | URL | Role |
|--------|-----|------|
| POST | `/api/execute` | any | `{buttonId,parameters}` |
| GET  | `/api/logs/my` | any |
| GET  | `/api/logs?userId=&deviceId=` | admin |
| GET  | `/api/logs/today` | admin |
| GET  | `/api/stats/online` | admin |
| GET  | `/api/stats/dashboard` | admin |

---

## 11. Default Credentials & Catatan Keamanan

| Role  | Username | Password  |
|-------|----------|-----------|
| Admin | admin    | admin123  |

> Wajib ganti `admin123` di production.

- Koneksi ke SSH Jumphost wajib via VPN kantor.
- Jumphost credential di `appsettings.json` — jangan commit ke Git.
- Ganti `Jwt:Key` ke random string 64+ char sebelum production.
  Kunci ini juga jadi seed AES untuk `EncryptedPassword`, jadi kalau key
  diganti **di tengah jalan**, password lama tidak bisa lagi dilihat (login
  tetap jalan karena pakai BCrypt hash). Solusi: minta user reset password.
- Hash BCrypt dan ciphertext AES disimpan terpisah di kolom berbeda; tidak
  pernah dipertukarkan.
- `LastSeenAt` di-update via middleware setelah authorization, jadi tidak ada
  request anonim yang bisa "menghidupkan" status user.

# Macro-Button-NOC
Aplikasi dengan sistem pengecekan otomatis yang bisa dilakukan dimanapun sebagai teknisi(Mobile), dan admin(Web) untuk memanage button user

