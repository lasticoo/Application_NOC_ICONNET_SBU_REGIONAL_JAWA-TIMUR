-- Migrasi DB untuk fitur multi-vendor + view-password + last-seen + reactivate.
-- Jalankan SEKALI di MySQL/MariaDB setelah pull code baru:
--   mysql -u root -p noc_db < docs/migrations/2026-04-multi-vendor.sql
--
-- Idempotent: pakai `IF NOT EXISTS` (didukung MariaDB ≥ 10.0.2 & MySQL ≥ 8.0.29).
-- Tidak menyentuh `mysql.proc`, jadi aman walau XAMPP/MariaDB belum mysql_upgrade.

-- ─── Devices: kolom CLI profile baru ────────────────────────────────────────
ALTER TABLE `Devices`
    ADD COLUMN IF NOT EXISTS `DeviceType`           VARCHAR(16)  NOT NULL DEFAULT 'OLT',
    ADD COLUMN IF NOT EXISTS `VerifyCommand`        VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS `ConnectCommand`       VARCHAR(255) NOT NULL DEFAULT 't {name}',
    ADD COLUMN IF NOT EXISTS `LoginUserPrompts`     VARCHAR(512) NOT NULL DEFAULT '>>User name:,User name:,Username:,Login:',
    ADD COLUMN IF NOT EXISTS `LoginPassPrompts`     VARCHAR(512) NOT NULL DEFAULT '>>User password:,User password:,Password:',
    ADD COLUMN IF NOT EXISTS `UserModePrompts`      VARCHAR(255) NOT NULL DEFAULT '>',
    ADD COLUMN IF NOT EXISTS `EnableModePrompts`    VARCHAR(255) NOT NULL DEFAULT '#',
    ADD COLUMN IF NOT EXISTS `EnableCommand`        VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS `EnablePassword`       VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS `DisablePagingCommand` VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS `PagingTrigger`        VARCHAR(64)  NULL,
    ADD COLUMN IF NOT EXISTS `PagingResponse`       VARCHAR(8)   NULL,
    ADD COLUMN IF NOT EXISTS `PreCommands`          TEXT         NULL,
    ADD COLUMN IF NOT EXISTS `PostConnectTrigger`   VARCHAR(128) NULL,
    ADD COLUMN IF NOT EXISTS `PostConnectResponse`  VARCHAR(8)   NULL,
    ADD COLUMN IF NOT EXISTS `UpdatedAt`            DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6);

-- Backfill default Huawei utk semua device existing supaya engine baru tetap jalan.
UPDATE `Devices` SET
    VerifyCommand        = COALESCE(VerifyCommand,        'h {keyword}'),
    ConnectCommand       = CASE WHEN ConnectCommand IS NULL OR ConnectCommand = '' THEN 't {name}' ELSE ConnectCommand END,
    LoginUserPrompts     = CASE WHEN LoginUserPrompts IS NULL OR LoginUserPrompts = '' THEN '>>User name:,User name:,Username:' ELSE LoginUserPrompts END,
    LoginPassPrompts     = CASE WHEN LoginPassPrompts IS NULL OR LoginPassPrompts = '' THEN '>>User password:,User password:,Password:' ELSE LoginPassPrompts END,
    UserModePrompts      = CASE WHEN UserModePrompts  IS NULL OR UserModePrompts  = '' THEN '>' ELSE UserModePrompts END,
    EnableModePrompts    = CASE WHEN EnableModePrompts IS NULL OR EnableModePrompts = '' THEN '#' ELSE EnableModePrompts END,
    EnableCommand        = COALESCE(EnableCommand,        'enable'),
    DisablePagingCommand = COALESCE(DisablePagingCommand, 'scroll'),
    PagingTrigger        = COALESCE(PagingTrigger,        '{ <cr>'),
    PagingResponse       = COALESCE(PagingResponse,       '\n'),
    PostConnectResponse  = COALESCE(PostConnectResponse,  '\n')
WHERE Vendor = 'huawei' OR Vendor IS NULL;

-- ─── Users: kolom baru ──────────────────────────────────────────────────────
ALTER TABLE `Users`
    ADD COLUMN IF NOT EXISTS `PhoneNumber`       VARCHAR(32)  NULL,
    ADD COLUMN IF NOT EXISTS `EncryptedPassword` VARCHAR(512) NULL,
    ADD COLUMN IF NOT EXISTS `LastSeenAt`        DATETIME(6)  NULL,
    ADD COLUMN IF NOT EXISTS `UpdatedAt`         DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6);

-- ─── Buttons: UpdatedAt (jika belum ada di skema lama) ──────────────────────
ALTER TABLE `Buttons`
    ADD COLUMN IF NOT EXISTS `UpdatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6);
