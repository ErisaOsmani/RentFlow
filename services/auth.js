import { supabase } from './supabase';

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  return { error };
}
