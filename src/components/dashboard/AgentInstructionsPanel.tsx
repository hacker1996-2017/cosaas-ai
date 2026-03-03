import { useState } from 'react';
import { BookOpen, Plus, Trash2, Save, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAgentInstructions } from '@/hooks/useAgentInstructions';
import { useAgents } from '@/hooks/useAgents';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface AgentInstructionsPanelProps {
  className?: string;
}

export function AgentInstructionsPanel({ className }: AgentInstructionsPanelProps) {
  const { agents } = useAgents();
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
  const { instructions, isLoading, createInstruction, updateInstruction, deleteInstruction, isCreating } = useAgentInstructions(
    selectedAgentId === 'all' ? undefined : selectedAgentId
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newInstruction, setNewInstruction] = useState({
    instructions: '',
    priority: 0,
    deliverables: '',
    agent_id: '',
  });

  const handleCreate = async () => {
    if (!newInstruction.instructions.trim() || !newInstruction.agent_id) {
      toast.error('Agent and instructions are required');
      return;
    }

    try {
      await createInstruction({
        agent_id: newInstruction.agent_id,
        instructions: newInstruction.instructions.trim(),
        priority: newInstruction.priority,
        deliverables: newInstruction.deliverables
          ? newInstruction.deliverables.split(',').map(d => d.trim()).filter(Boolean)
          : [],
      });
      toast.success('Instruction created');
      setIsDialogOpen(false);
      setNewInstruction({ instructions: '', priority: 0, deliverables: '', agent_id: '' });
    } catch {
      toast.error('Failed to create instruction');
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await updateInstruction({ id, updates: { is_active: !isActive } });
      toast.success(isActive ? 'Instruction disabled' : 'Instruction enabled');
    } catch {
      toast.error('Failed to update instruction');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteInstruction(id);
      toast.success('Instruction deleted');
    } catch {
      toast.error('Failed to delete instruction');
    }
  };

  const getAgentName = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent ? `${agent.emoji} ${agent.name}` : 'Unknown';
  };

  return (
    <div className={cn('panel', className)}>
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <span>Agent Instructions</span>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs">
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New Agent Instruction</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Agent *</Label>
                <Select value={newInstruction.agent_id} onValueChange={(v) => setNewInstruction({ ...newInstruction, agent_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                  <SelectContent>
                    {agents.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.emoji} {a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Instructions *</Label>
                <Textarea
                  value={newInstruction.instructions}
                  onChange={(e) => setNewInstruction({ ...newInstruction, instructions: e.target.value })}
                  placeholder="When a client churns, immediately notify the CEO and prepare a win-back strategy..."
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Priority (0-10)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={newInstruction.priority}
                    onChange={(e) => setNewInstruction({ ...newInstruction, priority: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Deliverables</Label>
                  <Input
                    value={newInstruction.deliverables}
                    onChange={(e) => setNewInstruction({ ...newInstruction, deliverables: e.target.value })}
                    placeholder="Report, Email draft"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="p-3 space-y-3">
        {/* Filter */}
        <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
          <SelectTrigger className="bg-secondary border-0 h-8 text-xs">
            <SelectValue placeholder="Filter by agent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {agents.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.emoji} {a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ScrollArea className="h-64">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : instructions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BookOpen className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No instructions configured</p>
              <p className="text-xs text-muted-foreground mt-1">Add instructions to guide agent behavior</p>
            </div>
          ) : (
            <div className="space-y-2">
              {instructions.map((inst) => (
                <div
                  key={inst.id}
                  className={cn(
                    'p-3 rounded-lg bg-secondary/50 space-y-2',
                    !inst.is_active && 'opacity-50'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-primary">{getAgentName(inst.agent_id)}</p>
                      <p className="text-xs text-foreground mt-1 line-clamp-2">{inst.instructions}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleToggle(inst.id, inst.is_active ?? true)}
                        className="p-1 hover:bg-secondary rounded"
                      >
                        {inst.is_active ? (
                          <ToggleRight className="w-4 h-4 text-[hsl(var(--accent-success))]" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(inst.id)}
                        className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {inst.deliverables && inst.deliverables.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {inst.deliverables.map((d, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>Priority: {inst.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
