# NOC OLT Management System

Sistem manajemen OLT untuk NOC dan teknisi lapangan PLN Icon+.

---

## Struktur Project

```
noc-system/
├── backend/          ← ASP.NET Core 10 API
├── noc-admin/        ← React + Vite admin web panel
└── noc-mobile/       ← React Native (Expo SDK 54) mobile app
```

---

## Cara Menjalankan

### 1. Setup MySQL

```bash
mysql -u root -p
CREATE DATABASE noc_db CHARACTER SET utf8mb4;
EXIT;
```

Edit `backend/appsettings.json` → ganti `YOUR_MYSQL_PASSWORD` dengan password MySQL kamu.

### 2. Backend (.NET 10)

```bash
cd backend

# Install .NET 10 SDK jika belum ada
# https://dotnet.microsoft.com/download/dotnet/10.0

dotnet restore
dotnet build
dotnet run
# API berjalan di http://0.0.0.0:5006
# Swagger UI: http://localhost:5006/swagger
```

### 3. Admin Web (React)

```bash
cd noc-admin
npm install
npm run dev
# Buka http://localhost:5173
# Login: admin / admin123
```

### 4. Mobile (React Native Expo)

```bash
cd noc-mobile

# Pastikan Node 20 aktif
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
node --version   # harus v20.x

# Edit api/client.js → ganti IP dengan IP laptop di WiFi
# ip addr show | grep "inet " | grep -v 127

npm install
npx expo start --clear
# Scan QR dengan Expo Go di HP
```

---

## Default Credentials

| Role  | Username | Password  |
|-------|----------|-----------|
| Admin | admin    | admin123  |

Ganti password setelah pertama login via Swagger: `POST /api/auth/users`

---

## API Endpoints

| Method | URL | Auth | Keterangan |
|--------|-----|------|------------|
| POST | /api/auth/login | None | Login |
| GET  | /api/auth/users | Admin | Daftar user |
| POST | /api/auth/users | Admin | Buat user |
| GET  | /api/devices | Any | Daftar OLT |
| POST | /api/devices | Admin | Tambah OLT |
| GET  | /api/buttons | Admin | Semua button |
| POST | /api/buttons | Admin | Buat button |
| GET  | /api/buttons/my | User | Button milik saya |
| POST | /api/execute | Any | Eksekusi command |
| GET  | /api/logs | Admin | Semua log |
| GET  | /api/logs/my | Any | Log saya |
| GET  | /api/logs/today | Admin | Aktivitas hari ini |

---

## Extra Steps (Multi-Vendor)

Untuk device yang butuh autentikasi tambahan, isi field `extraStepsJson`:

```json
[{"trigger": "Password:", "response": "enable_password"}]
```

Bisa diset di level device (berlaku untuk semua command) atau level button (khusus command tertentu).

---

## Catatan Penting

- Koneksi ke SSH Jumphost **wajib melalui VPN kantor**
- Jumphost credential tersimpan statis di `appsettings.json` — jangan commit ke Git
- Ganti `JWT:Key` di `appsettings.json` dengan random string panjang sebelum production
