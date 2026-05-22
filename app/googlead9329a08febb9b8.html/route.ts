import { NextResponse } from 'next/server';

const BODY = 'google-site-verification: googlead9329a08febb9b8.html';

/** Google Search Console HTML file verification (www.getlavo.io). */
export function GET() {
  return new NextResponse(BODY, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
