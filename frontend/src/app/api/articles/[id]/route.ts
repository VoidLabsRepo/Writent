import { NextRequest, NextResponse } from "next/server";

const BACKEND = "http://localhost:4006";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await fetch(`${BACKEND}/api/articles/${id}`);
  const data = await res.json();
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await fetch(`${BACKEND}/api/articles/${id}`, { method: "DELETE" });
  const data = await res.json();
  return NextResponse.json(data);
}
