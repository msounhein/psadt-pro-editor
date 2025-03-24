"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Code, Loader2 } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description?: string;
  packageType: string;
  createdAt: string;
  updatedAt: string;
  version?: string;
}

export default function IdePage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/templates');
        
        if (!response.ok) {
          throw new Error("Failed to fetch templates");
        }
        
        const data = await response.json();
        console.log("Templates API response:", data);
        
        if (data.templates) {
          setTemplates(data.templates);
        } else if (Array.isArray(data)) {
          setTemplates(data);
        } else {
          setTemplates([]);
          console.warn("Unexpected templates API response format:", data);
        }
      } catch (err) {
        console.error("Error fetching templates:", err);
        setError("Failed to load templates");
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: "#4285F4" }}></div>
            <p className="mt-4 text-lg text-foreground">Loading templates...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg p-4">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-medium mb-2 text-foreground">
          PowerShell IDE
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          Select a template to edit or create a new PowerShell script
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.isArray(templates) && templates.length > 0 ? (
          templates.map((template) => (
            <Card 
              key={template.id} 
              className="md-elevation-1 hover:md-elevation-2 transition-all duration-200 border-none"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{template.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {template.description && (
                  <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/ide/${template.id}`)}
                    className="flex items-center gap-1 md-ripple"
                  >
                    <Code className="h-4 w-4 mr-1" />
                    Edit Code
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full">
            <Card className="p-6 text-center">
              <p className="text-muted-foreground mb-4">No templates found. Create a new script to get started.</p>
            </Card>
          </div>
        )}
      </div>

      <div className="mt-8">
        <Button
          onClick={() => router.push('/ide/new')}
          className="md-ripple"
        >
          Create New Script
        </Button>
      </div>
    </div>
  );
} 