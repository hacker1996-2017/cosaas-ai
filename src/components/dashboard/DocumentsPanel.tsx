import { useState, useRef, useCallback } from 'react';
import { 
  FileText, Upload, Download, Eye, Trash2, Edit2, 
  RotateCw, Check, Loader2, AlertCircle, Brain, 
  Zap, Shield, Users, Calendar, TrendingUp, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useDocuments, Document, DocumentIntelligence } from '@/hooks/useDocuments';
import { formatDistanceToNow } from 'date-fns';

const typeIcons: Record<string, string> = {
  pdf: '📕',
  docx: '📄',
  txt: '📝',
  xlsx: '📊',
  pptx: '📽️',
  image: '🖼️',
  other: '📎',
};

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'Pending', color: 'bg-muted text-muted-foreground', icon: '⏳' },
  processing: { label: 'Analyzing', color: 'bg-primary/10 text-primary', icon: '🔄' },
  analyzed: { label: 'Intel Ready', color: 'bg-emerald-500/10 text-emerald-500', icon: '🧠' },
  actioned: { label: 'Actioned', color: 'bg-blue-500/10 text-blue-500', icon: '⚡' },
  failed: { label: 'Failed', color: 'bg-destructive/10 text-destructive', icon: '❌' },
};

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const riskColors: Record<string, string> = {
  low: 'text-emerald-500',
  medium: 'text-amber-500',
  high: 'text-orange-500',
  critical: 'text-destructive',
};

interface DocumentsPanelProps {
  className?: string;
}

