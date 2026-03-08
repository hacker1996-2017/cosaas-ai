import { Integration } from '@/types/executive';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RefreshCw, Settings, Plug, Cable } from 'lucide-react';

const mockIntegrations: Integration[] = [
  { name: 'HubSpot', status: 'connected', lastSync: new Date(), syncErrors: 0 },
  { name: 'Gmail', status: 'connected', lastSync: new Date(Date.now() - 300000), syncErrors: 0 },
  { name: 'QuickBooks', status: 'connected', lastSync: new Date(Date.now() - 600000), syncErrors: 0 },
  { name: 'Twilio', status: 'connected', lastSync: new Date(Date.now() - 1200000), syncErrors: 0 },
  { name: 'Slack', status: 'connected', lastSync: new Date(Date.now() - 1800000), syncErrors: 1 },
  { name: 'M-Pesa API', status: 'connected', syncErrors: 0 },
  { name: 'Stripe', status: 'disconnected', syncErrors: 0 },
];

const statusConfig = {
  connected: { label: 'Active', dotClass: 'bg-exec-success', shadow: '0 0 6px hsl(152 60% 48% / 0.4)' },
  disconnected: { label: 'Inactive', dotClass: 'bg-muted-foreground/40', shadow: 'none' },
  error: { label: 'Error', dotClass: 'bg-exec-warning', shadow: '0 0 6px hsl(36 100% 57% / 0.4)' },
};

interface IntegrationsPanelProps {
  className?: string;
}

export function IntegrationsPanel({ className }: IntegrationsPanelProps) {
  const connectedCount = mockIntegrations.filter((i) => i.status === 'connected').length;

  return (
    <div className={cn('panel', className)}>
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cable className="w-3.5 h-3.5 text-primary" />
          <span>Integrations</span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">{connectedCount} active</span>
      </div>

      <div className="p-3 space-y-1.5">
        {mockIntegrations.map((integration) => {
          const config = statusConfig[integration.status];
          
          return (
            <div
              key={integration.name}
              className="flex items-center justify-between p-2 rounded-lg border border-border/20 hover:border-border/40 transition-colors"
              style={{ background: 'hsl(var(--bg-soft) / 0.3)' }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={cn('w-1.5 h-1.5 rounded-full', config.dotClass)}
                  style={{ boxShadow: config.shadow }}
                />
                <div>
                  <p className="text-[12px] font-medium text-foreground">{integration.name}</p>
                  {integration.lastSync && integration.status === 'connected' && (
                    <p className="text-[9px] text-muted-foreground font-mono">
                      {formatSyncTime(integration.lastSync)}
                    </p>
                  )}
                  {integration.syncErrors > 0 && (
                    <p className="text-[9px] text-exec-warning font-medium">
                      {integration.syncErrors} error(s)
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-0.5">
                {integration.status === 'connected' ? (
                  <>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                      <Settings className="w-3 h-3" />
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 border-border/40">
                    <Plug className="w-3 h-3 mr-1" />
                    Connect
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        <Button variant="outline" className="w-full h-7 text-[10px] mt-2 border-border/30 text-muted-foreground hover:text-foreground">
          + Add Integration
        </Button>
      </div>
    </div>
  );
}

function formatSyncTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}
