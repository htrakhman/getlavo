// Shared branded email shell. All transactional Lavo emails should pass
// their content through wrapEmail() so we have one place to update branding,
// the footer, and unsubscribe links.

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://getlavo.io';
const SUPPORT_EMAIL = process.env.ADMIN_EMAIL || 'hello@getlavo.io';

export function wrapEmail({ preheader, content }: { preheader?: string; content: string }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Lavo</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;color:#e5e5e5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  ${preheader ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escape(preheader)}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#121212;border-radius:18px;overflow:hidden;">
        <tr><td style="padding:32px 32px 0 32px;">
          <div style="font-family:Georgia,serif;font-size:22px;font-weight:600;letter-spacing:-0.02em;color:#e5e5e5;">
            <span style="color:#00e5c8;">●</span> Lavo
          </div>
        </td></tr>
        <tr><td style="padding:24px 32px 32px 32px;color:#e5e5e5;font-size:15px;line-height:1.6;">
          ${content}
        </td></tr>
        <tr><td style="padding:0 32px 32px 32px;border-top:1px solid #222;">
          <p style="margin:24px 0 0 0;color:#666;font-size:12px;line-height:1.5;">
            Questions? <a href="mailto:${SUPPORT_EMAIL}" style="color:#00e5c8;text-decoration:none;">${SUPPORT_EMAIL}</a><br>
            <a href="${APP_URL}" style="color:#666;text-decoration:none;">${APP_URL.replace(/^https?:\/\//, '')}</a>
            &nbsp;·&nbsp;
            <a href="${APP_URL}/account/notifications" style="color:#666;text-decoration:none;">Manage notifications</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function button(href: string, label: string) {
  return `<p style="margin:24px 0;"><a href="${href}" style="display:inline-block;padding:14px 24px;background:#00e5c8;color:#000;font-weight:600;text-decoration:none;border-radius:9999px;font-size:15px;">${escape(label)}</a></p>`;
}

export function paragraph(text: string) {
  return `<p style="margin:0 0 16px 0;">${escape(text)}</p>`;
}

export function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
