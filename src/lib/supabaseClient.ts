import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Export a placeholder if keys are missing to prevent 'supabaseUrl is required' crash at module evaluation
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({} as any, {
      get: (target, prop) => {
        const noop = () => ({ 
            on: noop, 
            subscribe: noop, 
            channel: noop, 
            from: noop, 
            select: noop, 
            eq: noop, 
            order: noop, 
            limit: noop,
            single: noop,
            removeChannel: noop,
            upsert: noop
        });
        if (prop === 'channel' || prop === 'from' || prop === 'auth') return noop;
        return noop;
      }
    });
