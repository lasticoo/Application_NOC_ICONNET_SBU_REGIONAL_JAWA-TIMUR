-- Migrasi DB untuk fitur multi-vendor + view-password + last-seen + reactivate.
-- Jalankan SEKALI di MySQL setelah pull code baru:
--   mysql -u root -p noc_db < docs/migrations/2026-04-multi-vendor.sql
--
-- Migrasi ini idempotent: pakai INFORMATION_SCHEMA agar boleh dijalankan berkali-kali.

-- ─── helper procedure utk ADD COLUMN aman ───────────────────────────────────
DROP PROCEDURE IF EXISTS noc_add_col;
DELIMITER $$
CREATE PROCEDURE noc_add_col(
    IN tbl  VARCHAR(64),
    IN col  VARCHAR(64),
    IN ddl  TEXT
)
BEGIN
    DECLARE n INT;
    SELECT COUNT(*) INTO n FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = tbl
        AND COLUMN_NAME  = col;
    IF n = 0 THEN
        SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN ', ddl);
        PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
    END IF;
END$$
DELIMITER ;

-- ─── Devices: kolom CLI profile baru ────────────────────────────────────────
CALL noc_add_col('Devices', 'DeviceType',           '`DeviceType` VARCHAR(16) NOT NULL DEFAULT ''OLT''');
CALL noc_add_col('Devices', 'VerifyCommand',        '`VerifyCommand` VARCHAR(255) NULL');
CALL noc_add_col('Devices', 'ConnectCommand',       '`ConnectCommand` VARCHAR(255) NOT NULL DEFAULT ''t {name}''');
CALL noc_add_col('Devices', 'LoginUserPrompts',     '`LoginUserPrompts` VARCHAR(512) NOT NULL DEFAULT ''>>User name:,User name:,Username:,Login:''');
CALL noc_add_col('Devices', 'LoginPassPrompts',     '`LoginPassPrompts` VARCHAR(512) NOT NULL DEFAULT ''>>User password:,User password:,Password:''');
CALL noc_add_col('Devices', 'UserModePrompts',      '`UserModePrompts` VARCHAR(255) NOT NULL DEFAULT ''>''');
CALL noc_add_col('Devices', 'EnableModePrompts',    '`EnableModePrompts` VARCHAR(255) NOT NULL DEFAULT ''#''');
CALL noc_add_col('Devices', 'EnableCommand',        '`EnableCommand` VARCHAR(255) NULL');
CALL noc_add_col('Devices', 'EnablePassword',       '`EnablePassword` VARCHAR(255) NULL');
CALL noc_add_col('Devices', 'DisablePagingCommand', '`DisablePagingCommand` VARCHAR(255) NULL');
CALL noc_add_col('Devices', 'PagingTrigger',        '`PagingTrigger` VARCHAR(64)  NULL');
CALL noc_add_col('Devices', 'PagingResponse',       '`PagingResponse` VARCHAR(8)  NULL');
CALL noc_add_col('Devices', 'PreCommands',          '`PreCommands` TEXT NULL');
CALL noc_add_col('Devices', 'PostConnectTrigger',   '`PostConnectTrigger` VARCHAR(128) NULL');
CALL noc_add_col('Devices', 'PostConnectResponse',  '`PostConnectResponse` VARCHAR(8)  NULL');
CALL noc_add_col('Devices', 'UpdatedAt',            '`UpdatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)');

-- Backfill default Huawei utk semua device existing supaya engine baru tetap jalan.
UPDATE Devices SET
  VerifyCommand        = COALESCE(VerifyCommand,        'h {keyword}'),
  ConnectCommand       = CASE WHEN ConnectCommand = '' OR ConnectCommand IS NULL THEN 't {name}' ELSE ConnectCommand END,
  LoginUserPrompts     = CASE WHEN LoginUserPrompts = '' THEN '>>User name:,User name:,Username:' ELSE LoginUserPrompts END,
  LoginPassPrompts     = CASE WHEN LoginPassPrompts = '' THEN '>>User password:,User password:,Password:' ELSE LoginPassPrompts END,
  UserModePrompts      = CASE WHEN UserModePrompts  = '' THEN '>' ELSE UserModePrompts END,
  EnableModePrompts    = CASE WHEN EnableModePrompts= '' THEN '#' ELSE EnableModePrompts END,
  EnableCommand        = COALESCE(EnableCommand,        'enable'),
  DisablePagingCommand = COALESCE(DisablePagingCommand, 'scroll'),
  PagingTrigger        = COALESCE(PagingTrigger,        '{ <cr>'),
  PagingResponse       = COALESCE(PagingResponse,       '\n'),
  PostConnectResponse  = COALESCE(PostConnectResponse,  '\n')
WHERE Vendor = 'huawei' OR Vendor IS NULL;

-- ─── Users: kolom baru ──────────────────────────────────────────────────────
CALL noc_add_col('Users', 'PhoneNumber',       '`PhoneNumber` VARCHAR(32) NULL');
CALL noc_add_col('Users', 'EncryptedPassword', '`EncryptedPassword` VARCHAR(512) NULL');
CALL noc_add_col('Users', 'LastSeenAt',        '`LastSeenAt` DATETIME(6) NULL');
CALL noc_add_col('Users', 'UpdatedAt',         '`UpdatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)');

-- ─── Buttons: kolom UpdatedAt sudah ada di skema lama, ExtraSteps tetap untuk
--      kompatibilitas (tidak dipakai engine baru, boleh dibiarkan saja). ────
CALL noc_add_col('Buttons', 'UpdatedAt', '`UpdatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)');

DROP PROCEDURE noc_add_col;
