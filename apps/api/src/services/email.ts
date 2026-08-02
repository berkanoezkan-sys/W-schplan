type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const smtpUrl = process.env.SMTP_URL;

  if (smtpUrl) {
    const response = await fetch(smtpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error('EMAIL_SEND_FAILED');
    }
    return;
  }

  console.info('[email:dev]', {
    to: input.to,
    subject: input.subject,
    text: input.text,
  });
}

export function buildVerificationEmail(input: {
  firstName: string;
  verifyUrl: string;
}): Pick<SendEmailInput, 'subject' | 'text' | 'html'> {
  const subject = 'Verify your Wöschplan administrator account';
  const text = [
    `Hello ${input.firstName},`,
    '',
    'Please verify your email address to activate your Wöschplan administrator account:',
    input.verifyUrl,
    '',
    'This link expires in 24 hours.',
  ].join('\n');

  return {
    subject,
    text,
    html: `<p>Hello ${input.firstName},</p><p>Please verify your email address:</p><p><a href="${input.verifyUrl}">${input.verifyUrl}</a></p><p>This link expires in 24 hours.</p>`,
  };
}
