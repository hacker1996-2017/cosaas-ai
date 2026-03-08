 import { useState, useEffect } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/contexts/AuthContext';
 
 interface UserProfile {
   id: string;
   email: string;
   full_name: string | null;
   organization_id: string | null;
   avatar_url: string | null;
   phone: string | null;
   timezone: string | null;
 }
 
 export function useUserProfile() {
   const { user } = useAuth();
   const [profile, setProfile] = useState<UserProfile | null>(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<Error | null>(null);
 
   useEffect(() => {
     if (!user) {
       setProfile(null);
       setLoading(false);
       return;
     }
 
     const fetchProfile = async () => {
       try {
         const { data, error } = await supabase
           .from('profiles')
           .select('id, email, full_name, organization_id, avatar_url, phone, timezone')
           .eq('id', user.id)
           .single();
 
         if (error) throw error;
         setProfile(data);
       } catch (err) {
         setError(err as Error);
       } finally {
         setLoading(false);
       }
     };
 
     fetchProfile();
   }, [user]);
 
   const hasOrganization = !!profile?.organization_id;
 
   return { profile, loading, error, hasOrganization };
 }