// src/app/api/psadt-qdrant/test/route.js
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'API is working!' });
}

export async function POST(request) {
  try {
    const data = await request.json();
    return NextResponse.json({ 
      message: 'POST request received successfully',
      receivedData: data
    });
  } catch (error) {
    return NextResponse.json({ 
      error: `Error processing request: ${error.message}` 
    }, { status: 500 });
  }
}
