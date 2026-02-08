-- Create documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/png', 'image/jpeg', 'image/webp']
);

-- RLS policies for documents bucket
-- Users can view documents in their organization
CREATE POLICY "Users can view org documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

-- Users can upload documents to their organization folder
CREATE POLICY "Users can upload org documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

-- Users can update documents in their organization
CREATE POLICY "Users can update org documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

-- Users can delete documents in their organization
CREATE POLICY "Users can delete org documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

-- Enable realtime for documents table
ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;