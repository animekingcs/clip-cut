// app/api/download/route.js
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get("file");

    if (!fileName) {
      return NextResponse.json(
        { error: "File parameter is required." },
        { status: 400 }
      );
    }

    // Sanitize filename to prevent directory traversal attacks
    const sanitizedFileName = path.basename(fileName);
    const filePath = path.join(process.cwd(), "tmp", sanitizedFileName);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Requested file was not found or has expired." },
        { status: 404 }
      );
    }

    const fileStream = fs.createReadStream(filePath);

    return new NextResponse(fileStream, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${sanitizedFileName}"`,
      },
    });
  } catch (err) {
    console.error("[DOWNLOAD ERROR]:", err);
    return NextResponse.json(
      { error: "Failed to process download." },
      { status: 500 }
    );
  }
}