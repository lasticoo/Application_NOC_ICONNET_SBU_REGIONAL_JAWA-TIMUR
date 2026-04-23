namespace OltApi.DTOs;

// ── Auth ─────────────────────────────────────────────────────────────────────
public record LoginRequest(string Username, string Password);
public record LoginResponse(string Token, string Role, string FullName, int UserId);
public record CreateUserRequest(string Username, string FullName, string Password, string Role);

// ── Device ───────────────────────────────────────────────────────────────────
public record DeviceRequest(
    string Name, string Label, string IpAddress,
    string OltUser, string OltPass,
    string Vendor = "huawei",
    string? ExtraStepsJson = null);

public record DeviceResponse(
    int Id, string Name, string Label, string IpAddress,
    string Vendor, bool IsActive, string? ExtraStepsJson);

// ── Button ───────────────────────────────────────────────────────────────────
public record ButtonRequest(
    int DeviceId,
    int AssignedToUserId,
    string Label,
    string? Description,
    string CommandTemplate,
    string ParameterKeys = "",
    string? ExtraStepsJson = null,
    int ExpiresInHours = 24,
    int SortOrder = 0);

public record ButtonResponse(
    int Id, int DeviceId, string DeviceLabel, string DeviceName,
    int AssignedToUserId, string AssignedToUserFullName,
    string Label, string? Description,
    string CommandTemplate, string ParameterKeys,
    string? ExtraStepsJson,
    DateTime ExpiresAt, bool IsActive, int SortOrder, DateTime CreatedAt);

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
    int DurationMs, string? ErrorMsg, DateTime ExecutedAt);

// ── User ─────────────────────────────────────────────────────────────────────
public record UserResponse(
    int Id, string Username, string FullName, string Role, bool IsActive);
