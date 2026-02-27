import { useTranslation } from "react-i18next";
import { RevealOnScroll, GlowCard, SectionTitle } from "@/components/ui-boris";

const Admin = () => {
  const { t } = useTranslation();

  const mockUsers = [
    { id: 1, name: "user_001", tier: "BLACKBOX", scans: 142, joined: "2024-11-01" },
    { id: 2, name: "user_002", tier: "RADAR", scans: 45, joined: "2024-12-15" },
    { id: 3, name: "user_003", tier: "GUEST", scans: 12, joined: "2025-01-10" },
    { id: 4, name: "user_004", tier: "RAW", scans: 67, joined: "2024-10-20" },
  ];

  return (
    <div className="container mx-auto min-h-screen px-4 py-12">
      <RevealOnScroll>
        <SectionTitle>{t("nav.admin")}</SectionTitle>

        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Total Users", value: "1,247" },
            { label: "BLACKBOX", value: "89" },
            { label: "RAW", value: "234" },
            { label: "Total Scans", value: "18,432" },
          ].map((s) => (
            <GlowCard key={s.label}>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 font-mono text-2xl font-bold text-foreground">{s.value}</p>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <h3 className="mb-4 text-lg font-semibold text-foreground">Users</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4">ID</th>
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3 pr-4">Tier</th>
                  <th className="pb-3 pr-4">Scans</th>
                  <th className="pb-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {mockUsers.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 transition-colors hover:bg-accent">
                    <td className="py-3 pr-4 font-mono text-muted-foreground">{u.id}</td>
                    <td className="py-3 pr-4 font-mono text-foreground">{u.name}</td>
                    <td className="py-3 pr-4">
                      <span className="rounded border border-border px-2 py-0.5 font-mono text-xs text-primary">{u.tier}</span>
                    </td>
                    <td className="py-3 pr-4 font-mono text-foreground">{u.scans}</td>
                    <td className="py-3 text-muted-foreground">{u.joined}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlowCard>
      </RevealOnScroll>
    </div>
  );
};

export default Admin;
