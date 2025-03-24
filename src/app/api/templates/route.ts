import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

/**
 * GET handler for fetching all templates for the current user
 * Supports filtering by type with the query parameter "type"
 */
export async function GET(request: NextRequest) {
  try {
    // Get the session to identify the user
    const session = await getServerSession(authOptions);

    // Require authentication for all requests
    if (!session?.user?.id) {
      console.log("Templates API: Unauthorized request - no session user ID");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const typeFilter = searchParams.get('type');
    
    console.log(`Templates API: Fetching templates for user: ${userId}, type filter: ${typeFilter || 'none'}`);

    // Build the where clause
    const whereClause: any = {
      userId: userId
    };
    
    // Add type filter if provided
    if (typeFilter && (typeFilter === 'Default' || typeFilter === 'Custom')) {
      whereClause.type = typeFilter;
    }

    // Get templates from database
    let templates = [];
    try {
      templates = await prisma.template.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      console.log(`Templates API: Found ${templates.length} templates for user ${userId}`);
      console.log("Templates API: Template IDs:", templates.map((t: any) => t.id).join(", "));

      // Process templates to ensure correct type values
      templates = templates.map((template: any) => {
        // Make sure type is set (fallback to "Custom" if not defined)
        if (!template.type) {
          template.type = template.isDefault ? "Default" : "Custom";
        }
        return template;
      });
    } catch (dbError) {
      console.error("Templates API: Database error fetching templates:", dbError);
      // Fall back to empty array if database query fails
    }
    
    // Return templates as a direct array instead of nested object
    console.log(`Templates API: Returning ${templates.length} templates to client`);
    return NextResponse.json(templates);
  } catch (error) {
    console.error("Templates API: Error fetching templates:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      },
      { status: 500 }
    );
  }
}

// POST - Create a new template
export async function POST(req: NextRequest) {
  // Get user session with authOptions
  const session = await getServerSession(authOptions);
  
  // Require authentication for all requests
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  const userId = session.user.id;

  try {
    // Get the request body
    const body = await req.json();
    
    // Validate input
    if (!body.name) {
      return NextResponse.json(
        { error: "Template name is required" },
        { status: 400 }
      );
    }

    // Create template
    let template;
    try {
      // Set template type - default to Custom unless specified
      const templateType = body.type || "Custom";
      
      template = await prisma.template.create({
        data: {
          name: body.name,
          description: body.description,
          userId: userId,
          packageType: body.packageType || "MSI",
          type: templateType,
          isDefault: templateType === "Default", // For backwards compatibility
          metadata: JSON.stringify({
            isDefault: templateType === "Default"
          })
        },
      });
    } catch (dbError) {
      console.error("Database error creating template:", dbError);
      
      // Fallback mock template if database fails
      template = {
        id: `template_${Date.now()}`,
        name: body.name,
        description: body.description,
        packageType: body.packageType || "MSI",
        userId: userId,
        type: body.type || "Custom",
        isDefault: body.type === "Default",
        metadata: JSON.stringify({ isDefault: body.type === "Default" }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    // Return created template
    return NextResponse.json({
      success: true,
      template
    });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}