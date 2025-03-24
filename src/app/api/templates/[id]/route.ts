import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// GET - Retrieve a specific template by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Get user session
  const session = await getServerSession(authOptions);
  
  // Check if user is authenticated
  if (!session || !session.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Await the params to get the ID in Next.js 15
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    // Get the template
    const template = await prisma.template.findUnique({
      where: {
        id: id,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Get the user for authorization check
    let user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
    });

    // In development mode, if user is not found, use the session user information
    if (!user && process.env.NODE_ENV === 'development') {
      console.log(`[DEV MODE] User not found in database, using session user info: ${session.user.id}`);
      user = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name || 'Development User',
        password: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } else if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if the user has permission to view this template
    // Skip this check in development mode for easier debugging
    if (process.env.NODE_ENV !== 'development' && template.userId !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to view this template" },
        { status: 403 }
      );
    }

    // Return the template
    return NextResponse.json(template);
  } catch (error) {
    console.error("Error fetching template:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

// PUT - Update a template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Await the params to get the ID in Next.js 15
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Find template first to check ownership
    const existingTemplate = await prisma.template.findUnique({
      where: { id },
    });
    
    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }
    
    // Check if user owns this template
    // Skip this check in development mode for easier debugging
    if (process.env.NODE_ENV !== 'development' && existingTemplate.userId !== session.user.id) {
      return NextResponse.json(
        { error: "You do not have permission to update this template" },
        { status: 403 }
      );
    }
    
    // Check if this is a Default template
    if (existingTemplate.type === "Default") {
      return NextResponse.json(
        { error: "Default templates cannot be modified. Please clone the template first." },
        { status: 400 }
      );
    }
    
    const { name, description, packageType, isPublic } = await request.json();
    
    // Update template
    const updatedTemplate = await prisma.template.update({
      where: { id },
      data: {
        name,
        description,
        packageType,
        isPublic,
      },
    });
    
    return NextResponse.json({ 
      message: "Template updated successfully", 
      template: updatedTemplate 
    });
    
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific template by ID
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Get user session
  const session = await getServerSession(authOptions);
  
  // Check if user is authenticated
  if (!session || !session.user?.email) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Await the params to get the ID in Next.js 15
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    // Get the template
    const template = await prisma.template.findUnique({
      where: {
        id: id,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Get the user for authorization check
    let user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
    });

    // In development mode, if user is not found, use the session user information
    if (!user && process.env.NODE_ENV === 'development') {
      console.log(`[DEV MODE] User not found in database, using session user info: ${session.user.id}`);
      user = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name || 'Development User',
        password: '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } else if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if the user has permission to delete this template
    // Skip this check in development mode for easier debugging
    if (process.env.NODE_ENV !== 'development' && template.userId !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to delete this template" },
        { status: 403 }
      );
    }

    // Delete the template
    await prisma.template.delete({
      where: {
        id: id,
      },
    });

    // Return success
    return NextResponse.json(
      { message: "Template deleted successfully" }
    );
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}