"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

// Dynamically import the SimpleEditor component to prevent SSR issues
const SimpleEditor = dynamic(() => import("@/components/ide/simple-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px]">
      <div className="flex flex-col items-center">
        <div 
          className="animate-spin rounded-full h-12 w-12 border-b-2" 
          style={{ borderColor: "#4285F4" }}
        ></div>
        <p className="mt-4 text-lg text-foreground">
          Loading editor environment...
        </p>
      </div>
    </div>
  ),
});

const DEFAULT_SCRIPT = `# PowerShell Script
# Created: ${new Date().toISOString()}

# Add your PowerShell code here

`;

export default function NewScriptPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [scriptName, setScriptName] = useState("New PowerShell Script");
  const [scriptContent, setScriptContent] = useState(DEFAULT_SCRIPT);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!scriptName.trim()) {
      toast({
        title: "Error",
        description: "Please provide a name for your script",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: scriptName,
          packageType: 'script',
          code: scriptContent,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save script');
      }
      
      const data = await response.json();
      
      toast({
        title: "Success",
        description: "Script saved successfully",
      });
      
      // Navigate to the new script's page
      router.push(`/ide/${data.id}`);
    } catch (err) {
      console.error('Error saving script:', err);
      toast({
        title: "Error",
        description: "Failed to save script",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditorChange = (value: string) => {
    setScriptContent(value);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => router.push("/ide")} 
          className="mb-4 md-ripple"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to IDE
        </Button>
        
        <div className="mb-4">
          <Label htmlFor="script-name">Script Name</Label>
          <Input
            id="script-name"
            value={scriptName}
            onChange={(e) => setScriptName(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>
      
      <div className="flex justify-end mb-4">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="md-ripple"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Script
            </>
          )}
        </Button>
      </div>
      
      <Card className="overflow-hidden rounded-lg dark:bg-[#1e1e1e] border-none md-elevation-2">
        <SimpleEditor 
          height="80vh"
          initialValue={DEFAULT_SCRIPT}
          onSave={handleSave}
          onChange={handleEditorChange}
        />
      </Card>
    </div>
  );
} 