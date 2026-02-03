/**
 * Server-only Semaphore API client. Use from API routes only.
 * Uses SEMAPHORE_API_KEY (not exposed to the browser).
 */

const SEMAPHORE_BASE = 'https://api.semaphore.co/api/v4';
const DEFAULT_SENDER = 'ARKWARE';

function formatPhoneNumber(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.startsWith('63')) return cleaned.substring(2);
  if (cleaned.startsWith('09')) return cleaned;
  if (cleaned.startsWith('9') && cleaned.length === 10) return `0${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith('0')) return cleaned;
  return `0${cleaned}`;
}

export interface SemaphoreSendResult {
  success: boolean;
  messageId?: string;
  status?: string;
  recipient?: string;
  error?: string;
  errorCode?: string | number;
}

export async function sendSmsServer(
  phoneNumber: string,
  message: string,
  senderName: string = DEFAULT_SENDER
): Promise<SemaphoreSendResult> {
  const apiKey = process.env.SEMAPHORE_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'SEMAPHORE_API_KEY is not configured' };
  }

  const formatted = formatPhoneNumber(phoneNumber);
  const formData = new URLSearchParams();
  formData.append('apikey', apiKey);
  formData.append('number', formatted);
  formData.append('message', message);
  formData.append('sendername', senderName);

  const response = await fetch(`${SEMAPHORE_BASE}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });

  const result = (await response.json()) as
    | { message_id?: string; status?: string; recipient?: string }[]
    | { message?: string; error?: string; code?: string | number };

  if (response.ok && Array.isArray(result) && result.length > 0 && result[0].message_id) {
    const d = result[0];
    return {
      success: true,
      messageId: d.message_id,
      status: d.status,
      recipient: d.recipient,
    };
  }

  const err = Array.isArray(result) ? { error: 'Unknown error', code: 0 } : result;
  return {
    success: false,
    error: (err as { message?: string; error?: string }).message ?? (err as { message?: string; error?: string }).error ?? 'Unknown error',
    errorCode: (err as { code?: string | number }).code,
  };
}
