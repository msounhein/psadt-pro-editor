import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { storeFile } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const prefix = formData.get("prefix") as string || "package";
    
    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }
    
    // Get file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Store the file
    const fileName = await storeFile(
      buffer,
      file.name,
      { userId, prefix }
    );
    
    return NextResponse.json(
      { 
        message: "File uploaded successfully",
        fileName,
        originalName: file.name,
        size: file.size,
        type: file.type,
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
} 