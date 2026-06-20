import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const dirPath = path.join(process.cwd(), "public", "photos", "engagement");
    if (!fs.existsSync(dirPath)) {
      return NextResponse.json({ success: true, photos: [] });
    }

    const files = fs.readdirSync(dirPath)
      .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
        const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
        return numA - numB;
      });

    const photos = files.map(f => `/photos/engagement/${encodeURIComponent(f)}`);
    return NextResponse.json({ success: true, photos });
  } catch (error: any) {
    console.error("Failed to read gallery photos:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
