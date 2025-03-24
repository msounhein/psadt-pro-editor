"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { ArrowLeft, Package2, Settings, Download, Trash2, Code, Pencil, Copy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import React, { use } from "react";

// VSCode color palette - matching the documentation page
const vscodePalette = {
  background: '#0e1116',            // Darker background
  sidebarBackground: '#0e1116',     // Match main background
  foreground: '#e6edf3',            // Slightly brighter text
  border: '#30363d',                // Border color
  primaryColor: '#2188ff',          // GitHub blue
  hoverBackground: '#1c2128',       // Hover state background
  activeBlue: '#2188ff',            // Active state blue
  headerBackground: '#0d1117',      // Header background
  cardShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',  // Card shadow
  badge: '#30363d',                 // Badge background
  defaultBadge: '#1f6feb',          // Default badge color
  customBadge: '#238636',           // Custom badge color
  destructive: '#f85149',           // Delete button color
  buttonBg: '#21262d',              // Button background
  cardBackground: '#161b22',        // Card background
};

interface Template {
  id: string;
  name: string;
  packageType: string;
  type?: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
  version?: string;
}

interface PageParams {
  id: string;
}

export default function TemplatePage({ params }: { params: Promise<PageParams> | PageParams }) {
  // Unwrap params using React.use() since it's now a Promise in Next.js 15
  const unwrappedParams = use(params as Promise<PageParams>);
  const templateId = unwrappedParams.id;
  
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  // Debug state to track API response and errors
  const [debugInfo, setDebugInfo] = useState({
    sessionInfo: null,
    apiResponse: null,
    apiError: null
  });

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        setLoading(true);
        
        // First check if user is authenticated
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        setDebugInfo(prev => ({ ...prev, sessionInfo: sessionData }));
        
        console.log("Session data:", sessionData);
        
        // If not authenticated, handle gracefully
        if (!sessionData?.user?.id) {
          setError("Authentication required");
          toast({
            title: "Authentication Required",
            description: "Please sign in to view templates",
            variant: "destructive",
          });
          return;
        }
        
        // Then fetch the template
        console.log(`Fetching template with ID: ${templateId}`);
        const response = await fetch(`/api/templates/${templateId}`);
        
        // Store response for debugging
        let responseData;
        try {
          responseData = await response.json();
          setDebugInfo(prev => ({ ...prev, apiResponse: responseData }));
        } catch (e) {
          setDebugInfo(prev => ({ ...prev, apiError: "Failed to parse response" }));
        }
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("Template not found");
            toast({
              title: "Error",
              description: "Template not found or has been deleted",
              variant: "destructive",
            });
            return;
          }
          throw new Error(`Failed to fetch template: ${response.status} ${response.statusText}`);
        }
        
        // Process the template data
        setTemplate(responseData);
        
        // Initialize clone name if template exists
        if (responseData && responseData.name) {
          setNewTemplateName(`${responseData.name} (Clone)`);
        }
      } catch (error) {
        console.error("Error fetching template:", error);
        setError("Failed to load template");
        setDebugInfo(prev => ({ ...prev, apiError: error.message }));
        toast({
          title: "Error",
          description: "Failed to load template",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [templateId, toast]);

  const handleDeleteClick = async () => {
    if (!window.confirm("Are you sure you want to delete this template?")) {
      return;
    }

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete template");
      }

      toast({
        title: "Success",
        description: "Template deleted successfully",
      });

      router.push("/templates");
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };
  
  const handleCloneClick = () => {
    setCloneModalOpen(true);
  };
  
  const handleCloneTemplate = async () => {
    try {
      const response = await fetch(`/api/templates/clone/${templateId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newName: newTemplateName
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to clone template");
      }

      const { template } = await response.json();
      
      // Close the modal
      setCloneModalOpen(false);
      
      toast({
        title: "Success",
        description: "Template cloned successfully",
      });
      
      // Redirect to the new template
      router.push(`/templates/${template.id}`);
    } catch (error) {
      console.error("Error cloning template:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to clone template",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div 
        className="container mx-auto p-6 rounded-xl m-2" 
        style={{ backgroundColor: vscodePalette.background, color: vscodePalette.foreground }}
      >
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <div 
              className="animate-spin rounded-full h-12 w-12 border-b-2 m2 " 
              style={{ borderColor: vscodePalette.activeBlue }}
            ></div>
            <p className="mt-4 text-lg" style={{ color: vscodePalette.foreground }}>Loading template...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div 
        className="container mx-auto p-6 rounded-xl m-2" 
        style={{ backgroundColor: vscodePalette.background, color: vscodePalette.foreground }}
      >
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => router.push("/templates")} 
            className="mb-4 flex items-center gap-2 rounded-md"
            style={{ 
              backgroundColor: vscodePalette.buttonBg, 
              color: vscodePalette.foreground,
              borderColor: vscodePalette.border,
            }}
          >
            <ArrowLeft className="h-4 w-4" /> 
            <span>Back to Templates</span>
          </Button>
          <Card 
            className="mx-auto max-w-2xl overflow-hidden rounded-lg"
            style={{ 
              backgroundColor: vscodePalette.cardBackground,
              borderColor: vscodePalette.border,
              boxShadow: vscodePalette.cardShadow,
            }}
          >
            <CardContent className="p-8">
              <div className="text-center py-10">
                <h3 className="text-2xl font-semibold mb-3" style={{ color: vscodePalette.foreground }}>
                  Template Not Found
                </h3>
                <p className="mb-6" style={{ color: `${vscodePalette.foreground}99` }}>
                  The template you are looking for could not be found or has been deleted.
                </p>
                <Button 
                  onClick={() => router.push("/templates")}
                  className="rounded-md px-6 py-2"
                  style={{ 
                    backgroundColor: vscodePalette.activeBlue,
                    color: vscodePalette.foreground,
                  }}
                >
                  Go to Templates
                </Button>
              </div>
              
              {/* Debug Information (only shown in development) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-8 border-t pt-6 text-left" style={{ borderColor: vscodePalette.border }}>
                  <h4 className="text-lg font-medium mb-3" style={{ color: vscodePalette.foreground }}>Debug Information</h4>
                  
                  <div className="mb-4">
                    <h5 className="text-sm font-medium mb-1" style={{ color: `${vscodePalette.foreground}` }}>Template ID:</h5>
                    <pre className="p-2 rounded text-xs overflow-auto" style={{ backgroundColor: '#000', color: '#fff' }}>
                      {templateId}
                    </pre>
                  </div>
                  
                  {debugInfo.sessionInfo && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium mb-1" style={{ color: `${vscodePalette.foreground}` }}>Session Information:</h5>
                      <pre className="p-2 rounded text-xs overflow-auto" style={{ backgroundColor: '#000', color: '#fff' }}>
                        {JSON.stringify(debugInfo.sessionInfo, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {debugInfo.apiResponse && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium mb-1" style={{ color: `${vscodePalette.foreground}` }}>API Response:</h5>
                      <pre className="p-2 rounded text-xs overflow-auto" style={{ backgroundColor: '#000', color: '#fff' }}>
                        {JSON.stringify(debugInfo.apiResponse, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {debugInfo.apiError && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium mb-1 text-red-500">API Error:</h5>
                      <pre className="p-2 rounded text-xs overflow-auto" style={{ backgroundColor: '#000', color: '#f87171' }}>
                        {debugInfo.apiError}
                      </pre>
                    </div>
                  )}
                  
                  <div className="flex justify-center mt-4 gap-4">
                    <Button 
                      onClick={() => window.location.reload()}
                      className="rounded-md px-4 py-1 text-sm"
                      style={{ 
                        backgroundColor: vscodePalette.buttonBg,
                        color: vscodePalette.foreground,
                      }}
                    >
                      Retry Request
                    </Button>
                    
                    <Button 
                      onClick={() => window.open(`/api/debug/template/${templateId}`, '_blank')}
                      className="rounded-md px-4 py-1 text-sm"
                      style={{ 
                        backgroundColor: vscodePalette.activeBlue,
                        color: vscodePalette.foreground,
                      }}
                    >
                      Debug Template
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Determine if this is a default template
  const isDefault = template.type === "Default" || template.isDefault === true;

  return (
    <div 
      className="container mx-auto p-6 rounded-xl m-2" 
      style={{ backgroundColor: vscodePalette.background, color: vscodePalette.foreground }}
    >
      <div className="mb-8">
        <Button 
          variant="outline" 
          onClick={() => router.push("/templates")} 
          className="mb-6 flex items-center gap-2 rounded-md"
          style={{ 
            backgroundColor: vscodePalette.buttonBg, 
            color: vscodePalette.foreground,
            borderColor: vscodePalette.border,
          }}
        >
          <ArrowLeft className="h-4 w-4" /> 
          <span>Back to Templates</span>
        </Button>
        
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 
                className="text-3xl font-semibold" 
                style={{ color: vscodePalette.foreground }}
              >
                {template.name}
              </h1>
              
              {isDefault && (
                <Badge
                  style={{ 
                    backgroundColor: vscodePalette.defaultBadge,
                    color: vscodePalette.foreground
                  }}
                >
                  Default
                </Badge>
              )}
            </div>
            
            <div 
              className="text-sm mt-2"
              style={{ color: `${vscodePalette.foreground}99` }}
            >
              Template ID: {template.id}
            </div>
          </div>
          
          <div className="mt-1 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/ide/${template.id}`)}
              className="flex items-center gap-1"
              style={{ 
                backgroundColor: vscodePalette.buttonBg, 
                color: vscodePalette.foreground,
                borderColor: vscodePalette.border,
              }}
            >
              <Code className="h-4 w-4 mr-1" />
              Edit Code
            </Button>
            
            {isDefault ? (
              <Button
                size="sm"
                onClick={handleCloneClick}
                className="flex items-center gap-1"
                style={{ 
                  backgroundColor: vscodePalette.activeBlue,
                  color: vscodePalette.foreground,
                }}
              >
                <Copy className="h-4 w-4 mr-1" />
                Clone Template
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/templates/${templateId}/edit`)}
                className="flex items-center gap-1"
                style={{ 
                  backgroundColor: vscodePalette.buttonBg, 
                  color: vscodePalette.foreground,
                  borderColor: vscodePalette.border,
                }}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteClick}
              className="flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card 
          className="overflow-hidden rounded-lg border transition-shadow hover:shadow-md"
          style={{ 
            backgroundColor: vscodePalette.cardBackground,
            borderColor: vscodePalette.border,
            boxShadow: vscodePalette.cardShadow,
          }}
        >
          <CardHeader className="pb-2 pt-6">
            <CardTitle 
              className="flex items-center text-lg"
              style={{ color: vscodePalette.foreground }}
            >
              <Package2 className="mr-2 h-5 w-5" style={{ color: vscodePalette.activeBlue }} />
              Package Type
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-6">
            <div className="flex items-center gap-2 mt-2">
              <div 
                className="px-3 py-1 rounded-md text-sm"
                style={{ 
                  backgroundColor: vscodePalette.badge,
                  color: vscodePalette.foreground
                }}
              >
                {template.packageType}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="overflow-hidden rounded-lg border transition-shadow hover:shadow-md"
          style={{ 
            backgroundColor: vscodePalette.cardBackground,
            borderColor: vscodePalette.border,
            boxShadow: vscodePalette.cardShadow,
          }}
        >
          <CardHeader className="pb-2 pt-6">
            <CardTitle 
              className="flex items-center text-lg"
              style={{ color: vscodePalette.foreground }}
            >
              <Settings className="mr-2 h-5 w-5" style={{ color: vscodePalette.activeBlue }} />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-6">
            {isDefault ? (
              <div className="mt-2 text-sm" style={{ color: `${vscodePalette.foreground}99` }}>
                This is a Default template and cannot be edited directly. You can clone it to make changes.
              </div>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => router.push(`/templates/${templateId}/edit`)}
                className="mt-2 rounded-md px-4 py-2"
                style={{ 
                  backgroundColor: vscodePalette.buttonBg, 
                  color: vscodePalette.foreground,
                  borderColor: vscodePalette.border,
                }}
              >
                Edit Configuration
              </Button>
            )}
          </CardContent>
        </Card>

        <Card 
          className="overflow-hidden rounded-lg border transition-shadow hover:shadow-md"
          style={{ 
            backgroundColor: vscodePalette.cardBackground,
            borderColor: vscodePalette.border,
            boxShadow: vscodePalette.cardShadow,
          }}
        >
          <CardHeader className="pb-2 pt-6">
            <CardTitle 
              className="flex items-center text-lg"
              style={{ color: vscodePalette.foreground }}
            >
              <Download className="mr-2 h-5 w-5" style={{ color: vscodePalette.activeBlue }} />
              {template.version ? `Version ${template.version}` : 'Create Package'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-6">
            <Button 
              onClick={() => router.push(`/packages/new?templateId=${templateId}`)}
              className="mt-2 rounded-md px-4 py-2"
              style={{ 
                backgroundColor: vscodePalette.activeBlue,
                color: vscodePalette.foreground,
              }}
            >
              Create New Package
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Clone Template Modal */}
      {cloneModalOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          onClick={() => setCloneModalOpen(false)}
        >
          <div 
            className="bg-gray-800 rounded-lg p-6 w-full max-w-md"
            onClick={e => e.stopPropagation()}
            style={{ 
              backgroundColor: vscodePalette.cardBackground,
              borderColor: vscodePalette.border,
              boxShadow: vscodePalette.cardShadow,
            }}
          >
            <h2 
              className="text-xl font-semibold mb-4"
              style={{ color: vscodePalette.foreground }}
            >
              Clone Template
            </h2>
            <p 
              className="mb-4 text-sm"
              style={{ color: `${vscodePalette.foreground}99` }}
            >
              Create a new custom template based on "{template.name}".
            </p>
            
            <div className="mb-4">
              <label 
                htmlFor="templateName" 
                className="block mb-2 text-sm font-medium"
                style={{ color: vscodePalette.foreground }}
              >
                Template Name
              </label>
              <input 
                type="text" 
                id="templateName"
                className="w-full p-2 rounded-md border"
                value={newTemplateName}
                onChange={e => setNewTemplateName(e.target.value)}
                style={{ 
                  backgroundColor: vscodePalette.buttonBg,
                  color: vscodePalette.foreground,
                  borderColor: vscodePalette.border,
                }}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setCloneModalOpen(false)}
                style={{ 
                  backgroundColor: vscodePalette.buttonBg,
                  color: vscodePalette.foreground,
                  borderColor: vscodePalette.border,
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCloneTemplate}
                disabled={!newTemplateName.trim()}
                style={{ 
                  backgroundColor: vscodePalette.activeBlue,
                  color: vscodePalette.foreground,
                }}
              >
                Clone Template
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
