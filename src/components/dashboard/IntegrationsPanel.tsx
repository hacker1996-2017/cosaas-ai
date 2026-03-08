import { useState } from 'react';
import { useIntegrations } from '@/hooks/useIntegrations';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  RefreshCw, Settings, Plug, Cable, Plus, Trash2,
  CheckCircle2, XCircle, AlertTriangle, Loader2,
  Activity, Zap, ArrowUpDown, Globe, Shield, Heart,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const SERVICE_TYPES = [
  { value: 'crm', label: 'CRM', icon: '🏢', examples: 'HubSpot, Salesforce' },
  { value: 'email', label: 'Email', icon: '📧', examples: 'Gmail, Outlook, Resend' },
  { value: 'payment', label: 'Payment', icon: '💳', examples: 'Stripe, M-Pesa' },
  { value: 'communication', label: 'Communication', icon: '💬', examples: 'Slack, Twilio' },
  { value: 'accounting', label: 'Accounting', icon: '📊', examples: 'QuickBooks, Xero' },
  { value: 'storage', label: 'Storage', icon: '📁', examples: 'Google Drive, S3' },
  { value: 'analytics', label: 'Analytics', icon: '📈', examples: 'Mixpanel, GA4' },
  { value: 'webhook', label: 'Webhook', icon: '🔗', examples: 'Custom API' },
] as const;

const statusConfig = {
  connected: { label: 'Active', icon: CheckCircle2, color: 'text-exec-success', dot: 'bg-exec-success', shadow: '0 0 6px hsl(152 60% 48% / 0.4)' },
  disconnected: { label: 'Inactive', icon: XCircle, color: 'text-muted-foreground', dot: 'bg-muted-foreground/40', shadow: 'none' },
  error: { label: 'Error', icon: AlertTriangle, color: 'text-exec-warning', dot: 'bg-exec-warning', shadow: '0 0 6px hsl(36 100% 57% / 0.4)' },
  syncing: { label: 'Syncing', icon: Loader2, color: 'text-primary', dot: 'bg-primary', shadow: '0 0 6px hsl(var(--primary) / 0.4)' },
};

interface IntegrationsPanelProps {
  className?: string;
}

type ViewMode = 'list' | 'add';

