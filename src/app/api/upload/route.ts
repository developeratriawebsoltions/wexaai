import "dotenv/config";
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getUser } from "@/lib/apiHelpers";

const CLOUDINARY_URL = process.env.CLOUDINARY_URL || "cloudinary://429828736883821:PH8Yr3YKv41uPkP3Rg6b-h3ylGQ@dy1txmkod";

cloudinary.config({
  cloudinary_url: CLOUDINARY_URL,
  secure: true,
});

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "File required" }, { status: 400 });

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "wexa-ai/templates",
          resource_type: "image",
        },
        (error, uploadResult) => {
          if (error || !uploadResult) {
            reject(error ?? new Error("Cloudinary upload failed"));
            return;
          }
          resolve({ secure_url: uploadResult.secure_url, public_id: uploadResult.public_id });
        }
      );

      stream.end(buffer);
    });

    return NextResponse.json({ url: result.secure_url, publicId: result.public_id });
  } catch (error: any) {
    console.error("[Cloudinary Upload] Error", error);
    return NextResponse.json({ error: error?.message || "Failed to upload image" }, { status: 500 });
  }
}
