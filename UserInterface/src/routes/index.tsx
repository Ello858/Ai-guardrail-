import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Bell,
  Bot,
  ChevronUp,
  CircleGauge,
  Clock3,
  LogOut,
  Search,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Skull,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  getLog,
  getStatus,
  processPrompt,
  killSwitch,
  resetSystem,
  type LogRecord,
} from "@/lib/containment-api";
import { Loader2, RotateCcw, Send, WifiOff } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Sandbox Containment System | Security Operations" },
      {
        name: "description",
        content:
          "Live AI agent monitoring, threat voting, telemetry, and human containment controls.",
      },
      { property: "og:title", content: "AI Sandbox Containment System" },
      { property: "og:description", content: "Live AI agent monitoring and containment controls." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const navItems = [["Dashboard", CircleGauge]] as const;

const AGENT_COLORS = [
  "var(--agent-1)",
  "var(--agent-2)",
  "var(--agent-3)",
  "var(--agent-4)",
  "var(--agent-5)",
];
const DEFAULT_AGENTS = [
  "Agent 1 (Kernel)",
  "Agent 2 (Network)",
  "Agent 3 (Memory)",
  "Agent 4 (Behavior)",
];
function splitAgent(label: string) {
  const m = label.match(/^(.*?)\s*\((.*)\)$/);
  return m ? [m[1], m[2]] : [label, ""];
}
function fmtTime(ts: string) {
  const d = new Date(ts);
  return isNaN(d.getTime()) ? ts : d.toLocaleTimeString("en-GB", { hour12: false });
}

function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-border bg-card shadow-[0_12px_32px_color-mix(in_oklab,var(--background)_72%,transparent)] ${className}`}
    >
      <header className="flex h-14 items-center justify-between border-b border-border px-5">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

function Dashboard() {
  const [now, setNow] = useState<Date | null>(null);
  const [contained, setContained] = useState(false);
  const [showContainment, setShowContainment] = useState(false);
  const wasContained = useRef(false);
  const [log, setLog] = useState<LogRecord[]>([]);
  const [online, setOnline] = useState<boolean | null>(null);
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = async () => {
    try {
      const [data, status] = await Promise.all([getLog(), getStatus()]);
      setLog(Array.isArray(data) ? data : []);
      setContained(status.contained);
      if (status.contained && !wasContained.current) setShowContainment(true);
      if (!status.contained) setShowContainment(false);
      wasContained.current = status.contained;
      setOnline(true);
    } catch {
      setOnline(false);
    }
  };
  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 3000);
    return () => window.clearInterval(id);
  }, []);
  const latest = log.length ? log[log.length - 1] : null;
  const systemContained = contained;
  const voteLabels = latest?.votes.map((v) => v.agent) ?? DEFAULT_AGENTS;
  const agents = [
    ...voteLabels.slice(0, 4).map((label, i) => {
      const [n, r] = splitAgent(label);
      return [n, r, latest?.votes[i]?.flagged ? "flagged" : "clear", AGENT_COLORS[i]] as const;
    }),
    [
      "Agent 5",
      "Executor",
      latest && latest.executor.decision !== "NO_ACTION" ? "flagged" : "clear",
      AGENT_COLORS[4],
    ] as const,
  ];
  const voteData = log.slice(-12).map((r) => {
    const row: Record<string, string | number> = { time: fmtTime(r.timestamp) };
    for (let i = 0; i < 4; i++) row[`a${i + 1}`] = r.votes[i]?.flagged ? 1 : 0;
    row["a5"] = r.executor.decision !== "NO_ACTION" ? 1 : 0;
    return row;
  });
  const flagged = latest?.executor.flagged_count ?? 0;
  const total = latest?.executor.total_agents ?? 4;
  const pct = (n: number) => (total ? `${Math.round((n / total) * 100)}%` : "0%");
  const telemetry = [...log]
    .reverse()
    .map(
      (r) =>
        [
          r.timestamp,
          r.request,
          r.response,
          `${r.executor.flagged_count}/${r.executor.total_agents}`,
          r.executor.decision,
        ] as const,
    );
  const totalFlags = log.reduce((a, r) => a + (r.executor.flagged_count ?? 0), 0);
  const alerts = log.filter((r) => r.executor.decision !== "NO_ACTION").length;
  const send = async () => {
    if (!prompt.trim()) return;
    setSending(true);
    setError(null);
    try {
      await processPrompt(prompt.trim());
      setPrompt("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSending(false);
    }
  };
  const kill = async () => {
    setBusy(true);
    setError(null);
    try {
      await killSwitch();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kill switch failed");
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    setBusy(true);
    setError(null);
    try {
      await resetSystem();
      await refresh();
      setLog([]);
      setShowContainment(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const clock = now?.toLocaleTimeString("en-GB", { hour12: false }) ?? "--:--:--";

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="border-b border-border bg-surface-soft lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex h-18 items-center gap-3 border-b border-border px-5">
          <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck size={19} />
          </span>
          <div>
            <strong className="block text-sm">Containment System</strong>
            <span className="font-mono text-[10px] text-muted-foreground">SECURE NODE 01</span>
          </div>
        </div>
        <nav className="flex overflow-x-auto py-3 lg:block lg:space-y-1 lg:py-5">
          {navItems.map(([label, Icon], i) => (
            <a
              key={label}
              href="#"
              className={`flex min-w-max items-center gap-3 border-l-2 px-5 py-3 text-sm transition-colors ${i === 0 ? "border-primary bg-accent text-primary" : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
            >
              <Icon size={17} />
              {label}
            </a>
          ))}
        </nav>
        <div className="hidden border-t border-border p-4 lg:absolute lg:inset-x-0 lg:bottom-0 lg:block">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full bg-secondary text-xs font-semibold">
              JD
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">Jane Doe</p>
              <p className="text-[11px] text-muted-foreground">Security Admin</p>
            </div>
            <Button variant="ghost" size="icon" aria-label="Logout">
              <LogOut />
            </Button>
          </div>
        </div>
      </aside>

      <main className="min-w-0">
        <header className="flex h-18 items-center justify-between border-b border-border bg-surface-soft/70 px-4 backdrop-blur md:px-7">
          <div>
            <h1 className="text-base font-semibold md:text-lg">AI Sandbox Containment System</h1>
            <p className="font-mono text-[10px] text-muted-foreground">
              ISOLATED ENVIRONMENT · NODE CLUSTER 01
            </p>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <label className="hidden h-9 w-56 items-center gap-2 rounded-md border border-border bg-background px-3 text-muted-foreground xl:flex">
              <Search size={15} />
              <input
                className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none"
                placeholder="Search agents, events..."
              />
            </label>
            <div className="hidden items-center gap-2 font-mono text-xs text-muted-foreground md:flex">
              <Clock3 size={14} />
              {clock} UTC
            </div>
            {online === false && (
              <span className="flex items-center gap-1.5 rounded-sm bg-destructive/15 px-2 py-1 font-mono text-[10px] font-semibold text-destructive">
                <WifiOff size={12} />
                BACKEND OFFLINE
              </span>
            )}
            {online && (
              <span className="hidden items-center gap-1.5 rounded-sm bg-success/10 px-2 py-1 font-mono text-[10px] text-success sm:flex">
                <span className="size-1.5 rounded-full bg-success" />
                BACKEND LIVE
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              disabled={busy}
              className="text-xs text-muted-foreground"
            >
              <RotateCcw />
              Reset
            </Button>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell />
              <span className="absolute right-1 top-1 size-2 rounded-full bg-destructive" />
            </Button>
          </div>
        </header>

        <div className="space-y-4 p-4 md:p-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              icon={<ShieldCheck />}
              label="System Status"
              value={systemContained ? "CONTAINED" : online === false ? "OFFLINE" : "OPERATIONAL"}
              success={!systemContained && online !== false}
              detail={systemContained ? "Kill switch engaged" : "All safeguards engaged"}
              trend={`${log.length} req`}
            />
            <Stat
              icon={<Bot />}
              label="Active Agents"
              value={online ? `${agents.filter((a) => a[2] === "clear").length}/5 Clear` : "—"}
              detail={latest ? `Last record ${fmtTime(latest.timestamp)}` : "No records yet"}
              trend="live"
            />
            <Stat
              icon={<Activity />}
              label="Threat Votes"
              value={String(totalFlags)}
              detail="Across all records"
              trend={`${flagged} latest`}
              warn
            />
            <Stat
              icon={<Siren />}
              label="Executor Alerts"
              value={String(alerts)}
              detail={latest?.executor.decision ?? "Awaiting data"}
              trend={`${log.length} total`}
            />
          </div>

          <Panel
            title="Send Request to Sandbox"
            action={
              error ? (
                <span className="font-mono text-[10px] text-destructive">{error}</span>
              ) : undefined
            }
          >
            <form
              className="flex gap-2 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={250}
                disabled={sending || contained}
                placeholder="Type a prompt for the sandboxed AI..."
                className="h-10 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
              <Button
                type="submit"
                disabled={sending || contained || !prompt.trim()}
                className="h-10"
              >
                {sending ? <Loader2 className="animate-spin" /> : <Send />}
                {sending ? "Processing..." : "Send Request"}
              </Button>
            </form>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(330px,.75fr)]">
            <Panel
              title="Agent Vote Timeline"
              action={
                <span className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                  <span className="status-pulse size-2 rounded-full bg-success text-success" />
                  LIVE
                </span>
              }
            >
              <div className="h-64 px-3 pt-5">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={voteData} margin={{ top: 8, right: 15, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="var(--grid)" vertical={false} />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 1]}
                      ticks={[0, 1]}
                      tickFormatter={(v) => (v ? "Threat" : "Clear")}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        fontSize: "11px",
                      }}
                    />
                    {agents.map((a, i) => (
                      <Line
                        key={a[0]}
                        type="stepAfter"
                        dataKey={`a${i + 1}`}
                        stroke={a[3]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-border px-4 py-4 sm:grid-cols-5">
                {agents.map(([name, role, status, color]) => (
                  <div key={name} className="flex items-center gap-2">
                    <span
                      className={`size-2.5 shrink-0 rounded-full ${status === "flagged" ? "status-pulse bg-destructive text-destructive" : ""}`}
                      style={status === "clear" ? { backgroundColor: color } : undefined}
                    />
                    <div>
                      <p className="text-[11px] font-medium">{name}</p>
                      <p className="text-[9px] text-muted-foreground">{role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel
              title="Current Vote Tally"
              action={
                <span className="rounded-sm bg-secondary px-2 py-1 font-mono text-[9px] text-muted-foreground">
                  {latest?.executor.decision ?? "IDLE"}
                </span>
              }
            >
              <div className="relative mx-auto h-56 max-w-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Threat", value: flagged, fill: "var(--destructive)" },
                        {
                          name: "Clear",
                          value: Math.max(total - flagged, 0),
                          fill: "var(--success)",
                        },
                        ...(latest ? [] : [{ name: "None", value: 1, fill: "var(--secondary)" }]),
                      ]}
                      dataKey="value"
                      innerRadius={66}
                      outerRadius={86}
                      stroke="var(--card)"
                      strokeWidth={4}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
                  <strong className="max-w-[140px] text-sm leading-tight">
                    {latest?.executor.summary || "No votes yet"}
                  </strong>
                  <span className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {flagged} THREAT / {total - flagged} CLEAR
                  </span>
                </div>
              </div>
              <div className="space-y-3 px-5 pb-5">
                <Tally
                  label="Threat"
                  value={pct(flagged)}
                  width={pct(flagged)}
                  tone="bg-destructive"
                />
                <Tally
                  label="Clear"
                  value={latest ? pct(total - flagged) : "0%"}
                  width={latest ? pct(total - flagged) : "0%"}
                  tone="bg-success"
                />
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(330px,.75fr)]">
            <Panel
              title="Raw Telemetry Feed (Unformatted)"
              action={
                <span className="font-mono text-[9px] text-muted-foreground">STREAM ID 0x8F12</span>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left font-mono text-[10px]">
                  <thead className="bg-surface-raised text-muted-foreground">
                    <tr>
                      {["Timestamp", "Request", "Response", "Flags", "Decision"].map((x) => (
                        <th key={x} className="px-4 py-2.5 font-medium">
                          {x}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {telemetry.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                          {online === false ? "Backend offline — no telemetry" : "No records yet"}
                        </td>
                      </tr>
                    )}
                    {telemetry.map((row, ri) => (
                      <tr key={ri} className="border-t border-border/70 hover:bg-secondary/40">
                        {row.map((v, i) => (
                          <td
                            key={i}
                            className="max-w-[260px] truncate px-4 py-2.5"
                            title={String(v)}
                          >
                            {i === 4 ? <Badge value={v} /> : v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-border px-4 py-3 text-[10px] text-muted-foreground">
                Raw data only — no AI-generated summaries reach human reviewers
              </p>
            </Panel>

            <Panel
              title="3-Member Board Status"
              action={<span className="font-mono text-[9px] text-warning">DECISION WINDOW</span>}
            >
              <div className="p-4">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["AB", "Abhinav", "Approve", "bg-success"],
                    ["SH", "Shaurya", "Pending", "bg-warning"],
                    ["RI", "Rishit", "Reject", "bg-destructive"],
                  ].map(([initials, name, state, tone]) => (
                    <div
                      key={name}
                      className="rounded-md border border-border bg-surface-raised p-3 text-center"
                    >
                      <div className="mx-auto mb-2 grid size-8 place-items-center rounded-full bg-secondary text-[10px] font-semibold">
                        {initials}
                      </div>
                      <p className="truncate text-[10px] font-medium">{name}</p>
                      <p className="mt-1 flex items-center justify-center gap-1 text-[9px] text-muted-foreground">
                        <span className={`size-1.5 rounded-full ${tone}`} />
                        {state}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between rounded-md bg-secondary px-3 py-2.5 text-[10px]">
                  <span className="text-muted-foreground">Cooling-off period</span>
                  <strong className="font-mono text-warning">4m 32s remaining</strong>
                </div>
                <Button
                  variant="containment"
                  className="mt-4 h-13 w-full font-mono text-sm font-bold tracking-wider"
                  onClick={kill}
                  disabled={busy}
                >
                  {busy ? <Loader2 className="animate-spin" /> : <Skull />} HUMAN KILL SWITCH
                </Button>
              </div>
            </Panel>
          </div>
        </div>
      </main>

      {showContainment && (
        <div
          role="alertdialog"
          aria-label="System contained"
          className="contain-enter fixed inset-0 z-50 grid place-items-center bg-destructive/95 px-6 text-destructive-foreground backdrop-blur-md"
        >
          <div className="text-center">
            <ShieldAlert className="status-pulse mx-auto mb-6 size-18" />
            <p className="mb-3 font-mono text-xs tracking-[.35em]">EMERGENCY PROTOCOL EXECUTED</p>
            <h2 className="text-4xl font-bold md:text-7xl">SYSTEM CONTAINED</h2>
            <p className="mt-5 text-sm opacity-80">
              New requests are blocked until an administrator resets the system.
            </p>
            <Button
              variant="outline"
              className="mt-10 border-destructive-foreground/50 bg-transparent text-destructive-foreground hover:bg-destructive-foreground/10 hover:text-destructive-foreground"
              onClick={() => setShowContainment(false)}
            >
              Return to console
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  detail,
  trend,
  success,
  warn,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  trend: string;
  success?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <span
          className={`grid size-9 place-items-center rounded-md ${warn ? "bg-warning/10 text-warning" : "bg-accent text-primary"}`}
        >
          {icon}
        </span>
        <span
          className={`flex items-center gap-1 font-mono text-[10px] ${trend.startsWith("-") ? "text-success" : warn ? "text-warning" : "text-success"}`}
        >
          <ChevronUp size={11} />
          {trend}
        </span>
      </div>
      <p className="mt-4 text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${success ? "text-success" : "text-foreground"}`}>
        {success && (
          <span className="status-pulse mr-2 inline-block size-2 rounded-full bg-success text-success" />
        )}
        {value}
      </p>
      <p className="mt-2 text-[10px] text-muted-foreground">{detail}</p>
    </div>
  );
}
function Tally({
  label,
  value,
  width,
  tone,
}: {
  label: string;
  value: string;
  width: string;
  tone: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{value}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-secondary">
        <div className={`h-full rounded-full ${tone}`} style={{ width }} />
      </div>
    </div>
  );
}
function Badge({ value }: { value: string }) {
  const tone =
    value === "NO_ACTION" || value === "Normal"
      ? "bg-success/10 text-success"
      : value === "ACTION_AUTHORIZED" || value === "Flagged"
        ? "bg-destructive/10 text-destructive"
        : "bg-warning/10 text-warning";
  return (
    <span className={`inline-flex rounded-sm px-2 py-1 text-[9px] font-medium ${tone}`}>
      {value}
    </span>
  );
}