export function IntegrationsPanel({ className }: IntegrationsPanelProps) {
  const {
    integrations, isLoading, stats,
    createIntegration, updateIntegration, toggleActive,
    triggerSync, deleteIntegration, testConnection,
  } = useIntegrations();

  const [view, setView] = useState<ViewMode>('list');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Add form state
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('crm');
  const [newWebhook, setNewWebhook] = useState('');

  const handleCreate = () => {
    if (!newName.trim()) return;
    createIntegration.mutate({
      serviceName: newName.trim(),
      serviceType: newType,
      webhookUrl: newWebhook.trim() || undefined,
    });
    setNewName('');
    setNewWebhook('');
    setView('list');
  };

  return (
    <div className={cn('panel', className)}>
      {/* Header */}
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cable className="w-3.5 h-3.5 text-primary" />
          <span>Integrations</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-muted-foreground">
            {stats.active}/{stats.total} active
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5 text-muted-foreground hover:text-foreground"
            onClick={() => setView(view === 'add' ? 'list' : 'add')}
          >
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-3 pt-3 pb-1">
        <div className="flex items-center gap-2">
          {[
            { label: 'Active', value: stats.active, icon: Zap, cls: 'text-exec-success' },
            { label: 'Errors', value: stats.errored, icon: AlertTriangle, cls: stats.errored > 0 ? 'text-exec-warning' : 'text-muted-foreground' },
            { label: 'Sync Errors', value: stats.totalSyncErrors, icon: ArrowUpDown, cls: stats.totalSyncErrors > 0 ? 'text-exec-warning' : 'text-muted-foreground' },
          ].map(({ label, value, icon: Icon, cls }) => (
            <div
              key={label}
              className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-border/20"
              style={{ background: 'hsl(var(--bg-soft) / 0.3)' }}
            >
              <Icon className={cn('w-3 h-3', cls)} />
              <div>
                <p className="text-[10px] text-muted-foreground">{label}</p>
                <p className="text-[12px] font-bold text-foreground">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add form */}
      {view === 'add' && (
        <div className="px-3 pt-2 space-y-2">
          <div
            className="p-3 rounded-lg border border-primary/20 space-y-2.5"
            style={{ background: 'hsl(var(--bg-soft) / 0.5)' }}
          >
            <p className="text-[11px] font-semibold text-foreground">New Integration</p>

            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Service name (e.g. HubSpot)"
              className="w-full px-3 py-1.5 rounded-md text-[11px] border border-border/40 bg-background text-foreground focus:border-primary/50 focus:outline-none"
            />

            <div className="grid grid-cols-4 gap-1">
              {SERVICE_TYPES.map(st => (
                <button
                  key={st.value}
                  onClick={() => setNewType(st.value)}
                  className={cn(
                    'flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-md text-[9px] border transition-all',
                    newType === st.value
                      ? 'border-primary/40 bg-primary/10 text-foreground'
                      : 'border-border/20 text-muted-foreground hover:border-border/40'
                  )}
                >
                  <span className="text-sm">{st.icon}</span>
                  <span>{st.label}</span>
                </button>
              ))}
            </div>

            <input
              value={newWebhook}
              onChange={e => setNewWebhook(e.target.value)}
              placeholder="Webhook URL (optional)"
              className="w-full px-3 py-1.5 rounded-md text-[11px] border border-border/40 bg-background text-foreground focus:border-primary/50 focus:outline-none"
            />

            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-[10px] border-border/30"
                onClick={() => setView('list')}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1 h-7 text-[10px]"
                onClick={handleCreate}
                disabled={!newName.trim() || createIntegration.isPending}
              >
                {createIntegration.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  'Create'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Integration list */}
      <div className="p-3 space-y-1.5">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          </div>
        ) : integrations.length === 0 ? (
          <div className="text-center py-6">
            <Globe className="w-6 h-6 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-[11px] text-muted-foreground">No integrations configured</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 h-7 text-[10px]"
              onClick={() => setView('add')}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Integration
            </Button>
          </div>
        ) : (
          integrations.map(integration => {
            const status = (statusConfig as any)[integration.status || 'disconnected'] || statusConfig.disconnected;
            const StatusIcon = status.icon;
            const isExpanded = expandedId === integration.id;
            const typeInfo = SERVICE_TYPES.find(t => t.value === integration.service_type);

            return (
              <div key={integration.id}>
                <div
                  className={cn(
                    'flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer',
                    isExpanded ? 'border-primary/30 bg-primary/5' : 'border-border/20 hover:border-border/40',
                  )}
                  style={{ background: isExpanded ? undefined : 'hsl(var(--bg-soft) / 0.3)' }}
                  onClick={() => setExpandedId(isExpanded ? null : integration.id)}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm">{typeInfo?.icon || '🔗'}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[12px] font-medium text-foreground">{integration.service_name}</p>
                        <div
                          className={cn('w-1.5 h-1.5 rounded-full', status.dot)}
                          style={{ boxShadow: status.shadow }}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-muted-foreground capitalize">{integration.service_type}</span>
                        {integration.last_sync_at && (
                          <span className="text-[9px] text-muted-foreground font-mono">
                            · {formatDistanceToNow(new Date(integration.last_sync_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5">
                    {integration.status === 'connected' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={e => { e.stopPropagation(); triggerSync.mutate(integration.id); }}
                        disabled={triggerSync.isPending}
                      >
                        <RefreshCw className={cn('w-3 h-3', triggerSync.isPending && 'animate-spin')} />
                      </Button>
                    )}
                    <StatusIcon className={cn('w-3.5 h-3.5', status.color, integration.status === 'syncing' && 'animate-spin')} />
                  </div>
                </div>

                {/* Expanded detail view */}
                {isExpanded && (
                  <div
                    className="mt-1 p-3 rounded-lg border border-border/20 space-y-3"
                    style={{ background: 'hsl(var(--bg-soft) / 0.3)' }}
                  >
                    {/* Status details */}
                    <div className="grid grid-cols-2 gap-2">
                      <DetailItem label="Status" value={status.label} />
                      <DetailItem label="Type" value={integration.service_type} />
                      <DetailItem
                        label="Last Sync"
                        value={integration.last_sync_at
                          ? format(new Date(integration.last_sync_at), 'MMM d, h:mm a')
                          : 'Never'}
                      />
                      <DetailItem
                        label="Sync Errors"
                        value={String(integration.sync_errors || 0)}
                        highlight={!!integration.sync_errors && integration.sync_errors > 0}
                      />
                    </div>

                    {integration.error_message && (
                      <div className="p-2 rounded-md border border-exec-warning/20 bg-exec-warning/5">
                        <p className="text-[10px] text-exec-warning font-medium">
                          ⚠️ {integration.error_message}
                        </p>
                      </div>
                    )}

                    {integration.webhook_url && (
                      <div>
                        <p className="text-[9px] text-muted-foreground mb-0.5">Webhook</p>
                        <p className="text-[10px] font-mono text-foreground/80 truncate">
                          {integration.webhook_url}
                        </p>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-border/20">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[9px] px-2 border-border/30"
                        onClick={() => testConnection.mutate(integration.id)}
                        disabled={testConnection.isPending}
                      >
                        <Heart className={cn('w-3 h-3 mr-1', testConnection.isPending && 'animate-pulse')} />
                        Health Check
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[9px] px-2 border-border/30"
                        onClick={() => triggerSync.mutate(integration.id)}
                        disabled={triggerSync.isPending}
                      >
                        <RefreshCw className={cn('w-3 h-3 mr-1', triggerSync.isPending && 'animate-spin')} />
                        Sync Now
                      </Button>
                      <Button
                        size="sm"
                        variant={integration.is_active ? 'outline' : 'default'}
                        className="h-6 text-[9px] px-2 border-border/30"
                        onClick={() => toggleActive(integration.id, !integration.is_active)}
                      >
                        {integration.is_active ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 ml-auto text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Remove ${integration.service_name}?`)) {
                            deleteIntegration.mutate(integration.id);
                            setExpandedId(null);
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function DetailItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[9px] text-muted-foreground">{label}</p>
      <p className={cn('text-[11px] font-medium capitalize', highlight ? 'text-exec-warning' : 'text-foreground')}>
        {value}
      </p>
    </div>
  );
}
