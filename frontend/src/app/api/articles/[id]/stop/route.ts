import { NextRequest, NextResponse } from "next/server";

const BACKEND = "http://localhost:4006";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await fetch(`${BACKEND}/api/articles/${id}/stop`, {
    method: "POST",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
