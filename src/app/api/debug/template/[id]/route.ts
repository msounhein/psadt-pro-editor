import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Debug API route that doesn't require authentication
// Only available in development mode
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Only allow this in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: "Debug endpoints are only available in development mode" },
      { status: 403 }
    );
  }

  try {
    // Await the params to get the ID in Next.js 15
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    console.log(`[DEBUG] Checking template with ID: ${id}`);
    
    // Check if the template exists at all
    const template = await prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      console.log(`[DEBUG] Template with ID ${id} not found in database`);
      return NextResponse.json(
        { 
          error: "Template not found in database",
          message: "The template ID does not exist in the database"
        },
        { status: 404 }
      );
    }

    // If the template exists, return detailed debug info
    return NextResponse.json({
      debug: true,
      templateExists: true,
      template: {
        id: template.id,
        name: template.name,
        type: template.type,
        isDefault: template.isDefault,
        userId: template.userId,
        createdAt: template.createdAt,
        storagePath: template.storagePath,
        extractionPath: template.extractionPath,
        extractionStatus: template.extractionStatus
      },
      message: "This is a debug endpoint that provides information about template existence"
    });
  } catch (error) {
    console.error("[DEBUG] Error in debug template endpoint:", error);
    return NextResponse.json(
      { 
        error: "Error checking template",
        message: error instanceof Error ? error.message : "Unknown error", 
      },
      { status: 500 }
    );
  }
}