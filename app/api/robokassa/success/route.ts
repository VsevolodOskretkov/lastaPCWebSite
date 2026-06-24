import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const invId = searchParams.get('InvId');
  
  // Редиректим на страницу успеха
  return NextResponse.redirect(
    new URL(`/donate/success?order=${invId}`, process.env.NEXT_PUBLIC_BASE_URL)
  );
}