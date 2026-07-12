import { createClient } from '@supabase/supabase-js';

// Initialize a separate client just for logging to avoid circular dependencies.
// We need service role to write to system_logs safely.
const supabaseAdmin = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

export const logger = {
  info: (data: Record<string, unknown> | string) => {
    log('INFO', data);
  },
  warn: (data: Record<string, unknown> | string) => {
    log('WARN', data);
  },
  error: (data: Record<string, unknown> | string) => {
    log('ERROR', data);
  }
};

function log(level: 'INFO' | 'WARN' | 'ERROR', data: Record<string, unknown> | string) {
  const timestamp = new Date().toISOString();
  let details: Record<string, unknown> = {};
  let eventType = 'system_log';

  if (typeof data === 'string') {
    details = { message: data };
  } else {
    details = { ...data };
    
    // Extract event_type if provided, else use default
    if (typeof details.event_type === 'string') {
      eventType = details.event_type;
      delete details.event_type;
    } else if (typeof details.route === 'string') {
      eventType = 'api_request';
    }

    if (details.error instanceof Error) {
      details.error = {
        message: details.error.message,
        stack: process.env.NODE_ENV === 'development' ? details.error.stack : undefined
      };
    }
  }

  // 1. Console log (Standard output for Vercel)
  console.log(JSON.stringify({ timestamp, level, event_type: eventType, ...details }));

  // 2. Database Log (Fire and forget)
  if (supabaseAdmin) {
    supabaseAdmin.from('system_logs').insert([{
      event_type: eventType,
      details: { level, ...details }
    }]).then(({ error }) => {
      if (error) {
        // Fallback console log to avoid infinite logging loops
        console.error('Failed to write to system_logs:', error.message);
      }
    });
  }
}

export function handleApiError(route: string, error: unknown) {
  const isDev = process.env.NODE_ENV === 'development';
  let message = 'Internal Server Error';
  let stack: string | undefined;

  if (error instanceof Error) {
    message = error.message;
    stack = isDev ? error.stack : undefined;
  } else if (typeof error === 'string') {
    message = error;
  }

  logger.error({ event_type: 'api_error', route, error: message, stack });

  return {
    error: isDev ? `${message} ${stack ? '\n' + stack : ''}` : message
  };
}
