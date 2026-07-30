import "dotenv/config";
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getUser } from "@/lib/apiHelpers";
import { prisma } from "@/lib/prisma";

const CLOUDINARY_URL = process.env.CLOUDINARY_URL || "cloudinary://429828736883821:PH8Yr3YKv41uPkP3Rg6b-h3ylGQ@dy1txmkod";

cloudinary.config({ cloudinary_url: CLOUDINARY_URL, secure: true });

async function uploadToMeta(buffer: ArrayBuffer, contentType: string, accessToken: string): Promise<string | null> {
  try {
    const sessionRes = await fetch(`https://graph.facebook.com/v21.0/app/uploads`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ file_length: buffer.byteLength, file_type: contentType, access_token: accessToken }),
    });
    const sessionData = await sessionRes.json();
    if (!sessionRes.ok || !sessionData.id) return null;

    const uploadRes = await fetch(`https://graph.facebook.com/v21.0/${sessionData.id}`, {
      method: "POST",
      headers: { Authorization: `OAuth ${accessToken}`, file_offset: "0", "Content-Type": contentType },
      body: buffer,
    });
    const uploadData = await uploadRes.json();
    return uploadData.h ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "File required" }, { status: 400 });

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const contentType = file.type || "image/jpeg";

    // 1. Upload to Cloudinary
    const cloudResult = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "wexa-ai/templates", resource_type: contentType.startsWith("video") ? "video" : contentType === "application/pdf" ? "raw" : "image" },
        (error, result) => {
          if (error || !result) { reject(error ?? new Error("Cloudinary upload failed")); return; }
          resolve({ secure_url: result.secure_url, public_id: result.public_id });
        }
      );
      stream.end(buffer);
    });

    // 2. Get workspace's WA access token for Meta handle upload
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: user.id },
      select: { workspaceId: true },
    });

    let metaHandle: string | null = null;
    if (membership) {
      const wa = await prisma.whatsAppAccount.findUnique({
        where: { workspaceId: membership.workspaceId },
        select: { accessToken: true, status: true },
      });
      if (wa?.status === "active") {
        metaHandle = await uploadToMeta(bytes, contentType, wa.accessToken);
      }

      // 3. Save to MediaAsset DB
      await prisma.mediaAsset.create({
        data: {
          workspaceId: membership.workspaceId,
          url: cloudResult.secure_url,
          publicId: cloudResult.public_id,
          metaHandle: metaHandle,
          name: file.name || "",
          fileType: contentType.split("/")[0] ?? "image",
          fileSize: bytes.byteLength,
        },
      }).catch((e) => console.error("[Upload] DB save failed", e));
    }

    return NextResponse.json({
      url: cloudResult.secure_url,
      publicId: cloudResult.public_id,
      metaHandle,
    });
  } catch (error: any) {
    console.error("[Upload] Error", error);
    return NextResponse.json({ error: error?.message || "Failed to upload" }, { status: 500 });
  }
}
