"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, PackagePlus } from "lucide-react";

export default function NewTemplatePage() {
  const [templateName, setTemplateName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate input
      if (!templateName.trim()) {
        setError("Template name is required");
        setIsSubmitting(false);
        return;
      }

      // In a real implementation, this would call the API
      // For now, simulate a successful template creation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess("Template created successfully!");
      setTimeout(() => {
        router.push('/');
      }, 1500);
      
    } catch (err) {
      console.error("Error creating template:", err);
      setError("Failed to create template. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h1 className="text-3xl font-bold">Create New Template</h1>
      </div>

      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center">
            <PackagePlus className="mr-2 h-5 w-5" />
            New Deployment Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                placeholder="Enter template name..."
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                disabled={isSubmitting}
                required
              />
              <p className="text-sm text-muted-foreground">
                Give your template a descriptive name. Example: "Adobe Reader DC"
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? "Creating..." : "Create Template"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 