export function DocumentsPanel({ className }: DocumentsPanelProps) {
  const {
    documents,
    isLoading,
    uploadProgress,
    uploadDocument,
    isUploading,
    updateDocument,
    isUpdating,
    deleteDocument,
    isDeleting,
    reprocessDocument,
    isReprocessing,
    createActionsFromDocument,
    isCreatingActions,
    getDownloadUrl,
    getViewUrl,
    getDocumentIntelligence,
  } = useDocuments();

  const [isDragging, setIsDragging] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [intelDialogOpen, setIntelDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTags, setEditTags] = useState('');
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [isLoadingView, setIsLoadingView] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => uploadDocument({ file }));
  }, [uploadDocument]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => uploadDocument({ file }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [uploadDocument]);

  const handleView = useCallback(async (doc: Document) => {
    setSelectedDocument(doc);
    setIsLoadingView(true);
    setViewDialogOpen(true);
    const url = await getViewUrl(doc.storage_path);
    setViewUrl(url);
    setIsLoadingView(false);
  }, [getViewUrl]);

  const handleDownload = useCallback(async (doc: Document) => {
    const url = await getDownloadUrl(doc.storage_path);
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [getDownloadUrl]);

  const handleEditOpen = useCallback((doc: Document) => {
    setSelectedDocument(doc);
    setEditName(doc.name);
    setEditTags(doc.tags?.join(', ') || '');
    setEditDialogOpen(true);
  }, []);

  const handleEditSave = useCallback(() => {
    if (!selectedDocument) return;
    const newTags = editTags.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
    updateDocument({ id: selectedDocument.id, name: editName, tags: newTags });
    setEditDialogOpen(false);
    setSelectedDocument(null);
  }, [selectedDocument, editName, editTags, updateDocument]);

  const handleDeleteConfirm = useCallback(() => {
    if (selectedDocument) {
      deleteDocument(selectedDocument.id);
      setDeleteDialogOpen(false);
      setSelectedDocument(null);
    }
  }, [selectedDocument, deleteDocument]);

  const handleReprocess = useCallback((doc: Document) => {
    reprocessDocument(doc);
  }, [reprocessDocument]);

  const handleViewIntelligence = useCallback((doc: Document) => {
    setSelectedDocument(doc);
    setIntelDialogOpen(true);
  }, []);

  const handleCreateActions = useCallback((doc: Document) => {
    createActionsFromDocument({ documentId: doc.id });
  }, [createActionsFromDocument]);

  const uploadProgressEntries = Object.entries(uploadProgress);
  const selectedIntelligence = selectedDocument ? getDocumentIntelligence(selectedDocument) : null;

  return (
    <div className={cn('panel', className)}>
      <div className="panel-header flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Brain className="w-4 h-4 text-primary" />
          Intelligence Engine
        </span>
        <Badge variant="secondary" className="text-xs">
          {documents.length} files
        </Badge>
      </div>

      <div className="p-3 space-y-3">
        {/* Upload Zone */}
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer',
            isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
            isUploading && 'opacity-50 pointer-events-none'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={handleFileSelect}
          />
          {isUploading ? (
            <Loader2 className="w-6 h-6 mx-auto text-primary mb-2 animate-spin" />
          ) : (
            <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
          )}
          <p className="text-xs text-muted-foreground">
            {isUploading ? 'Uploading & analyzing...' : 'Drop files for AI intelligence extraction'}
          </p>
          <p className="text-xs text-muted-foreground/50 mt-1">PDF, Word, Excel, Images • Full synthesis</p>
        </div>

        {/* Upload Progress */}
        {uploadProgressEntries.length > 0 && (
          <div className="space-y-2">
            {uploadProgressEntries.map(([id, progress]) => (
              <div key={id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Uploading & analyzing...</span>
                  <span className="text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-1" />
              </div>
            ))}
          </div>
        )}

        {/* Document List */}
        <ScrollArea className="h-64">
          <div className="space-y-2">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-2 rounded-lg bg-secondary/50">
                  <div className="flex items-start gap-2">
                    <Skeleton className="w-6 h-6 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <div className="flex gap-1">
                        <Skeleton className="h-4 w-12 rounded" />
                        <Skeleton className="h-4 w-12 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No intelligence yet</p>
                <p className="text-xs mt-1">Upload documents to extract actionable intel</p>
              </div>
            ) : (
              documents.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  document={doc}
                  intelligence={getDocumentIntelligence(doc)}
                  onView={handleView}
                  onDownload={handleDownload}
                  onEdit={handleEditOpen}
                  onDelete={(d) => { setSelectedDocument(d); setDeleteDialogOpen(true); }}
                  onReprocess={handleReprocess}
                  onViewIntelligence={handleViewIntelligence}
                  onCreateActions={handleCreateActions}
                  isReprocessing={isReprocessing}
                  isCreatingActions={isCreatingActions}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Intelligence Report Dialog */}
      <Dialog open={intelDialogOpen} onOpenChange={setIntelDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Intelligence Report: {selectedDocument?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedIntelligence?.document_classification && (
                <span className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{selectedIntelligence.document_classification.category}</Badge>
                  <Badge variant="outline">{selectedIntelligence.document_classification.confidentiality}</Badge>
                  {selectedIntelligence.confidence_score && (
                    <Badge variant="secondary">
                      {Math.round((selectedIntelligence.confidence_score) * 100)}% confidence
                    </Badge>
                  )}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1">
            {selectedIntelligence ? (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="entities">Entities</TabsTrigger>
                  <TabsTrigger value="actions">
                    Actions
                    {selectedIntelligence.action_proposals?.length > 0 && (
                      <Badge variant="destructive" className="ml-1 h-4 text-[10px] px-1">
                        {selectedIntelligence.action_proposals.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="risks">Risks</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 p-1">
                  {/* Summary */}
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> Executive Summary
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{selectedIntelligence.summary}</p>
                  </div>

                  {/* Key Insights */}
                  {selectedIntelligence.insights?.length > 0 && (
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" /> Strategic Insights
                      </h4>
                      <ul className="space-y-1">
                        {selectedIntelligence.insights.map((insight, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex gap-2 items-start">
                            <span className="text-primary mt-0.5">•</span>
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Key Metrics */}
                  {selectedIntelligence.key_metrics?.length > 0 && (
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold">Key Metrics</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedIntelligence.key_metrics.map((metric, i) => (
                          <div key={i} className="p-2 rounded-lg bg-secondary/50">
                            <p className="text-xs text-muted-foreground">{metric.name}</p>
                            <p className="text-sm font-semibold">{metric.value}</p>
                            <p className="text-xs text-muted-foreground/60">{metric.context}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Deadlines */}
                  {selectedIntelligence.deadlines?.length > 0 && (
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Critical Deadlines
                      </h4>
                      <div className="space-y-1">
                        {selectedIntelligence.deadlines.map((deadline, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded bg-secondary/50">
                            <Badge variant="outline" className={cn('text-[10px]', riskColors[deadline.urgency])}>
                              {deadline.urgency}
                            </Badge>
                            <span className="font-medium">{deadline.date}</span>
                            <span className="text-muted-foreground">{deadline.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedIntelligence.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedIntelligence.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="entities" className="space-y-4 p-1">
                  {selectedIntelligence.entities && (
                    <>
                      {selectedIntelligence.entities.people?.length > 0 && (
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" /> People
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {selectedIntelligence.entities.people.map((p, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedIntelligence.entities.organizations?.length > 0 && (
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold">Organizations</h4>
                          <div className="flex flex-wrap gap-1">
                            {selectedIntelligence.entities.organizations.map((o, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{o}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedIntelligence.entities.amounts?.length > 0 && (
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold">Financial Amounts</h4>
                          <div className="flex flex-wrap gap-1">
                            {selectedIntelligence.entities.amounts.map((a, i) => (
                              <Badge key={i} variant="secondary" className="text-xs font-mono">{a}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedIntelligence.entities.dates?.length > 0 && (
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold">Key Dates</h4>
                          <div className="flex flex-wrap gap-1">
                            {selectedIntelligence.entities.dates.map((d, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{d}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedIntelligence.entities.locations?.length > 0 && (
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold">Locations</h4>
                          <div className="flex flex-wrap gap-1">
                            {selectedIntelligence.entities.locations.map((l, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{l}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {selectedIntelligence.relationships?.length > 0 && (
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold">Relationships</h4>
                      <div className="space-y-1">
                        {selectedIntelligence.relationships.map((rel, i) => (
                          <div key={i} className="flex items-center gap-1 text-xs">
                            <Badge variant="outline" className="text-[10px]">{rel.entity1}</Badge>
                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            <span className="text-muted-foreground italic">{rel.relationship}</span>
                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            <Badge variant="outline" className="text-[10px]">{rel.entity2}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="actions" className="space-y-3 p-1">
                  {selectedIntelligence.action_proposals?.length > 0 ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        {selectedIntelligence.action_proposals.length} action proposals extracted. All require CEO approval before execution.
                      </p>
                      {selectedIntelligence.action_proposals.map((action, i) => (
                        <div key={i} className="p-3 rounded-lg border bg-card space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-medium">{action.title}</h5>
                              <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Badge variant="outline" className="text-[10px]">{action.type}</Badge>
                              <Badge variant="outline" className={cn('text-[10px]', riskColors[action.risk_level])}>
                                {action.risk_level}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {action.priority && <span>Priority: <strong>{action.priority}</strong></span>}
                            {action.suggested_assignee && <span>• Assign: {action.suggested_assignee}</span>}
                            {action.deadline && <span>• Due: {action.deadline}</span>}
                          </div>
                        </div>
                      ))}

                      {(selectedDocument as any)?.processing_status !== 'actioned' && (
                        <Button
                          className="w-full"
                          onClick={() => selectedDocument && handleCreateActions(selectedDocument)}
                          disabled={isCreatingActions}
                        >
                          {isCreatingActions ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Zap className="w-4 h-4 mr-2" />
                          )}
                          Queue All Actions for Approval
                        </Button>
                      )}

                      {(selectedDocument as any)?.processing_status === 'actioned' && (
                        <div className="flex items-center gap-2 text-sm text-emerald-500 p-2 bg-emerald-500/10 rounded-lg">
                          <Check className="w-4 h-4" />
                          Actions queued for CEO approval
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">No action proposals extracted</p>
                      <p className="text-xs mt-1">This document may be informational only</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="risks" className="space-y-3 p-1">
                  {selectedIntelligence.risk_signals?.length > 0 ? (
                    selectedIntelligence.risk_signals.map((risk, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-secondary/50">
                        <Shield className={cn('w-4 h-4 mt-0.5', riskColors[risk.severity])} />
                        <div className="flex-1">
                          <p className="text-sm">{risk.signal}</p>
                          <Badge variant="outline" className={cn('text-[10px] mt-1', riskColors[risk.severity])}>
                            {risk.severity}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <Shield className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
                      <p className="text-sm">No risk signals detected</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">Intelligence not yet extracted</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => selectedDocument && handleReprocess(selectedDocument)}
                  disabled={isReprocessing}
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Extract Intelligence
                </Button>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{typeIcons[selectedDocument?.file_type || 'other']}</span>
              {selectedDocument?.name}
            </DialogTitle>
            <DialogDescription>
              {formatFileSize(selectedDocument?.file_size ?? null)} • Uploaded{' '}
              {selectedDocument?.created_at &&
                formatDistanceToNow(new Date(selectedDocument.created_at), { addSuffix: true })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {isLoadingView ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : viewUrl ? (
              selectedDocument?.file_type === 'image' ? (
                <img src={viewUrl} alt={selectedDocument?.name} className="max-w-full h-auto rounded-lg" />
              ) : selectedDocument?.file_type === 'pdf' ? (
                <iframe src={viewUrl} className="w-full h-[60vh] rounded-lg border" title={selectedDocument?.name} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>Preview not available for this file type</p>
                  <Button variant="outline" className="mt-4" onClick={() => selectedDocument && handleDownload(selectedDocument)}>
                    <Download className="w-4 h-4 mr-2" /> Download to view
                  </Button>
                </div>
              )
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p>Could not load preview</p>
              </div>
            )}
          </div>

          {selectedDocument && (
            <div className="space-y-3 pt-4 border-t">
              <div>
                <h4 className="text-sm font-medium mb-1">AI Summary</h4>
                <p className="text-sm text-muted-foreground">{selectedDocument.summary || 'No summary available'}</p>
              </div>
              {selectedDocument.tags && selectedDocument.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedDocument.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>Update the document name and tags</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">File Name</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="document.pdf" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags (comma-separated)</label>
              <Input value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="contract, legal, finance" />
              <p className="text-xs text-muted-foreground">Add tags to help organize and find documents</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedDocument?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Document item component
interface DocumentItemProps {
  document: Document;
  intelligence: DocumentIntelligence | null;
  onView: (doc: Document) => void;
  onDownload: (doc: Document) => void;
  onEdit: (doc: Document) => void;
  onDelete: (doc: Document) => void;
  onReprocess: (doc: Document) => void;
  onViewIntelligence: (doc: Document) => void;
  onCreateActions: (doc: Document) => void;
  isReprocessing: boolean;
  isCreatingActions: boolean;
}

function DocumentItem({
  document: doc,
  intelligence,
  onView,
  onDownload,
  onEdit,
  onDelete,
  onReprocess,
  onViewIntelligence,
  onCreateActions,
  isReprocessing,
  isCreatingActions,
}: DocumentItemProps) {
  const processingStatus = (doc as any).processing_status || 'pending';
  const status = statusConfig[processingStatus] || statusConfig.pending;
  const actionCount = (doc as any).proposed_actions_count || 0;
  const isProcessing = processingStatus === 'processing' || doc.summary === 'Processing...' || doc.summary === 'Reprocessing...';

  return (
    <div className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group">
      <div className="flex items-start gap-2">
        <span className="text-lg flex-shrink-0">{typeIcons[doc.file_type || 'other']}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-medium text-foreground truncate flex-1">{doc.name}</h4>
            <Badge className={cn('text-[10px] h-4 px-1', status.color)}>
              {status.icon} {status.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {isProcessing ? (
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Extracting intelligence...
              </span>
            ) : (
              doc.summary || 'No summary'
            )}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground/70">{formatFileSize(doc.file_size)}</span>
            {actionCount > 0 && (
              <Badge variant="destructive" className="text-[10px] h-4 px-1">
                <Zap className="w-2.5 h-2.5 mr-0.5" />
                {actionCount} actions
              </Badge>
            )}
            {doc.tags && doc.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {doc.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="text-[10px] px-1 py-0.5 rounded bg-card text-muted-foreground">{tag}</span>
                ))}
                {doc.tags.length > 2 && (
                  <span className="text-[10px] text-muted-foreground">+{doc.tags.length - 2}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <TooltipProvider delayDuration={300}>
          {/* Intelligence Report button */}
          {intelligence && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-primary" onClick={() => onViewIntelligence(doc)}>
                  <Brain className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Intelligence Report</TooltipContent>
            </Tooltip>
          )}

          {/* Queue actions button */}
          {actionCount > 0 && processingStatus === 'analyzed' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-500" onClick={() => onCreateActions(doc)} disabled={isCreatingActions}>
                  <Zap className={cn('w-3.5 h-3.5', isCreatingActions && 'animate-pulse')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Queue Actions for Approval</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onView(doc)}>
                <Eye className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>View</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onDownload(doc)}>
                <Download className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEdit(doc)}>
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onReprocess(doc)} disabled={isReprocessing}>
                <RotateCw className={cn('w-3.5 h-3.5', isReprocessing && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Re-analyze with AI</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(doc)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
