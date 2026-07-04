import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if credentials are valid Supabase URLs (and not placeholders)
const isValidUrl = (url?: string) => {
  if (!url) return false;
  try {
    new URL(url);
    return !url.includes('placeholder') && !url.includes('YOUR_');
  } catch {
    return false;
  }
};

const hasCredentials = isValidUrl(supabaseUrl) && !!supabaseAnonKey && supabaseAnonKey !== 'placeholder' && !supabaseAnonKey.includes('YOUR_');

export const isMock = !hasCredentials;

if (isMock) {
  console.warn(
    '⚠️ لم يتم العثور على مفاتيح Supabase الصالحة في ملف البيئة .env. سيتم تشغيل التطبيق في وضع المحاكاة المحلية (Mock Mode) باستخدام LocalStorage.'
  );
}

// Initialize the client (even if dummy, to prevent imports from breaking)
export const supabase = createClient(
  hasCredentials ? supabaseUrl : 'https://placeholder-project.supabase.co',
  hasCredentials ? supabaseAnonKey : 'placeholder-anon-key'
);
