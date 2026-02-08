import { useState, useRef, useCallback } from 'react';
import { 
  FileText, Upload, Download, Eye, Trash2, Edit2, 
  RotateCw, X, Check, Tag, Loader2, AlertCircle 
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
import { cn } from '@/lib/utils';
import { useDocuments, Document } from '@/hooks/useDocuments';
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

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
    getDownloadUrl,
    getViewUrl,
  } = useDocuments();

  const [isDragging, setIsDragging] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
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
    files.forEach(file => {
      uploadDocument({ file });
    });
  }, [uploadDocument]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      uploadDocument({ file });
    });
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

    const newTags = editTags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    updateDocument({
      id: selectedDocument.id,
      name: editName,
      tags: newTags,
    });

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

  const uploadProgressEntries = Object.entries(uploadProgress);

  return (
    <div className={cn('panel', className)}>
      <div className="panel-header flex items-center justify-between">
        <span>Documents & Database</span>
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
            {isUploading ? 'Uploading...' : 'Drop PDF, Word, Excel, or Image files here'}
          </p>
          <p className="text-xs text-muted-foreground/50 mt-1">Or click to browse</p>
        </div>

        {/* Upload Progress */}
        {uploadProgressEntries.length > 0 && (
          <div className="space-y-2">
            {uploadProgressEntries.map(([id, progress]) => (
              <div key={id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Uploading...</span>
                  <span className="text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-1" />
              </div>
            ))}
          </div>
        )}

        {/* Document List */}
        <ScrollArea className="h-48">
          <div className="space-y-2">
            {isLoading ? (
              // Loading skeletons
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
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No documents yet</p>
                <p className="text-xs mt-1">Upload your first document above</p>
              </div>
            ) : (
              documents.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  document={doc}
                  onView={handleView}
                  onDownload={handleDownload}
                  onEdit={handleEditOpen}
                  onDelete={(d) => {
                    setSelectedDocument(d);
                    setDeleteDialogOpen(true);
                  }}
                  onReprocess={handleReprocess}
                  isReprocessing={isReprocessing}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

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
                <img
                  src={viewUrl}
                  alt={selectedDocument?.name}
                  className="max-w-full h-auto rounded-lg"
                />
              ) : selectedDocument?.file_type === 'pdf' ? (
                <iframe
                  src={viewUrl}
                  className="w-full h-[60vh] rounded-lg border"
                  title={selectedDocument?.name}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>Preview not available for this file type</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => selectedDocument && handleDownload(selectedDocument)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download to view
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

          {/* Summary & Tags */}
          {selectedDocument && (
            <div className="space-y-3 pt-4 border-t">
              <div>
                <h4 className="text-sm font-medium mb-1">AI Summary</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedDocument.summary || 'No summary available'}
                </p>
              </div>
              {selectedDocument.tags && selectedDocument.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedDocument.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
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
            <DialogDescription>
              Update the document name and tags
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">File Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="document.pdf"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tags (comma-separated)</label>
              <Input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="contract, legal, finance"
              />
              <p className="text-xs text-muted-foreground">
                Add tags to help organize and find documents
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={isUpdating}>
              {isUpdating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
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
              Are you sure you want to delete "{selectedDocument?.name}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Extracted document item component for cleaner code
interface DocumentItemProps {
  document: Document;
  onView: (doc: Document) => void;
  onDownload: (doc: Document) => void;
  onEdit: (doc: Document) => void;
  onDelete: (doc: Document) => void;
  onReprocess: (doc: Document) => void;
  isReprocessing: boolean;
}

function DocumentItem({
  document: doc,
  onView,
  onDownload,
  onEdit,
  onDelete,
  onReprocess,
  isReprocessing,
}: DocumentItemProps) {
  const isProcessing = doc.summary === 'Processing...';

  return (
    <div className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group">
      <div className="flex items-start gap-2">
        <span className="text-lg flex-shrink-0">
          {typeIcons[doc.file_type || 'other']}
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-foreground truncate">{doc.name}</h4>
          <p className="text-xs text-muted-foreground truncate">
            {isProcessing ? (
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Analyzing document...
              </span>
            ) : (
              doc.summary || 'No summary'
            )}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground/70">
              {formatFileSize(doc.file_size)}
            </span>
            {doc.tags && doc.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {doc.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-1.5 py-0.5 rounded bg-card text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
                {doc.tags.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{doc.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => onView(doc)}
              >
                <Eye className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>View</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => onDownload(doc)}
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => onEdit(doc)}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => onReprocess(doc)}
                disabled={isReprocessing}
              >
                <RotateCw className={cn('w-3.5 h-3.5', isReprocessing && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Re-analyze with AI</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={() => onDelete(doc)}
              >
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
