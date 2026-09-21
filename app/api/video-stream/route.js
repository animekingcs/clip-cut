// app/api/video-stream/route.js
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const fileName = searchParams.get("file");

  if (!fileName) {
    return NextResponse.json({ error: "Missing file parameter" }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), "tmp", fileName);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const fileStream = fs.createReadStream(filePath);
  const stat = fs.statSync(filePath);

  return new NextResponse(fileStream, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": stat.size.toString(),
    },
  });
}