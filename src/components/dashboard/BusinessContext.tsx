import { useState } from 'react';
import { Building2, Users, Globe, TrendingUp } from 'lucide-react';
import { BusinessContext as BusinessContextType } from '@/types/executive';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const industries = ['Insurance', 'Finance', 'Tech', 'Healthcare', 'Retail', 'Custom...'];

interface BusinessContextProps {
  className?: string;
}

export function BusinessContext({ className }: BusinessContextProps) {
  const [context, setContext] = useState<BusinessContextType>({
    market: 'SMEs',
    totalClients: 1240,
    industry: 'Insurance',
    revenue: 2450000,
  });

  return (
    <div className={cn('panel', className)}>
      <div className="panel-header">Business Context</div>
      
      <div className="p-4 space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Market</p>
              <p className="text-sm font-medium text-foreground">{context.market}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-exec-success/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-exec-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Clients</p>
              <p className="text-sm font-medium text-foreground">{context.totalClients.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Industry Selector */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Industry</label>
          <Select
            value={context.industry}
            onValueChange={(value) => setContext((prev) => ({ ...prev, industry: value }))}
          >
            <SelectTrigger className="bg-secondary border-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {industries.map((industry) => (
                <SelectItem key={industry} value={industry}>
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Revenue */}
        {context.revenue && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary">
            <TrendingUp className="w-4 h-4 text-exec-success" />
            <div>
              <p className="text-xs text-muted-foreground">Est. Annual Revenue</p>
              <p className="text-sm font-medium text-foreground">
                ${(context.revenue / 1000000).toFixed(1)}M
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
