using Microsoft.EntityFrameworkCore;
using OltApi.Models;

namespace OltApi.Data;

public class AppDbContext(DbContextOptions<AppDbContext> opts) : DbContext(opts)
{
    public DbSet<User>        Users        => Set<User>();
    public DbSet<Device>      Devices      => Set<Device>();
    public DbSet<Button>      Buttons      => Set<Button>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.HasIndex(u => u.Username).IsUnique();
        });

        b.Entity<Button>(e =>
        {
            e.HasOne(bt => bt.Device)
             .WithMany(d => d.Buttons)
             .HasForeignKey(bt => bt.DeviceId);

            e.HasOne(bt => bt.AssignedToUser)
             .WithMany(u => u.AssignedButtons)
             .HasForeignKey(bt => bt.AssignedToUserId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne<User>()
             .WithMany()
             .HasForeignKey(bt => bt.CreatedByAdminId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<ActivityLog>(e =>
        {
            e.HasOne(l => l.User)
             .WithMany(u => u.Logs)
             .HasForeignKey(l => l.UserId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(l => l.Device)
             .WithMany(d => d.Logs)
             .HasForeignKey(l => l.DeviceId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(l => l.Button)
             .WithMany(bt => bt.Logs)
             .HasForeignKey(l => l.ButtonId)
             .OnDelete(DeleteBehavior.SetNull)
             .IsRequired(false);
        });
    }
}
