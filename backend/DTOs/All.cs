namespace OltApi.DTOs;

// ── Auth ─────────────────────────────────────────────────────────────────────
public record LoginRequest(string Username, string Password);
public record LoginResponse(string Token, string Role, string FullName, int UserId);

public record CreateUserRequest(
    string Username, string FullName, string Password, string Role,
    string? PhoneNumber = null);

/// PATCH /api/auth/users/{id} — edit profile (tanpa password).
public record UpdateUserRequest(
    string FullName, string Role, string? PhoneNumber);

/// POST /api/auth/users/{id}/password/view — admin re-auth utk lihat password user.
public record AdminReauthRequest(string AdminPassword);

/// POST /api/auth/users/{id}/password/change — admin re-auth + ganti password user.
public record ChangeUserPasswordRequest(string AdminPassword, string NewPassword);

public record UserResponse(
    int Id, string Username, string FullName, string? PhoneNumber,
    string Role, bool IsActive,
    DateTime? LastSeenAt, bool IsOnline,
    DateTime CreatedAt);

// ── Device ───────────────────────────────────────────────────────────────────
public record DeviceRequest(
    string  Name,
    string  Label,
    string  IpAddress,
    string  OltUser,
    string  OltPass,
    string  Vendor               = "huawei",
    string  DeviceType           = "OLT",

    string? VerifyCommand        = null,
    string? ConnectCommand       = null,
    string? LoginUserPrompts     = null,
    string? LoginPassPrompts     = null,
    string? UserModePrompts      = null,
    string? EnableModePrompts    = null,
    string? EnableCommand        = null,
    string? EnablePassword       = null,
    string? DisablePagingCommand = null,
    string? PagingTrigger        = null,
    string? PagingResponse       = null,
    string? PreCommands          = null,
    string? PostConnectTrigger   = null,
    string? PostConnectResponse  = null
);

public record DeviceResponse(
    int     Id,
    string  Name,
    string  Label,
    string  IpAddress,
    string  Vendor,
    string  DeviceType,
    bool    IsActive,
    string? VerifyCommand,
    string  ConnectCommand,
    string  LoginUserPrompts,
    string  LoginPassPrompts,
    string  UserModePrompts,
    string  EnableModePrompts,
    string? EnableCommand,
    string? DisablePagingCommand,
    string? PagingTrigger,
    string? PagingResponse,
    string? PreCommands,
    string? PostConnectTrigger,
    string? PostConnectResponse,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record VendorPresetResponse(
    string Vendor,
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

// ── Button ───────────────────────────────────────────────────────────────────
public record ButtonRequest(
    int     DeviceId,
    int     AssignedToUserId,
    string  Label,
    string? Description,
    string  CommandTemplate,
    string  ParameterKeys = "",
    int     ExpiresInHours = 24,
    int     SortOrder = 0);

public record ButtonResponse(
    int      Id, int DeviceId, string DeviceLabel, string DeviceName,
    int      AssignedToUserId, string AssignedToUserFullName,
    string   Label, string? Description,
    string   CommandTemplate, string ParameterKeys,
    DateTime ExpiresAt, bool IsActive, int SortOrder,
    DateTime CreatedAt, DateTime UpdatedAt);

// ── Execute ──────────────────────────────────────────────────────────────────
public record ExecuteRequest(
    int ButtonId,
    Dictionary<string, string>? Parameters = null);

public record ExecuteResponse(
    bool Success, string Command,
    string Output, string? Error,
    int DurationMs, DateTime ExecutedAt);

// ── Log ──────────────────────────────────────────────────────────────────────
public record LogResponse(
    int Id, int UserId, string UserFullName,
    int DeviceId, string DeviceName,
    int? ButtonId, string? ButtonLabel,
    string Command, string Status,
    int DurationMs, string? ErrorMsg,
    string? RawOutput,
    DateTime ExecutedAt);
