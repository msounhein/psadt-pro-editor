import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// Define the package with relations type
type PackageWithRelations = {
  id: string;
  name: string;
  version?: string | null;
  templateId?: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  packageData?: string | null;
  status: string;
  filePath?: string | null;
  template?: {
    id: string;
    name: string;
    packageType: string;
  } | null;
  statistics?: {
    id: string;
    packageId: string;
    totalDownloads: number;
    successfulDeploys: number;
    failedDeploys: number;
    lastDeployed?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    deploymentData?: string | null;
  } | null;
};

// GET - Retrieve all packages for the user
export async function GET(request: NextRequest) {
  try {
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
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const templateId = searchParams.get('templateId');
    
    // Build the where clause
    const where: any = { userId };
    
    if (status) {
      where.status = status;
    }
    
    if (templateId) {
      where.templateId = templateId;
    }
    
    // Get packages from database
    const packages = await prisma.package.findMany({
      where,
      include: {
        template: {
          select: {
            id: true,
            name: true,
            packageType: true,
          },
        },
        statistics: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    // Process packages to parse JSON strings for response
    const processedPackages = packages.map((pkg: PackageWithRelations) => ({
      ...pkg,
      packageData: pkg.packageData ? JSON.parse(pkg.packageData) : null,
      statistics: pkg.statistics 
        ? {
            ...pkg.statistics,
            deploymentData: pkg.statistics.deploymentData 
              ? JSON.parse(pkg.statistics.deploymentData)
              : null
          }
        : null
    }));
    
    return NextResponse.json({ packages: processedPackages });
    
  } catch (error) {
    console.error("Error fetching packages:", error);
    return NextResponse.json(
      { error: "Failed to fetch packages" },
      { status: 500 }
    );
  }
}

// POST - Create a new package
export async function POST(request: NextRequest) {
  try {
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
    
    const { name, version, templateId, packageData, status = "draft" } = await request.json();
    
    // Basic validation
    if (!name) {
      return NextResponse.json(
        { error: "Package name is required" },
        { status: 400 }
      );
    }
    
    // Check if the template exists and belongs to the user
    if (templateId) {
      const template = await prisma.template.findUnique({
        where: { id: templateId },
      });
      
      if (!template) {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 }
        );
      }
      
      // Check template ownership or public status
      if (!template.isPublic && template.userId !== userId) {
        return NextResponse.json(
          { error: "You do not have permission to use this template" },
          { status: 403 }
        );
      }
    }
    
    // Convert packageData to a JSON string for SQLite storage
    const packageDataString = packageData ? 
      (typeof packageData === 'string' ? packageData : JSON.stringify(packageData)) : 
      null;
    
    // Create the package
    const package_ = await prisma.package.create({
      data: {
        name,
        version,
        templateId,
        packageData: packageDataString,
        status,
        userId: userId,
        statistics: {
          create: {
            totalDownloads: 0,
            successfulDeploys: 0,
            failedDeploys: 0,
          },
        },
      },
      include: {
        template: true,
        statistics: true,
      },
    });
    
    // Process the response to include parsed JSON
    const response = {
      ...package_,
      packageData: packageData,
    };
    
    return NextResponse.json(
      { message: "Package created successfully", package: response },
      { status: 201 }
    );
    
  } catch (error) {
    console.error("Error creating package:", error);
    return NextResponse.json(
      { error: "Failed to create package" },
      { status: 500 }
    );
  }
} 