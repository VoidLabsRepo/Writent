import { NextRequest, NextResponse } from "next/server";

const BACKEND = "http://localhost:4006";

export async function GET() {
  const res = await fetch(`${BACKEND}/api/articles`);
  const data = await res.json();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${BACKEND}/api/articles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data);
}
