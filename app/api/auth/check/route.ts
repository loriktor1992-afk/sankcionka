import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin-session');

  return NextResponse.json({
    isAuthenticated: session?.value === 'authenticated'
  });
}
