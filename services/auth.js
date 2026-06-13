import { supabase } from './supabase';

// Funksion i perbashket per logout qe perdoret ne disa screen.
export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  return { error };
}
