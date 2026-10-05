// ─── Email ──────────────────────────────────────────────────────────────
// Thin wrapper around Resend. If RESEND_API_KEY isn't configured (e.g.
// local development), calls no-op with a console warning instead of
// throwing — consistent with how GROQ_API_KEY is handled elsewhere.

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Zyphorix Guard <noreply@zyphorix.com>';

  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY not configured — skipping email to ${to}: "${subject}"`);
    return { sent: false };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`[email] Resend API error (${res.status}): ${body}`);
    return { sent: false };
  }

  return { sent: true };
}

export function verificationEmailHtml(verifyUrl: string): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #0d1220;">Verify your email</h2>
      <p style="color: #475569;">Confirm your email address to finish setting up your Zyphorix Guard account.</p>
      <a href="${verifyUrl}" style="display:inline-block; margin: 16px 0; padding: 12px 24px; background: linear-gradient(135deg,#1d4ed8,#7c3aed); color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600;">Verify email</a>
      <p style="color: #94a3b8; font-size: 13px;">This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>
    </div>
  `;
}

export function resetPasswordEmailHtml(resetUrl: string): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #0d1220;">Reset your password</h2>
      <p style="color: #475569;">We received a request to reset your Zyphorix Guard password. If this wasn't you, you can safely ignore this email — your password won't change.</p>
      <a href="${resetUrl}" style="display:inline-block; margin: 16px 0; padding: 12px 24px; background: linear-gradient(135deg,#1d4ed8,#7c3aed); color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600;">Reset password</a>
      <p style="color: #94a3b8; font-size: 13px;">This link expires in 1 hour and can only be used once. Resetting your password will sign you out on all other devices.</p>
    </div>
  `;
}
