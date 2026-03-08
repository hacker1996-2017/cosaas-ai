import { useState } from 'react';
import { 
  Activity, AlertTriangle, Database, FileSearch, Loader2, 
  RefreshCw, Server, Shield, Wrench, CheckCircle2, XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useDevOps } from '@/hooks/useDevOps';

type MiniTab = 'health' | 'triage' | 'logs' | 'db';

export function DevOpsAgentView() {
  const {
    isLoading, healthReport, triageReport, logAnalysis, dbHealth,
    runHealthCheck, runLogAnalysis, runDbHealth, triageError,
  } = useDevOps();

  const [activeTab, setActiveTab] = useState<MiniTab>('health');
  const [errorInput, setErrorInput] = useState('');

  const miniTabs: { id: MiniTab; icon: typeof Activity; label: string }[] = [
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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">TechOps Tools</h4>
        {isLoading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
      </div>

      {/* Mini tabs */}
      <div className="flex items-center gap-0.5">
        {miniTabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold transition-all',
                activeTab === tab.id
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              )}
            >
              <Icon className="w-2.5 h-2.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* HEALTH */}
      {activeTab === 'health' && (
        <div className="space-y-2">
          <Button size="sm" variant="outline" className="w-full h-6 text-[10px] gap-1" onClick={runHealthCheck} disabled={isLoading}>
            <RefreshCw className={cn('w-2.5 h-2.5', isLoading && 'animate-spin')} /> Health Check
          </Button>
          {healthReport && (
            <div className="space-y-1.5 animate-fade-in">
              <div className="flex items-center gap-2 p-1.5 rounded bg-secondary/30 border border-border/20">
                {healthReport.status === 'healthy' ? <CheckCircle2 className="w-3.5 h-3.5 text-exec-success" /> :
                 healthReport.status === 'degraded' ? <AlertTriangle className="w-3.5 h-3.5 text-exec-warning" /> :
                 <XCircle className="w-3.5 h-3.5 text-destructive" />}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold">System</span>
                    <span className={cn('text-[11px] font-bold font-mono', statusColor(healthReport.status))}>{healthReport.overallScore}%</span>
                  </div>
                  <Progress value={healthReport.overallScore} className="h-1 mt-0.5" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1 text-center">
                <div className="p-1 rounded bg-secondary/20 border border-border/15">
                  <p className="text-[8px] text-muted-foreground">Agents</p>
                  <p className="text-[10px] font-bold font-mono">{healthReport.agents.online}/{healthReport.agents.total}</p>
                </div>
                <div className="p-1 rounded bg-secondary/20 border border-border/15">
                  <p className="text-[8px] text-muted-foreground">Errors</p>
                  <p className={cn('text-[10px] font-bold font-mono', healthReport.commands.failed > 0 ? 'text-destructive' : 'text-foreground')}>{healthReport.commands.failed}</p>
                </div>
                <div className="p-1 rounded bg-secondary/20 border border-border/15">
                  <p className="text-[8px] text-muted-foreground">Pending</p>
                  <p className="text-[10px] font-bold font-mono">{healthReport.pendingDecisions}</p>
                </div>
              </div>
              {healthReport.recentErrors.length > 0 && (
                <div className="space-y-0.5">
                  {healthReport.recentErrors.slice(0, 2).map((err) => (
                    <div key={err.id} className="p-1 rounded bg-destructive/5 border border-destructive/10">
                      <p className="text-[9px] text-destructive break-words line-clamp-1">{err.error || err.text}</p>
                      <button className="text-[8px] text-primary hover:underline mt-0.5" onClick={() => { setErrorInput(err.error || err.text); setActiveTab('triage'); }}>
                        Triage →
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {healthReport.aiInsights && (
                <div className="p-1.5 rounded bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Shield className="w-2.5 h-2.5 text-primary" />
                    <span className="text-[8px] font-semibold uppercase text-muted-foreground">AI Insights</span>
                  </div>
                  <p className="text-[9px] text-foreground/80 whitespace-pre-line leading-relaxed break-words line-clamp-6">{healthReport.aiInsights}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TRIAGE */}
      {activeTab === 'triage' && (
        <div className="space-y-2">
          <Textarea value={errorInput} onChange={(e) => setErrorInput(e.target.value)} placeholder="Paste error or describe issue..." rows={2} className="text-[10px] resize-none" />
          <Button size="sm" className="w-full h-6 text-[10px] gap-1" onClick={handleTriage} disabled={isLoading || !errorInput.trim()}>
            {isLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Wrench className="w-2.5 h-2.5" />} AI Triage
          </Button>
          {triageReport && (
            <div className="space-y-1.5 animate-fade-in">
              <div className="flex items-center gap-1.5">
                <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase',
                  triageReport.triage.severity === 'critical' && 'badge-danger',
                  triageReport.triage.severity === 'high' && 'badge-warning',
                  triageReport.triage.severity === 'medium' && 'bg-secondary text-muted-foreground border border-border/30',
                  triageReport.triage.severity === 'low' && 'badge-success',
                )}>{triageReport.triage.severity}</span>
                {triageReport.triage.canAutoFix && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">Auto-fixable</span>}
              </div>
              {triageReport.triage.rootCause && <p className="text-[10px] text-foreground/80 break-words leading-relaxed">{triageReport.triage.rootCause}</p>}
              {triageReport.triage.fixSteps?.length > 0 && (
                <ol className="space-y-0.5">
                  {triageReport.triage.fixSteps.map((step, i) => (
                    <li key={i} className="text-[9px] text-foreground/80 flex gap-1 leading-relaxed">
                      <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                      <span className="break-words">{step}</span>
                    </li>
                  ))}
                </ol>
              )}
              {triageReport.triage.rawAnalysis && <p className="text-[9px] text-foreground/80 whitespace-pre-line break-words p-1.5 rounded bg-secondary/30 border border-border/20">{triageReport.triage.rawAnalysis}</p>}
            </div>
          )}
        </div>
      )}

      {/* LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-2">
          <Button size="sm" variant="outline" className="w-full h-6 text-[10px] gap-1" onClick={runLogAnalysis} disabled={isLoading}>
            <FileSearch className={cn('w-2.5 h-2.5', isLoading && 'animate-spin')} /> Analyze Logs
          </Button>
          {logAnalysis && (
            <div className="space-y-1.5 animate-fade-in">
              <div className="grid grid-cols-3 gap-1 text-center">
                <div className="p-1 rounded bg-secondary/20 border border-border/15">
                  <p className="text-[8px] text-muted-foreground">Cmds</p>
                  <p className="text-[10px] font-bold font-mono">{logAnalysis.dataPoints.commandsAnalyzed}</p>
                </div>
                <div className="p-1 rounded bg-secondary/20 border border-border/15">
                  <p className="text-[8px] text-muted-foreground">Pipeline</p>
                  <p className="text-[10px] font-bold font-mono">{logAnalysis.dataPoints.pipelineActionsAnalyzed}</p>
                </div>
                <div className="p-1 rounded bg-secondary/20 border border-border/15">
                  <p className="text-[8px] text-muted-foreground">Events</p>
                  <p className="text-[10px] font-bold font-mono">{logAnalysis.dataPoints.timelineEventsAnalyzed}</p>
                </div>
              </div>
              <p className="text-[9px] text-foreground/80 whitespace-pre-line leading-relaxed break-words p-1.5 rounded bg-secondary/30 border border-border/20 line-clamp-[12]">{logAnalysis.analysis}</p>
            </div>
          )}
        </div>
      )}

      {/* DB */}
      {activeTab === 'db' && (
        <div className="space-y-2">
          <Button size="sm" variant="outline" className="w-full h-6 text-[10px] gap-1" onClick={runDbHealth} disabled={isLoading}>
            <Database className={cn('w-2.5 h-2.5', isLoading && 'animate-spin')} /> DB Health
          </Button>
          {dbHealth && (
            <div className="space-y-0.5 animate-fade-in">
              {Object.entries(dbHealth.tables).map(([name, info]) => (
                <div key={name} className="flex items-center justify-between p-1 rounded bg-secondary/20 border border-border/15">
                  <span className="text-[9px] font-medium text-foreground">{name}</span>
                  <span className="text-[9px] font-mono text-primary font-semibold">{info.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
