import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// GET - Retrieve package statistics
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
        { error: "Unauthorized access to package statistics" },
        { status: 403 }
      );
    }
    
    return NextResponse.json({ statistics: package_.statistics });
    
  } catch (error) {
    console.error("Error fetching package statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch package statistics" },
      { status: 500 }
    );
  }
}

// POST - Record a package download or deployment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Get user session with authOptions - for statistics we might allow anonymous updates if needed
    const session = await getServerSession(authOptions);
    
    // Optional: Require authentication for statistics updates
    // You can uncomment this if you want to restrict statistics updates to authenticated users only
    // if (!session?.user?.id) {
    //   return NextResponse.json(
    //     { error: "Unauthorized" },
    //     { status: 401 }
    //   );
    // }
    
    const { type, status, deploymentData } = await request.json();
    
    // Basic validation
    if (!type || !['download', 'deployment'].includes(type)) {
      return NextResponse.json(
        { error: "Invalid statistics update type" },
        { status: 400 }
      );
    }
    
    // Find the package
    const package_ = await prisma.package.findUnique({
      where: { id },
      include: {
        statistics: true,
      },
    });
    
    if (!package_) {
      return NextResponse.json(
        { error: "Package not found" },
        { status: 404 }
      );
    }
    
    // Prepare update data
    const updateData: any = {};
    
    // Update statistics based on the type
    if (type === 'download') {
      updateData.totalDownloads = (package_.statistics?.totalDownloads || 0) + 1;
    } else if (type === 'deployment') {
      if (status === 'success') {
        updateData.successfulDeploys = (package_.statistics?.successfulDeploys || 0) + 1;
      } else {
        updateData.failedDeploys = (package_.statistics?.failedDeploys || 0) + 1;
      }
      
      updateData.lastDeployed = new Date();
      
      if (deploymentData) {
        updateData.deploymentData = typeof deploymentData === 'string' 
          ? deploymentData 
          : JSON.stringify(deploymentData);
      }
    }
    
    // Update or create statistics
    const statistics = await prisma.packageStatistics.upsert({
      where: {
        packageId: id,
      },
      update: updateData,
      create: {
        packageId: id,
        ...updateData,
        totalDownloads: updateData.totalDownloads || 0,
        successfulDeploys: updateData.successfulDeploys || 0,
        failedDeploys: updateData.failedDeploys || 0,
      },
    });
    
    return NextResponse.json({ 
      message: "Package statistics updated successfully",
      statistics 
    });
    
  } catch (error) {
    console.error("Error updating package statistics:", error);
    return NextResponse.json(
      { error: "Failed to update package statistics" },
      { status: 500 }
    );
  }
} 