import { env } from '../config/env.js';

interface EmailSender {
  email: string;
  name?: string;
}

function parseSender(value: string): EmailSender {
  const match = value.match(/^\s*(?:"?([^"<]*?)"?\s*)?<([^>]+)>\s*$/);
  const email = match?.[2]?.trim();

  if (match && email) {
    const name = match[1]?.trim();
    return name ? { email, name } : { email };
  }

  return { email: value.trim() };
}

export function isEmailEnabled(): boolean {
  return env.BREVO_API_KEY.length > 0 && env.EMAIL_FROM.length > 0;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!isEmailEnabled()) {
    return false;
  }

  try {
    const response = await fetch(`${env.BREVO_BASE_URL.replace(/\/+$/, '')}/v3/smtp/email`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'api-key': env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: parseSender(env.EMAIL_FROM),
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error(`[mailer] Brevo responded ${response.status}: ${detail.slice(0, 300)}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      '[mailer] Failed to send email:',
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}
