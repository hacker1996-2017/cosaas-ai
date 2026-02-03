import { Integration } from '@/types/executive';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RefreshCw, Settings, Unplug, Plug } from 'lucide-react';

// Mock integrations
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
  connected: { label: 'Active', badgeClass: 'badge-success', icon: '🟢' },
  disconnected: { label: 'Inactive', badgeClass: 'badge-danger', icon: '🔴' },
  error: { label: 'Error', badgeClass: 'badge-warning', icon: '🟡' },
};

interface IntegrationsPanelProps {
  className?: string;
}

export function IntegrationsPanel({ className }: IntegrationsPanelProps) {
  const connectedCount = mockIntegrations.filter((i) => i.status === 'connected').length;

  return (
    <div className={cn('panel', className)}>
      <div className="panel-header flex items-center justify-between">
        <span>Integrations</span>
        <span className="text-xs text-muted-foreground">{connectedCount} active</span>
      </div>

      <div className="p-3 space-y-2">
        {mockIntegrations.map((integration) => {
          const config = statusConfig[integration.status];
          
          return (
            <div
              key={integration.name}
              className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>{config.icon}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{integration.name}</p>
                  {integration.lastSync && integration.status === 'connected' && (
                    <p className="text-xs text-muted-foreground">
                      Last sync: {formatSyncTime(integration.lastSync)}
                    </p>
                  )}
                  {integration.syncErrors > 0 && (
                    <p className="text-xs text-exec-warning">
                      {integration.syncErrors} sync error(s)
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {integration.status === 'connected' ? (
                  <>
                    <Button size="icon" variant="ghost" className="h-7 w-7">
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7">
                      <Settings className="w-3 h-3" />
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-xs">
                    <Plug className="w-3 h-3 mr-1" />
                    Connect
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Integration */}
        <Button variant="outline" className="w-full h-8 text-xs mt-2">
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
