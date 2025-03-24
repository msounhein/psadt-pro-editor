"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Copy, ArrowRight, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import React, { use } from "react";

// VSCode color palette
const vscodePalette = {
  background: '#0e1116',
  foreground: '#e6edf3',
  border: '#30363d',
  activeBlue: '#2188ff',
  buttonBg: '#21262d',
  cardBackground: '#161b22',
  cardShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
  destructive: '#f85149',
  defaultBadge: '#1f6feb',
  customBadge: '#238636',
};

interface Template {
  id: string;
  name: string;
  description?: string;
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

export default function CloneTemplatePage({ params }: { params: Promise<PageParams> | PageParams }) {
  // Unwrap params 
  const unwrappedParams = use(params as Promise<PageParams>);
  const sourceTemplateId = unwrappedParams.id;
  
  const [sourceTemplate, setSourceTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    newName: "",
    description: ""
  });
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/templates/${sourceTemplateId}`);
        
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
          throw new Error("Failed to fetch template");
        }
        
        const data = await response.json();
        setSourceTemplate(data);
        
        // Initialize form data from template
        setFormData({
          newName: `${data.name} (Clone)`,
          description: data.description || ""
        });
      } catch (error) {
        console.error("Error fetching template:", error);
        setError("Failed to load template");
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
  }, [sourceTemplateId, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleClone = async () => {
    try {
      setCloning(true);
      
      const response = await fetch(`/api/templates/clone/${sourceTemplateId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to clone template");
      }

