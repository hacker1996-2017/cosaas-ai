import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from './useUserProfile';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { toast } from 'sonner';
import type { Tables, Enums } from '@/integrations/supabase/types';

export type Document = Tables<'documents'>;
export type DocumentType = Enums<'document_type'>;

interface UploadDocumentParams {
  file: File;
  agentId?: string;
}

interface UpdateDocumentParams {
  id: string;
  name?: string;
  tags?: string[];
  summary?: string;
}

export function useDocuments() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const organizationId = profile?.organization_id;

  // Fetch documents
  const {
    data: documents = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['documents', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Document[];
    },
    enabled: !!organizationId,
  });

  // Real-time subscription
  useRealtimeSubscription<Document>({
    table: 'documents',
    filter: organizationId ? `organization_id=eq.${organizationId}` : undefined,
    enabled: !!organizationId,
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', organizationId] });
    },
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', organizationId] });
    },
    onDelete: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', organizationId] });
    },
  });

  // Map MIME type to document type enum
  const getDocumentType = (mimeType: string): DocumentType => {
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'docx';
    if (mimeType === 'text/plain') return 'txt';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'xlsx';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'pptx';
    if (mimeType.startsWith('image/')) return 'image';
    return 'other';
  };

  // Upload document
  const uploadMutation = useMutation({
    mutationFn: async ({ file, agentId }: UploadDocumentParams) => {
      if (!organizationId || !user) {
        throw new Error('Not authenticated');
      }

      const fileId = crypto.randomUUID();
      const fileExt = file.name.split('.').pop() || 'bin';
      const storagePath = `${organizationId}/${fileId}.${fileExt}`;

      // Track upload progress
      setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[fileId];
          return newProgress;
        });
        throw uploadError;
      }

      setUploadProgress((prev) => ({ ...prev, [fileId]: 50 }));

      // Create document record
      const documentType = getDocumentType(file.type);
      const { data: document, error: insertError } = await supabase
        .from('documents')
        .insert({
          id: fileId,
          name: file.name,
          file_type: documentType,
          mime_type: file.type,
          file_size: file.size,
          storage_path: storagePath,
          organization_id: organizationId,
          uploaded_by: user.id,
          agent_id: agentId || null,
          summary: 'Processing...',
          tags: [],
        })
        .select()
        .single();

      if (insertError) {
        // Clean up storage on error
        await supabase.storage.from('documents').remove([storagePath]);
        throw insertError;
      }

      setUploadProgress((prev) => ({ ...prev, [fileId]: 75 }));

      // Trigger AI processing
      try {
        const { error: processError } = await supabase.functions.invoke('process-document', {
          body: {
            documentId: fileId,
            fileName: file.name,
            fileType: documentType,
            storagePath,
            organizationId,
          },
        });

        if (processError) {
          console.error('Document processing error:', processError);
          // Don't throw - document is uploaded, just processing failed
        }
      } catch (processErr) {
        console.error('Failed to invoke process-document:', processErr);
      }

      setUploadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[fileId];
        return newProgress;
      });

      return document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', organizationId] });
      toast.success('Document uploaded successfully');
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  // Update document (rename, update tags, etc.)
  const updateMutation = useMutation({
    mutationFn: async ({ id, name, tags, summary }: UpdateDocumentParams) => {
      const updates: Partial<Document> = {};
      if (name !== undefined) updates.name = name;
      if (tags !== undefined) updates.tags = tags;
      if (summary !== undefined) updates.summary = summary;

      const { data, error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', organizationId] });
      toast.success('Document updated');
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  // Delete document
  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      // Get document to find storage path
      const { data: doc, error: fetchError } = await supabase
        .from('documents')
        .select('storage_path')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage
      if (doc?.storage_path) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([doc.storage_path]);

        if (storageError) {
          console.error('Storage delete error:', storageError);
        }
      }

      // Delete record
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', organizationId] });
      toast.success('Document deleted');
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  // Get download URL
  const getDownloadUrl = useCallback(async (storagePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (error) {
      console.error('Failed to get download URL:', error);
      return null;
    }

    return data.signedUrl;
  }, []);

  // Get public view URL (for images)
  const getViewUrl = useCallback(async (storagePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 3600);

    if (error) {
      console.error('Failed to get view URL:', error);
      return null;
    }

    return data.signedUrl;
  }, []);

  // Reprocess document with AI
  const reprocessMutation = useMutation({
    mutationFn: async (document: Document) => {
      if (!organizationId) throw new Error('No organization');

      const { error } = await supabase.functions.invoke('process-document', {
        body: {
          documentId: document.id,
          fileName: document.name,
          fileType: document.file_type,
          storagePath: document.storage_path,
          organizationId,
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', organizationId] });
      toast.success('Document reprocessed');
    },
    onError: (error) => {
      toast.error(`Reprocessing failed: ${error.message}`);
    },
  });

  return {
    documents,
    isLoading,
    error,
    uploadProgress,
    refetch,
    uploadDocument: uploadMutation.mutate,
    isUploading: uploadMutation.isPending,
    updateDocument: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    deleteDocument: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    reprocessDocument: reprocessMutation.mutate,
    isReprocessing: reprocessMutation.isPending,
    getDownloadUrl,
    getViewUrl,
  };
}
