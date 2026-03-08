import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface VoiceServiceResult {
  token?: string;
  audio_base64?: string;
  voices?: Array<{ id: string; name: string; accent?: string; gender?: string }>;
  callId?: string;
  success?: boolean;
}

export function useVoiceService() {
  const getToken = useMutation({
    mutationFn: async (agentId: string) => {
      const { data, error } = await supabase.functions.invoke('voice-service', {
        body: { action: 'get_token', agentId },
      });
      if (error) throw new Error(error.message || 'Failed to get voice token');
      return data as VoiceServiceResult;
    },
  });

  const textToSpeech = useMutation({
    mutationFn: async ({ text, voiceId }: { text: string; voiceId?: string }) => {
      const { data, error } = await supabase.functions.invoke('voice-service', {
        body: { action: 'tts', text, voiceId },
      });
      if (error) throw new Error(error.message || 'TTS failed');
      return data as VoiceServiceResult;
    },
  });

  const listVoices = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('voice-service', {
        body: { action: 'list_voices' },
      });
      if (error) throw new Error(error.message || 'Failed to list voices');
      return data as VoiceServiceResult;
    },
  });

  const logCall = useMutation({
    mutationFn: async (params: {
      calleeNumber: string;
      clientId?: string;
      agentId?: string;
      transcript?: string;
      summary?: string;
      durationSeconds?: number;
      sentimentScore?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke('voice-service', {
        body: { action: 'log_call', ...params },
      });
      if (error) throw new Error(error.message || 'Failed to log call');
      return data as VoiceServiceResult;
    },
  });

  return {
    getToken: getToken.mutateAsync,
    isGettingToken: getToken.isPending,
    textToSpeech: textToSpeech.mutateAsync,
    isSpeaking: textToSpeech.isPending,
    listVoices: listVoices.mutateAsync,
    isListingVoices: listVoices.isPending,
    logCall: logCall.mutateAsync,
    isLogging: logCall.isPending,
  };
}
