import { useState } from 'react';
import { FileText, Upload, Download, Share2, Eye } from 'lucide-react';
import { Document } from '@/types/executive';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Mock documents
const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'Policy Form.pdf',
    type: 'pdf',
    uploadedAt: new Date(Date.now() - 86400000),
    summary: 'Policy ID: 12345, Client: Acme Corp',
    tags: ['policy', 'insurance'],
  },
  {
    id: '2',
    name: 'Q1 Report.docx',
    type: 'docx',
    uploadedAt: new Date(Date.now() - 172800000),
    summary: 'Quarterly performance analysis with KPIs',
    tags: ['report', 'finance'],
  },
  {
    id: '3',
    name: 'Contract Template.pdf',
    type: 'pdf',
    uploadedAt: new Date(Date.now() - 604800000),
    summary: 'Standard enterprise contract template v2.1',
    tags: ['contract', 'legal'],
  },
];

const typeIcons = {
  pdf: '📕',
  docx: '📄',
  txt: '📝',
};

interface DocumentsPanelProps {
  className?: string;
}

export function DocumentsPanel({ className }: DocumentsPanelProps) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className={cn('panel', className)}>
      <div className="panel-header">Documents & Database</div>

      <div className="p-3 space-y-3">
        {/* Upload Zone */}
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer',
            isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={() => setIsDragging(false)}
        >
          <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">Drop PDF, Word, or Text files here</p>
          <p className="text-xs text-muted-foreground/50 mt-1">Or click to browse</p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary">
          <FileText className="w-4 h-4 text-primary" />
          <span className="text-xs text-foreground">
            <strong>{mockDocuments.length}</strong> documents uploaded
          </span>
        </div>

        {/* Document List */}
        <ScrollArea className="h-40">
          <div className="space-y-2">
            {mockDocuments.map((doc) => (
              <div
                key={doc.id}
                className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">{typeIcons[doc.type]}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground truncate">
                      {doc.name}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">
                      {doc.summary}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {doc.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-1.5 py-0.5 rounded bg-card text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 mt-2">
                  <Button size="sm" variant="ghost" className="h-6 text-xs">
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-xs">
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-xs">
                    <Share2 className="w-3 h-3 mr-1" />
                    Share
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
