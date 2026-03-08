import { useState } from 'react';
import { 
  Activity, AlertTriangle, Database, FileSearch, Loader2, 
  RefreshCw, Server, Shield, Terminal, Wrench, CheckCircle2, XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useDevOps } from '@/hooks/useDevOps';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DevOpsPanelProps {
  className?: string;
}

type Tab = 'health' | 'triage' | 'logs' | 'db';

export function DevOpsPanel({ className }: DevOpsPanelProps) {
  const {
    isLoading, healthReport, triageReport, logAnalysis, dbHealth,
    runHealthCheck, runLogAnalysis, runDbHealth, triageError,
  } = useDevOps();

  const [activeTab, setActiveTab] = useState<Tab>('health');
  const [errorInput, setErrorInput] = useState('');

  const tabs: { id: Tab; icon: typeof Activity; label: string }[] = [
    { id: 'health', icon: Activity, label: 'Health' },
    { id: 'triage', icon: Wrench, label: 'Triage' },
    { id: 'logs', icon: FileSearch, label: 'Logs' },
    { id: 'db', icon: Database, label: 'DB' },
  ];

  const handleTriage = () => {
    if (!errorInput.trim()) return;
    triageError(errorInput.trim());
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-exec-success';
      case 'degraded': return 'text-exec-warning';
      case 'critical': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle2 className="w-4 h-4 text-exec-success" />;
      case 'degraded': return <AlertTriangle className="w-4 h-4 text-exec-warning" />;
      case 'critical': return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Server className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className={cn('panel', className)}>
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-primary" />
          <span>DevOps Agent</span>
          {healthReport && (
            <span className={cn('text-[10px] font-semibold', statusColor(healthReport.status))}>
              {healthReport.overallScore}/100
            </span>
          )}
        </div>
        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 px-3 pt-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all',
                activeTab === tab.id
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              )}
            >
              <Icon className="w-3 h-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* HEALTH TAB */}
          {activeTab === 'health' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8 text-[11px] gap-1.5"
                onClick={runHealthCheck}
                disabled={isLoading}
              >
                <RefreshCw className={cn('w-3 h-3', isLoading && 'animate-spin')} />
                Run System Health Check
              </Button>

              {healthReport ? (
                <div className="space-y-3 animate-fade-in">
                  {/* Overall Score */}
                  <div className="stat-card flex items-center gap-3">
                    {statusIcon(healthReport.status)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-foreground">System Health</span>
                        <span className={cn('text-sm font-bold font-mono', statusColor(healthReport.status))}>
                          {healthReport.overallScore}%
                        </span>
                      </div>
                      <Progress value={healthReport.overallScore} className="h-1.5" />
                    </div>
                  </div>

                  {/* Component Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <MetricCard label="Agents Online" value={`${healthReport.agents.online}/${healthReport.agents.total}`} status={healthReport.agents.error > 0 ? 'error' : 'ok'} />
                    <MetricCard label="Agents Error" value={String(healthReport.agents.error)} status={healthReport.agents.error > 0 ? 'error' : 'ok'} />
                    <MetricCard label="Commands Failed" value={String(healthReport.commands.failed)} status={healthReport.commands.failed > 2 ? 'error' : healthReport.commands.failed > 0 ? 'warn' : 'ok'} />
                    <MetricCard label="Pipeline Failed" value={String(healthReport.pipeline.failed)} status={healthReport.pipeline.failed > 0 ? 'warn' : 'ok'} />
                    <MetricCard label="Pending Decisions" value={String(healthReport.pendingDecisions)} status={healthReport.pendingDecisions > 5 ? 'warn' : 'ok'} />
                    <MetricCard label="Over Quota" value={String(healthReport.agents.overQuota)} status={healthReport.agents.overQuota > 0 ? 'warn' : 'ok'} />
                  </div>

                  {/* Recent Errors */}
                  {healthReport.recentErrors.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Recent Errors</h4>
                      <div className="space-y-1">
                        {healthReport.recentErrors.slice(0, 3).map((err) => (
                          <div key={err.id} className="p-2 rounded-lg bg-destructive/5 border border-destructive/10">
                            <p className="text-[11px] text-foreground/80 break-words line-clamp-1">{err.text}</p>
                            <p className="text-[10px] text-destructive break-words line-clamp-1 mt-0.5">{err.error}</p>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 text-[9px] text-primary mt-1 px-1"
                              onClick={() => {
                                setErrorInput(err.error || err.text);
                                setActiveTab('triage');
                              }}
                            >
                              <Wrench className="w-2.5 h-2.5 mr-0.5" /> Triage
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Insights */}
                  {healthReport.aiInsights && (
                    <div>
                      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                        <Shield className="w-3 h-3 text-primary" /> AI Insights
                      </h4>
                      <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                        <p className="text-[11px] text-foreground/80 whitespace-pre-line leading-relaxed break-words">
                          {healthReport.aiInsights}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Server className="w-8 h-8 text-muted-foreground/30 mb-2" />
                  <p className="text-[11px] text-muted-foreground">Run a health check to see system status</p>
                </div>
              )}
            </>
          )}

          {/* TRIAGE TAB */}
          {activeTab === 'triage' && (
            <>
              <div className="space-y-2">
                <Textarea
                  value={errorInput}
                  onChange={(e) => setErrorInput(e.target.value)}
                  placeholder="Paste an error message, stack trace, or describe the issue..."
                  rows={3}
                  className="text-[11px] resize-none"
                />
                <Button
                  size="sm"
                  className="w-full h-8 text-[11px] gap-1.5"
                  onClick={handleTriage}
                  disabled={isLoading || !errorInput.trim()}
                >
                  {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wrench className="w-3 h-3" />}
                  AI Triage & Diagnose
                </Button>
              </div>

              {triageReport && (
                <div className="space-y-3 animate-fade-in">
                  {/* Severity Badge */}
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'text-[10px] font-bold px-2.5 py-1 rounded-full uppercase',
                      triageReport.triage.severity === 'critical' && 'badge-danger',
                      triageReport.triage.severity === 'high' && 'bg-orange-500/15 text-orange-400 border border-orange-500/20',
                      triageReport.triage.severity === 'medium' && 'badge-warning',
                      triageReport.triage.severity === 'low' && 'badge-success',
                    )}>
                      {triageReport.triage.severity}
                    </span>
                    {triageReport.triage.canAutoFix && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        Auto-fixable
                      </span>
                    )}
                  </div>

                  {/* Root Cause */}
                  {triageReport.triage.rootCause && (
                    <div>
                      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Root Cause</h4>
                      <p className="text-[11px] text-foreground/80 break-words leading-relaxed">{triageReport.triage.rootCause}</p>
                    </div>
                  )}

                  {/* Affected Components */}
                  {triageReport.triage.affectedComponents?.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Affected</h4>
                      <div className="flex flex-wrap gap-1">
                        {triageReport.triage.affectedComponents.map((c, i) => (
                          <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/30">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fix Steps */}
                  {triageReport.triage.fixSteps?.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Fix Steps</h4>
                      <ol className="space-y-1">
                        {triageReport.triage.fixSteps.map((step, i) => (
                          <li key={i} className="text-[11px] text-foreground/80 flex gap-1.5 leading-relaxed">
                            <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                            <span className="break-words">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Raw Analysis fallback */}
                  {triageReport.triage.rawAnalysis && (
                    <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-[11px] text-foreground/80 whitespace-pre-line leading-relaxed break-words">
                        {triageReport.triage.rawAnalysis}
                      </p>
                    </div>
                  )}

                  {/* Auto-fix info */}
                  {triageReport.triage.canAutoFix && triageReport.triage.autoFixAction && (
                    <div className="p-2 rounded-lg bg-exec-success/5 border border-exec-success/15">
                      <h4 className="text-[10px] font-semibold text-exec-success mb-0.5">Auto-Fix Action</h4>
                      <p className="text-[11px] text-foreground/80 break-words">{triageReport.triage.autoFixAction}</p>
                      <p className="text-[9px] text-muted-foreground mt-1">
                        Risk: {triageReport.triage.riskOfAutoFix} • {triageReport.triage.riskOfAutoFix === 'low' ? 'Auto-executed' : 'Routed to Decision Center'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* LOGS TAB */}
          {activeTab === 'logs' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8 text-[11px] gap-1.5"
                onClick={runLogAnalysis}
                disabled={isLoading}
              >
                <FileSearch className={cn('w-3 h-3', isLoading && 'animate-spin')} />
                Analyze System Logs
              </Button>

              {logAnalysis ? (
                <div className="space-y-3 animate-fade-in">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="stat-card text-center">
                      <p className="text-[10px] text-muted-foreground">Commands</p>
                      <p className="text-sm font-bold font-mono text-foreground">{logAnalysis.dataPoints.commandsAnalyzed}</p>
                    </div>
                    <div className="stat-card text-center">
                      <p className="text-[10px] text-muted-foreground">Pipeline</p>
                      <p className="text-sm font-bold font-mono text-foreground">{logAnalysis.dataPoints.pipelineActionsAnalyzed}</p>
                    </div>
                    <div className="stat-card text-center">
                      <p className="text-[10px] text-muted-foreground">Events</p>
                      <p className="text-sm font-bold font-mono text-foreground">{logAnalysis.dataPoints.timelineEventsAnalyzed}</p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/30">
                    <p className="text-[11px] text-foreground/80 whitespace-pre-line leading-relaxed break-words">
                      {logAnalysis.analysis}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileSearch className="w-8 h-8 text-muted-foreground/30 mb-2" />
                  <p className="text-[11px] text-muted-foreground">Run analysis to inspect recent activity</p>
                </div>
              )}
            </>
          )}

          {/* DB TAB */}
          {activeTab === 'db' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8 text-[11px] gap-1.5"
                onClick={runDbHealth}
                disabled={isLoading}
              >
                <Database className={cn('w-3 h-3', isLoading && 'animate-spin')} />
                Check Database Health
              </Button>

              {dbHealth ? (
                <div className="space-y-2 animate-fade-in">
                  {Object.entries(dbHealth.tables).map(([name, info]) => (
                    <div key={name} className="flex items-center justify-between p-2 rounded-lg bg-secondary/20 border border-border/20">
                      <span className="text-[11px] font-medium text-foreground">{name}</span>
                      <span className="text-[11px] font-mono text-primary font-semibold">{info.count} rows</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Database className="w-8 h-8 text-muted-foreground/30 mb-2" />
                  <p className="text-[11px] text-muted-foreground">Check database table health</p>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function MetricCard({ label, value, status }: { label: string; value: string; status: 'ok' | 'warn' | 'error' }) {
  return (
    <div className="stat-card">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={cn(
        'text-sm font-bold font-mono',
        status === 'ok' && 'text-foreground',
        status === 'warn' && 'text-exec-warning',
        status === 'error' && 'text-destructive',
      )}>
        {value}
      </p>
    </div>
  );
}
