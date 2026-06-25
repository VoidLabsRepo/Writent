import { NextResponse } from "next/server";

const BACKEND = "http://localhost:4006";

export async function GET() {
  const res = await fetch(`${BACKEND}/api/health`);
  const data = await res.json();
  return NextResponse.json(data);
}
