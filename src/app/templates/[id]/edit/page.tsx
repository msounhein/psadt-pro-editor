"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, ArrowRight, XCircle, Check } from "lucide-react";
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

export default function EditTemplatePage({ params }: { params: Promise<PageParams> | PageParams }) {
  // Unwrap params 
  const unwrappedParams = use(params as Promise<PageParams>);
  const templateId = unwrappedParams.id;
  
  const [template, setTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    packageType: "PowerShellAppDeploymentToolkit"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  // Package type options 
  const packageTypes = [
    "PowerShellAppDeploymentToolkit",
    "MSI",
    "EXE",
    "Script",
    "Custom"
  ];

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/templates/${templateId}`);
        
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
        setTemplate(data);
        
        // Initialize form data from template
        setFormData({
          name: data.name || "",
          description: data.description || "",
          packageType: data.packageType || "PowerShellAppDeploymentToolkit"
        });
        
        // Check if this is a Default template
        if (data.type === "Default" || data.isDefault === true) {
          toast({
            title: "Default Template",
            description: "Default templates cannot be edited. Please clone it instead.",
            variant: "destructive",
          });
          router.push(`/templates/${templateId}`);
          return;
        }
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
  }, [templateId, toast, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePackageTypeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      packageType: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const response = await fetch(`/api/templates/${templateId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update template");
      }

      toast({
        title: "Success",
        description: "Template updated successfully",
      });
      
      // Redirect to the next step or template detail page
      router.push(`/templates/${templateId}`);
    } catch (error) {
      console.error("Error updating template:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update template",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/templates/${templateId}`);
  };

  const handleNext = async () => {
    // First save the template
    try {
      setSaving(true);
      
      const response = await fetch(`/api/templates/${templateId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update template");
      }

      toast({
        title: "Success",
        description: "Template updated successfully",
      });
      
      // Redirect to the next step (IDE or package creation)
      router.push(`/ide/${templateId}`);
    } catch (error) {
      console.error("Error updating template:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update template",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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

  if (error || !template) {
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
                  The template you are trying to edit could not be found or has been deleted.
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

  return (
    <div className="container mx-auto p-6 rounded-xl m-2" 
         style={{ backgroundColor: vscodePalette.background, color: vscodePalette.foreground }}>
      <div className="mb-8">
        <Button variant="outline" 
                onClick={() => router.push(`/templates/${templateId}`)} 
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
            Edit Template
          </h1>
          <Badge style={{ backgroundColor: vscodePalette.customBadge, color: vscodePalette.foreground }}>
            Custom
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
              Template Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-6">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium" style={{ color: vscodePalette.foreground }}>
                Template Name
              </label>
              <Input 
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter template name"
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
            
            <div className="space-y-2">
              <label htmlFor="packageType" className="text-sm font-medium" style={{ color: vscodePalette.foreground }}>
                Package Type
              </label>
              <Select 
                value={formData.packageType} 
                onValueChange={handlePackageTypeChange}
              >
                <SelectTrigger 
                  id="packageType"
                  style={{ 
                    backgroundColor: vscodePalette.buttonBg,
                    color: vscodePalette.foreground,
                    borderColor: vscodePalette.border,
                  }}
                >
                  <SelectValue placeholder="Select package type" />
                </SelectTrigger>
                <SelectContent
                  style={{ 
                    backgroundColor: vscodePalette.cardBackground,
                    color: vscodePalette.foreground,
                    borderColor: vscodePalette.border,
                  }}
                >
                  {packageTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              onClick={handleSave}
              className="flex items-center gap-2"
              style={{ 
                backgroundColor: vscodePalette.activeBlue,
                color: vscodePalette.foreground,
              }}
              disabled={saving}
            >
              <Save className="h-4 w-4" /> 
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </Button>
            
            <Button 
              onClick={handleNext}
              className="flex items-center gap-2"
              style={{ 
                backgroundColor: vscodePalette.customBadge,
                color: vscodePalette.foreground,
              }}
              disabled={saving}
            >
              <span>Next Step</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
