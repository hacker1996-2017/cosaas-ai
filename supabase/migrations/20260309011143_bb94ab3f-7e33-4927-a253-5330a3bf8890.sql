-- Add intelligence columns to documents table
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS intelligence jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'pending'::text,
  ADD COLUMN IF NOT EXISTS intelligence_confidence numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS proposed_actions_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS linked_decision_id uuid REFERENCES public.decisions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS intelligence_extracted_at timestamp with time zone DEFAULT NULL;

-- Add index for processing status
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON public.documents(processing_status);

-- Add comment for intelligence field structure
COMMENT ON COLUMN public.documents.intelligence IS 'AI-extracted structured intelligence: entities, insights, deadlines, action_proposals, risk_signals, etc.';
COMMENT ON COLUMN public.documents.processing_status IS 'pending | processing | analyzed | actioned | failed';