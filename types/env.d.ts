// types/env.d.ts
namespace NodeJS {
  interface ProcessEnv {
    ROBOKASSA_LOGIN: string;
    ROBOKASSA_PASS1: string;
    ROBOKASSA_PASS2: string;
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    NEXT_PUBLIC_BASE_URL: string;
  }
}