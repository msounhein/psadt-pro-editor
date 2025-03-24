import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";
import { authOptions } from "@/lib/auth";

// GET - Retrieve a specific package
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
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
    
    const package_ = await prisma.package.findUnique({
      where: { id },
      include: {
        template: true,
        statistics: true,
      },
    });
    
    if (!package_) {
      return NextResponse.json(
        { error: "Package not found" },
        { status: 404 }
      );
    }
    
    // Check if user has access to this package
    if (package_.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized access to package" },
        { status: 403 }
      );
    }
    
    return NextResponse.json({ package: package_ });
    
  } catch (error) {
    console.error("Error fetching package:", error);
    return NextResponse.json(
      { error: "Failed to fetch package" },
      { status: 500 }
    );
  }
}

// PUT - Update a package
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
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
    
    // Find package first to check ownership
    const existingPackage = await prisma.package.findUnique({
      where: { id },
    });
    
    if (!existingPackage) {
      return NextResponse.json(
        { error: "Package not found" },
        { status: 404 }
      );
    }
    
    // Check if user owns this package
    if (existingPackage.userId !== userId) {
      return NextResponse.json(
        { error: "You do not have permission to update this package" },
        { status: 403 }
      );
    }
    
    const { name, version, packageData, status, filePath } = await request.json();
    
    // Convert packageData to a JSON string for SQLite storage if it's not already a string
    const packageDataString = packageData ? 
      (typeof packageData === 'string' ? packageData : JSON.stringify(packageData)) : 
      null;
    
    // Update package
    const updatedPackage = await prisma.package.update({
      where: { id },
      data: {
        name,
        version,
        packageData: packageDataString,
        status,
        filePath,
      },
      include: {
        template: true,
        statistics: true,
      },
    });
    
    // Process the response to include parsed JSON
    const response = {
      ...updatedPackage,
      packageData: packageData,
    };
    
    return NextResponse.json({ 
      message: "Package updated successfully", 
      package: response 
    });
    
  } catch (error) {
    console.error("Error updating package:", error);
    return NextResponse.json(
      { error: "Failed to update package" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a package
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
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
    
    // Find package first to check ownership
    const existingPackage = await prisma.package.findUnique({
      where: { id },
    });
    
    if (!existingPackage) {
      return NextResponse.json(
        { error: "Package not found" },
        { status: 404 }
      );
    }
    
    // Check if user owns this package
    if (existingPackage.userId !== userId) {
      return NextResponse.json(
        { error: "You do not have permission to delete this package" },
        { status: 403 }
      );
    }
    
    // Delete the package file if it exists
    if (existingPackage.filePath) {
      await deleteFile(existingPackage.filePath);
    }
    
    // Delete package - Prisma cascade will handle deleting related statistics
    await prisma.package.delete({
      where: { id },
    });
    
    return NextResponse.json({ 
      message: "Package deleted successfully"
    });
    
  } catch (error) {
    console.error("Error deleting package:", error);
    return NextResponse.json(
      { error: "Failed to delete package" },
      { status: 500 }
    );
  }
} 