      const { template } = await response.json();
      
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
    } finally {
      setCloning(false);
    }
  };

  const handleCancel = () => {
    router.push(`/templates/${sourceTemplateId}`);
  };

  const handleCloneAndEdit = async () => {
    try {
      setCloning(true);
      
      const response = await fetch(`/api/templates/clone/${sourceTemplateId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to clone template");
      }

      const { template } = await response.json();
      
      toast({
        title: "Success",
        description: "Template cloned successfully",
      });
      
      // Redirect to the edit page for the new template
      router.push(`/templates/${template.id}/edit`);
    } catch (error) {
      console.error("Error cloning template:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to clone template",
        variant: "destructive",
      });
    } finally {
      setCloning(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 rounded-xl m-2" 
           style={{ backgroundColor: vscodePalette.background, color: vscodePalette.foreground }}>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 m2" 
                 style={{ borderColor: vscodePalette.activeBlue }}></div>
            <p className="mt-4 text-lg" style={{ color: vscodePalette.foreground }}>
              Loading template...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !sourceTemplate) {
    return (
      <div className="container mx-auto p-6 rounded-xl m-2" 
           style={{ backgroundColor: vscodePalette.background, color: vscodePalette.foreground }}>
        <div className="mb-6">
          <Button variant="outline" 
                  onClick={() => router.push("/templates")} 
                  className="mb-4 flex items-center gap-2 rounded-md"
                  style={{ 
                    backgroundColor: vscodePalette.buttonBg, 
                    color: vscodePalette.foreground,
                    borderColor: vscodePalette.border,
                  }}>
            <ArrowLeft className="h-4 w-4" /> 
            <span>Back to Templates</span>
          </Button>
          <Card className="mx-auto max-w-2xl overflow-hidden rounded-lg"
                style={{ 
                  backgroundColor: vscodePalette.cardBackground,
                  borderColor: vscodePalette.border,
                  boxShadow: vscodePalette.cardShadow,
                }}>
            <CardContent className="p-8">
              <div className="text-center py-10">
                <h3 className="text-2xl font-semibold mb-3" style={{ color: vscodePalette.foreground }}>
                  Template Not Found
                </h3>
                <p className="mb-6" style={{ color: `${vscodePalette.foreground}99` }}>
                  The template you are trying to clone could not be found or has been deleted.
                </p>
                <Button onClick={() => router.push("/templates")}
                        className="rounded-md px-6 py-2"
                        style={{ 
                          backgroundColor: vscodePalette.activeBlue,
                          color: vscodePalette.foreground,
                        }}>
                  Go to Templates
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Determine if source is a default template
  const isSourceDefault = sourceTemplate.type === "Default" || sourceTemplate.isDefault === true;

  return (
    <div className="container mx-auto p-6 rounded-xl m-2" 
         style={{ backgroundColor: vscodePalette.background, color: vscodePalette.foreground }}>
      <div className="mb-8">
        <Button variant="outline" 
                onClick={() => router.push(`/templates/${sourceTemplateId}`)} 
                className="mb-6 flex items-center gap-2 rounded-md"
                style={{ 
                  backgroundColor: vscodePalette.buttonBg, 
                  color: vscodePalette.foreground,
                  borderColor: vscodePalette.border,
                }}>
          <ArrowLeft className="h-4 w-4" /> 
          <span>Back to Template</span>
        </Button>
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-semibold" style={{ color: vscodePalette.foreground }}>
            Clone Template
          </h1>
          <Badge style={{ backgroundColor: isSourceDefault ? vscodePalette.defaultBadge : vscodePalette.customBadge, color: vscodePalette.foreground }}>
            Source: {isSourceDefault ? 'Default' : 'Custom'}
          </Badge>
        </div>
        
        <Card className="overflow-hidden rounded-lg border mb-6"
              style={{ 
                backgroundColor: vscodePalette.cardBackground,
                borderColor: vscodePalette.border,
                boxShadow: vscodePalette.cardShadow,
              }}>
          <CardHeader className="pb-4 pt-6">
            <CardTitle className="text-lg" style={{ color: vscodePalette.foreground }}>
              Source Template: {sourceTemplate.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            <div className="space-y-2">
              <label htmlFor="newName" className="text-sm font-medium" style={{ color: vscodePalette.foreground }}>
                New Template Name
              </label>
              <Input 
                id="newName"
                name="newName"
                value={formData.newName}
                onChange={handleInputChange}
                placeholder="Enter new template name"
                className="bg-opacity-20 border"
                style={{ 
                  backgroundColor: vscodePalette.buttonBg,
                  color: vscodePalette.foreground,
                  borderColor: vscodePalette.border,
                }}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium" style={{ color: vscodePalette.foreground }}>
                Description (Optional)
              </label>
              <Textarea 
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter template description"
                rows={3}
                className="resize-none"
                style={{ 
                  backgroundColor: vscodePalette.buttonBg,
                  color: vscodePalette.foreground,
                  borderColor: vscodePalette.border,
                }}
              />
            </div>
            
            <div className="pt-2">
              <p className="text-sm" style={{ color: `${vscodePalette.foreground}99` }}>
                The cloned template will be created as a Custom template that you can modify.
                All files and settings from the source template will be copied to the new one.
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* Navigation and Action Buttons */}
        <div className="flex justify-between items-center pt-2">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            className="flex items-center gap-2"
            style={{ 
              backgroundColor: vscodePalette.buttonBg,
              color: vscodePalette.foreground,
              borderColor: vscodePalette.border,
            }}
          >
            <XCircle className="h-4 w-4" /> 
            <span>Cancel</span>
          </Button>
          
          <div className="flex items-center gap-3">
            <Button 
              onClick={handleClone}
              className="flex items-center gap-2"
              style={{ 
                backgroundColor: vscodePalette.activeBlue,
                color: vscodePalette.foreground,
              }}
              disabled={cloning || !formData.newName.trim()}
            >
              <Copy className="h-4 w-4" /> 
              <span>{cloning ? 'Cloning...' : 'Clone Template'}</span>
            </Button>
            
            <Button 
              onClick={handleCloneAndEdit}
              className="flex items-center gap-2"
              style={{ 
                backgroundColor: vscodePalette.customBadge,
                color: vscodePalette.foreground,
              }}
              disabled={cloning || !formData.newName.trim()}
            >
              <span>Clone & Edit</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
