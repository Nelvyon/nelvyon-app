export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest } from "next/server";

import { GET as surveysGet, POST as surveysPost, DELETE as surveysDelete } from "../surveys/route";

function withQrQuery(req: NextRequest) {
  const url = new URL(req.url);
  if (!url.searchParams.has("type")) {
    url.searchParams.set("type", "qr");
  }
  return new NextRequest(url, req);
}

export async function GET(req: NextRequest) {
  return surveysGet(withQrQuery(req));
}

export async function POST(req: NextRequest) {
  return surveysPost(req);
}

export async function DELETE(req: NextRequest) {
  return surveysDelete(withQrQuery(req));
}
