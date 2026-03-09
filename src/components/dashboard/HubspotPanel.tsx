import { useState } from 'react';
import {
  Loader2, RefreshCw, LogOut, Users, DollarSign,
  CheckCircle2, AlertTriangle, ExternalLink, ArrowRightLeft,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { useHubspot } from '@/hooks/useHubspot';

interface HubspotPanelProps {
  className?: string;
}

export function HubspotPanel({ className }: HubspotPanelProps) {
  const {
    status, isConnected, checkingStatus,
    connect, disconnect, syncContacts,
    deals, loadingDeals, refetchDeals,
  } = useHubspot();

  const [showSetup, setShowSetup] = useState(false);
  const [tokenInput, setTokenInput] = useState('');

  const handleConnect = () => {
    if (!tokenInput.trim()) return;
    connect.mutate(tokenInput.trim(), {
      onSuccess: () => {
        setTokenInput('');
        setShowSetup(false);
      },
    });
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (checkingStatus) {
    return (
      <div className={cn('panel', className)}>
        <div className="panel-header flex items-center gap-2">
          <HubspotIcon className="w-3.5 h-3.5" />
          <span>HubSpot CRM</span>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // ── Not connected ────────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className={cn('panel', className)}>
        <div className="panel-header flex items-center gap-2">
          <HubspotIcon className="w-3.5 h-3.5" />
          <span>HubSpot CRM</span>
        </div>

        <div className="p-4 space-y-4">
          {!showSetup ? (
            <div className="text-center space-y-4">
              <div
                className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, hsl(14 100% 57% / 0.15) 0%, hsl(14 100% 57% / 0.05) 100%)',
                  border: '1px solid hsl(14 100% 57% / 0.25)',
                }}
              >
                <HubspotIcon className="w-6 h-6" />
              </div>

              <div>
                <p className="text-[13px] font-semibold text-foreground">Connect HubSpot CRM</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Sync contacts, deals and activities between your CRM and HubSpot — bidirectionally.
                </p>
              </div>

              <Button
                size="sm"
                className="w-full h-9 text-[12px] font-medium"
                style={{ background: '#ff7a59', color: 'white' }}
                onClick={() => setShowSetup(true)}
              >
                <HubspotIcon className="w-4 h-4 mr-2" />
                Connect HubSpot
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[12px] font-semibold text-foreground">Setup Guide</p>

              <div className="space-y-2">
                {[
                  { n: 1, text: 'Log in to your HubSpot account' },
                  { n: 2, text: 'Go to Settings → Integrations → Private Apps' },
                  { n: 3, text: 'Click "Create a private app"' },
                  { n: 4, text: 'Under Scopes, enable CRM: Contacts, Deals (read+write)' },
                  { n: 5, text: 'Create the app and copy your access token' },
                ].map(step => (
                  <div key={step.n} className="flex items-start gap-2">
                    <div
                      className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5"
                      style={{ background: 'hsl(14 100% 57% / 0.15)', color: '#ff7a59' }}
                    >
                      {step.n}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{step.text}</p>
                  </div>
                ))}
              </div>

              <a
                href="https://app.hubspot.com/private-apps"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-[11px] text-primary hover:underline py-1"
              >
                Open HubSpot Private Apps
                <ExternalLink className="w-3 h-3" />
              </a>

              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground">Access Token</label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                  placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full px-2.5 py-2 rounded-md text-[11px] border border-border/40 bg-background text-foreground focus:border-primary/50 focus:outline-none font-mono"
                />
              </div>

              <div className="flex gap-1.5 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 text-[10px] border-border/30"
                  onClick={() => { setShowSetup(false); setTokenInput(''); }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-8 text-[10px]"
                  style={{ background: '#ff7a59', color: 'white' }}
                  onClick={handleConnect}
                  disabled={!tokenInput.trim() || connect.isPending}
                >
                  {connect.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Verify & Connect'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Connected ────────────────────────────────────────────────────────────
  return (
    <div className={cn('panel', className)}>
      {/* Header */}
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HubspotIcon className="w-3.5 h-3.5" />
          <span>HubSpot CRM</span>
          <div
            className="flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded-full"
            style={{ background: 'hsl(152 60% 48% / 0.1)', border: '1px solid hsl(152 60% 48% / 0.2)' }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-exec-success" style={{ boxShadow: '0 0 4px hsl(152 60% 48% / 0.6)' }} />
            <span className="text-[9px] text-exec-success font-medium">Live</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5 text-muted-foreground hover:text-foreground"
            onClick={() => refetchDeals()}
            disabled={loadingDeals}
          >
            <RefreshCw className={cn('w-3 h-3', loadingDeals && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Portal info */}
      <div className="px-3 pt-2">
        <div
          className="flex items-center justify-between px-2.5 py-2 rounded-lg"
          style={{ background: 'hsl(var(--bg-soft) / 0.3)', border: '1px solid hsl(var(--border) / 0.2)' }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3 text-exec-success flex-shrink-0" />
            <div>
              <p className="text-[11px] text-foreground font-medium">
                Portal {status?.portalId}
              </p>
              {status?.hubDomain && (
                <p className="text-[9px] text-muted-foreground truncate max-w-[140px]">
                  {status.hubDomain}
                </p>
              )}
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5 text-muted-foreground hover:text-destructive"
            onClick={() => disconnect.mutate()}
            disabled={disconnect.isPending}
            title="Disconnect HubSpot"
          >
            <LogOut className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-3 pt-2">
        <div className="grid grid-cols-2 gap-1.5">
          <div
            className="px-2.5 py-2 rounded-lg"
            style={{ background: 'hsl(var(--bg-soft) / 0.3)', border: '1px solid hsl(var(--border) / 0.2)' }}
          >
            <div className="flex items-center gap-1.5">
              <Users className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Contacts Synced</span>
            </div>
            <p className="text-[14px] font-bold text-foreground mt-0.5">{status?.contactsSynced ?? 0}</p>
          </div>
          <div
            className="px-2.5 py-2 rounded-lg"
            style={{ background: 'hsl(var(--bg-soft) / 0.3)', border: '1px solid hsl(var(--border) / 0.2)' }}
          >
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Last Sync</span>
            </div>
            <p className="text-[11px] font-medium text-foreground mt-0.5">
              {status?.lastSyncAt
                ? formatDistanceToNow(new Date(status.lastSyncAt), { addSuffix: true })
                : 'Never'}
            </p>
          </div>
        </div>
      </div>

      {/* Sync button */}
      <div className="px-3 pt-2">
        <Button
          size="sm"
          className="w-full h-8 text-[11px]"
          variant="outline"
          onClick={() => syncContacts.mutate()}
          disabled={syncContacts.isPending}
        >
          {syncContacts.isPending ? (
            <>
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <ArrowRightLeft className="w-3 h-3 mr-1.5" />
              Sync Contacts from HubSpot
            </>
          )}
        </Button>
      </div>

      {/* Recent deals */}
      <div className="p-3 space-y-1.5">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide px-0.5 pb-0.5 flex items-center gap-1.5">
          <DollarSign className="w-3 h-3" />
          Recent Deals
        </p>

        {loadingDeals ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-[11px] text-muted-foreground">No deals found in HubSpot</p>
          </div>
        ) : (
          deals.slice(0, 5).map(deal => {
            const props = deal.properties;
            const amount = props.amount ? parseFloat(props.amount) : null;
            return (
              <div
                key={deal.id}
                className="flex items-center justify-between px-2.5 py-2 rounded-lg"
                style={{ background: 'hsl(var(--bg-soft) / 0.3)', border: '1px solid hsl(var(--border) / 0.2)' }}
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-foreground truncate">
                    {props.dealname || `Deal ${deal.id}`}
                  </p>
                  <p className="text-[9px] text-muted-foreground capitalize">
                    {props.dealstage?.replace(/_/g, ' ') || 'Unknown stage'}
                    {props.closedate && ` · ${format(new Date(props.closedate), 'MMM d')}`}
                  </p>
                </div>
                {amount !== null && (
                  <div className="text-[12px] font-bold text-exec-success flex-shrink-0">
                    ${amount.toLocaleString()}
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

function HubspotIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.69 12.96c-.28 0-.55.06-.8.17V9.91a1.5 1.5 0 10-1.36 0v3.22c-.25-.11-.52-.17-.8-.17-1.12 0-2.03.9-2.03 2.02 0 .82.5 1.53 1.2 1.84v2.07c0 .46.37.83.83.83h1.96c.46 0 .83-.37.83-.83v-2.07a2.01 2.01 0 00-1.83-3.86zM6.3 11.78c.47 0 .84-.38.84-.84V7.16a1.5 1.5 0 00.96-1.4 1.5 1.5 0 00-3 0c0 .59.35 1.1.84 1.35v3.83c0 .46.38.84.84.84h.52zM6.81 13.12a2.72 2.72 0 000 5.43h4.93a2.72 2.72 0 000-5.43H6.81z"
        fill="#ff7a59"
      />
    </svg>
  );
}
