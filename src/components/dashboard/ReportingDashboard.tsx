import { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadialBarChart, RadialBar,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, Shield, DollarSign, Activity,
  Zap, Brain, FileCheck, BarChart3, Target, AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useReportingData } from '@/hooks/useReportingData';

const fmt = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

const fmtCurrency = (n: number) => `R${fmt(n)}`;

// ─── KPI Card ──────────────────────────────────────────
function KPICard({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'primary' }: {
  title: string; value: string; subtitle?: string;
  icon: React.ElementType; trend?: 'up' | 'down' | 'neutral';
  trendValue?: string; color?: 'primary' | 'gold' | 'success' | 'danger' | 'warning';
}) {
  const colorMap = {
    primary: 'text-primary bg-primary/10 border-primary/20',
    gold: 'text-[hsl(var(--gold))] bg-[hsl(var(--gold))]/10 border-[hsl(var(--gold))]/20',
    success: 'text-[hsl(var(--accent-success))] bg-[hsl(var(--accent-success))]/10 border-[hsl(var(--accent-success))]/20',
    danger: 'text-[hsl(var(--accent-danger))] bg-[hsl(var(--accent-danger))]/10 border-[hsl(var(--accent-danger))]/20',
    warning: 'text-[hsl(var(--accent-warning))] bg-[hsl(var(--accent-warning))]/10 border-[hsl(var(--accent-warning))]/20',
  };
  return (
    <Card className="relative overflow-hidden border-border/40">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
            <p className="text-xl font-bold tracking-tight text-foreground font-[JetBrains_Mono]">{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>}
            {trend && trendValue && (
              <div className="flex items-center gap-1 mt-1">
                {trend === 'up' ? <TrendingUp className="w-3 h-3 text-[hsl(var(--accent-success))]" /> : 
                 trend === 'down' ? <TrendingDown className="w-3 h-3 text-[hsl(var(--accent-danger))]" /> : null}
                <span className={`text-[10px] font-semibold ${trend === 'up' ? 'text-[hsl(var(--accent-success))]' : trend === 'down' ? 'text-[hsl(var(--accent-danger))]' : 'text-muted-foreground'}`}>
                  {trendValue}
                </span>
              </div>
            )}
          </div>
          <div className={`p-2 rounded-lg border ${colorMap[color]}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Mini Sparkline ────────────────────────────────────
function Sparkline({ data, dataKey, color = 'hsl(217, 91%, 60%)' }: { data: any[]; dataKey: string; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} fill={`url(#spark-${dataKey})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Chart Tooltip ─────────────────────────────────────
function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-card px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-mono font-semibold text-foreground">{typeof entry.value === 'number' ? fmt(entry.value) : entry.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────
export function ReportingDashboard() {
  const {
    metrics, clientSegments, agentPerformance, pipelineMetrics,
    riskDistribution, revenueTrend, commandVelocity, decisionAnalytics, isLoading,
  } = useReportingData();

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground tracking-tight">Executive Intelligence</h2>
          <Badge variant="outline" className="ml-auto text-[9px] border-primary/30 text-primary">LIVE</Badge>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full h-8 bg-secondary/50">
            <TabsTrigger value="overview" className="text-[10px] flex-1 h-6">Overview</TabsTrigger>
            <TabsTrigger value="revenue" className="text-[10px] flex-1 h-6">Revenue</TabsTrigger>
            <TabsTrigger value="ops" className="text-[10px] flex-1 h-6">Operations</TabsTrigger>
            <TabsTrigger value="risk" className="text-[10px] flex-1 h-6">Risk</TabsTrigger>
          </TabsList>

          {/* ═══ OVERVIEW TAB ═══ */}
          <TabsContent value="overview" className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <KPICard title="Total MRR" value={fmtCurrency(metrics.totalMRR)} icon={DollarSign} trend="up" trendValue="+12.5%" color="gold" subtitle={`${metrics.activeClients} active clients`} />
              <KPICard title="Clients" value={metrics.totalClients.toString()} icon={Users} trend="up" trendValue={`${metrics.activeClients} active`} color="primary" />
              <KPICard title="Health Score" value={`${metrics.avgHealthScore}%`} icon={Activity} trend={metrics.avgHealthScore > 70 ? 'up' : 'down'} trendValue={metrics.avgHealthScore > 70 ? 'Healthy' : 'At Risk'} color="success" />
              <KPICard title="Churn Risk" value={metrics.churnRisk.toString()} icon={AlertTriangle} trend={metrics.churnRisk > 0 ? 'down' : 'up'} trendValue={metrics.churnRisk > 0 ? 'Action needed' : 'Clear'} color="danger" subtitle="High/Critical" />
            </div>

            {/* Client Segments Pie + Agent Bar */}
            <div className="grid grid-cols-2 gap-2">
              <Card className="border-border/40">
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Client Mix</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  {clientSegments.length > 0 ? (
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <Pie data={clientSegments} cx="50%" cy="50%" innerRadius={28} outerRadius={48} dataKey="value" stroke="none">
                          {clientSegments.map((s, i) => <Cell key={i} fill={s.fill} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[120px] flex items-center justify-center text-[10px] text-muted-foreground">No data</div>
                  )}
                  <div className="flex gap-2 justify-center mt-1">
                    {clientSegments.map(s => (
                      <div key={s.name} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.fill }} />
                        <span className="text-[9px] text-muted-foreground">{s.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/40">
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">AI Agents</CardTitle>
                </CardHeader>
                <CardContent className="p-2 space-y-2">
                  {agentPerformance.slice(0, 4).map(a => (
                    <div key={a.name} className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-foreground truncate max-w-[80px]">{a.emoji} {a.name}</span>
                        <span className="text-[9px] font-mono text-muted-foreground">{a.tasks}/{a.capacity}</span>
                      </div>
                      <Progress value={(a.tasks / Math.max(a.capacity, 1)) * 100} className="h-1" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* MRR Sparkline */}
            <Card className="border-border/40">
              <CardHeader className="p-3 pb-0">
                <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <ResponsiveContainer width="100%" height={100}>
                  <AreaChart data={revenueTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(40, 76%, 55%)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(40, 76%, 55%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 20%, 16%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(220, 10%, 50%)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: 'hsl(220, 10%, 50%)' }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="mrr" stroke="hsl(40, 76%, 55%)" strokeWidth={2} fill="url(#mrrGrad)" name="MRR" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ REVENUE TAB ═══ */}
          <TabsContent value="revenue" className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <KPICard title="Premiums" value={fmtCurrency(metrics.totalPremiumValue)} icon={Shield} color="primary" subtitle={`${metrics.premiumCollectionRate}% collected`} trend="up" trendValue={fmtCurrency(metrics.collectedPremiums)} />
              <KPICard title="Commissions" value={fmtCurrency(metrics.totalCommExpected)} icon={DollarSign} color="gold" subtitle={`${metrics.commissionRate}% received`} trend="up" trendValue={fmtCurrency(metrics.totalCommReceived)} />
              <KPICard title="Active Policies" value={metrics.activePolicies.toString()} icon={FileCheck} color="success" subtitle={`of ${metrics.totalPolicies} total`} />
              <KPICard title="Collection Rate" value={`${metrics.premiumCollectionRate}%`} icon={Target} color={metrics.premiumCollectionRate >= 80 ? 'success' : 'warning'} subtitle="Premium payments" />
            </div>

            {/* Revenue Breakdown Chart */}
            <Card className="border-border/40">
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={revenueTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 20%, 16%)" />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: 'hsl(220, 10%, 50%)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: 'hsl(220, 10%, 50%)' }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="mrr" fill="hsl(217, 91%, 60%)" radius={[3, 3, 0, 0]} name="MRR" />
                    <Bar dataKey="premiums" fill="hsl(40, 76%, 55%)" radius={[3, 3, 0, 0]} name="Premiums" />
                    <Bar dataKey="commissions" fill="hsl(152, 60%, 48%)" radius={[3, 3, 0, 0]} name="Commissions" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex gap-3 justify-center mt-2">
                  {[{ label: 'MRR', color: 'hsl(217, 91%, 60%)' }, { label: 'Premiums', color: 'hsl(40, 76%, 55%)' }, { label: 'Commissions', color: 'hsl(152, 60%, 48%)' }].map(l => (
                    <div key={l.label} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                      <span className="text-[9px] text-muted-foreground">{l.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Premium Collection Gauge */}
            <Card className="border-border/40">
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Collection Performance</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-muted-foreground">Premium Collection</span>
                      <span className="text-[10px] font-mono font-bold text-foreground">{metrics.premiumCollectionRate}%</span>
                    </div>
                    <Progress value={metrics.premiumCollectionRate} className="h-2" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-muted-foreground">Commission Recovery</span>
                      <span className="text-[10px] font-mono font-bold text-foreground">{metrics.commissionRate}%</span>
                    </div>
                    <Progress value={metrics.commissionRate} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ OPERATIONS TAB ═══ */}
          <TabsContent value="ops" className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <KPICard title="Commands" value={metrics.totalCommands.toString()} icon={Zap} color="primary" subtitle={`${metrics.commandSuccessRate}% success`} trend="up" trendValue={`${metrics.completedCommands} done`} />
              <KPICard title="Decisions" value={metrics.totalDecisions.toString()} icon={Brain} color="gold" subtitle={`${metrics.pendingDecisions} pending`} />
              <KPICard title="Actions" value={metrics.totalActions.toString()} icon={Activity} color="success" subtitle={`${metrics.executedActions} executed`} />
              <KPICard title="Emails" value={metrics.totalEmails.toString()} icon={FileCheck} color="primary" subtitle={`${metrics.sentEmails} sent`} />
            </div>

            {/* Command Velocity */}
            <Card className="border-border/40">
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Command Velocity</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={commandVelocity} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 20%, 16%)" />
                    <XAxis dataKey="day" tick={{ fontSize: 9, fill: 'hsl(220, 10%, 50%)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: 'hsl(220, 10%, 50%)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="commands" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={false} name="Total" />
                    <Line type="monotone" dataKey="success" stroke="hsl(152, 60%, 48%)" strokeWidth={2} dot={false} name="Success" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pipeline Distribution */}
            {pipelineMetrics.length > 0 && (
              <Card className="border-border/40">
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Action Pipeline</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={pipelineMetrics} layout="vertical" margin={{ top: 0, right: 8, left: 60, bottom: 0 }}>
                      <XAxis type="number" tick={{ fontSize: 9, fill: 'hsl(220, 10%, 50%)' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="status" tick={{ fontSize: 8, fill: 'hsl(220, 10%, 50%)' }} axisLine={false} tickLine={false} width={55} />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Actions">
                        {pipelineMetrics.map((p, i) => <Cell key={i} fill={p.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Decision Analytics */}
            {decisionAnalytics.length > 0 && (
              <Card className="border-border/40">
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Decision Outcomes</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <ResponsiveContainer width="100%" height={100}>
                    <PieChart>
                      <Pie data={decisionAnalytics} cx="50%" cy="50%" innerRadius={25} outerRadius={42} dataKey="count" nameKey="status" stroke="none">
                        {decisionAnalytics.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex gap-2 justify-center mt-1">
                    {decisionAnalytics.map(d => (
                      <div key={d.status} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
                        <span className="text-[9px] text-muted-foreground">{d.status} ({d.count})</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══ RISK TAB ═══ */}
          <TabsContent value="risk" className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <KPICard title="High Risk" value={metrics.churnRisk.toString()} icon={AlertTriangle} color="danger" subtitle="Clients at risk" />
              <KPICard title="Avg Health" value={`${metrics.avgHealthScore}%`} icon={Activity} color={metrics.avgHealthScore >= 70 ? 'success' : 'warning'} subtitle="Portfolio health" />
            </div>

            {/* Risk Heatmap */}
            <Card className="border-border/40">
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Churn Risk Distribution</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={riskDistribution} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 20%, 16%)" />
                    <XAxis dataKey="level" tick={{ fontSize: 9, fill: 'hsl(220, 10%, 50%)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: 'hsl(220, 10%, 50%)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="clients" radius={[4, 4, 0, 0]} name="Clients">
                      {riskDistribution.map((r, i) => <Cell key={i} fill={r.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Risk Scorecard */}
            <Card className="border-border/40">
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Risk Scorecard</CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
                {[
                  { label: 'Client Retention', value: metrics.totalClients > 0 ? Math.round((metrics.activeClients / metrics.totalClients) * 100) : 0, color: 'success' },
                  { label: 'Premium Collection', value: metrics.premiumCollectionRate, color: metrics.premiumCollectionRate >= 80 ? 'success' : 'warning' },
                  { label: 'Commission Recovery', value: metrics.commissionRate, color: metrics.commissionRate >= 80 ? 'success' : 'warning' },
                  { label: 'Command Success', value: metrics.commandSuccessRate, color: metrics.commandSuccessRate >= 80 ? 'success' : 'warning' },
                ].map(item => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[10px] text-muted-foreground">{item.label}</span>
                      <span className="text-[10px] font-mono font-bold text-foreground">{item.value}%</span>
                    </div>
                    <Progress value={item.value} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
