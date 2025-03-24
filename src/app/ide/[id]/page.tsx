"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Maximize, Minimize } from "lucide-react";
import { createPowerShellScript } from "@/lib/filesystem/initialize-template";
import { SimpleEditor } from "@/components/ide/simple-editor";

export default function IdeTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [templateData, setTemplateData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState<string>("editor-1");
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
    // Add or remove classes from body element to collapse sidebar and top bar
    if (!isFullScreen) {
      document.body.classList.add('ide-fullscreen-mode');
      // Trigger sidebar collapse by dispatching a custom event
      const event = new CustomEvent('toggleSidebar', { 
        detail: { expanded: false },
        bubbles: true,
        composed: true
      });
      window.dispatchEvent(event);
    } else {
      document.body.classList.remove('ide-fullscreen-mode');
      // Restore sidebar by dispatching a custom event
      const event = new CustomEvent('toggleSidebar', { 
        detail: { expanded: true },
        bubbles: true,
        composed: true
      });
      window.dispatchEvent(event);
    }
  };

  useEffect(() => {
    // Extract templateId from params if available
    if (params && params.id) {
      const id = Array.isArray(params.id) ? params.id[0] : params.id;
      setTemplateId(id);
      fetchTemplateData(id);
    } else {
      setLoading(false);
      setError("No template ID provided");
    }
  }, [params]);

  const fetchTemplateData = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/templates/${id}`);

      if (!response.ok) {
        throw new Error("Failed to fetch template data");
      }

      const data = await response.json();
      console.log("Template data:", data);

      // Handle both possible response formats
      if (data.template) {
        setTemplateData(data.template);
      } else {
        setTemplateData(data);
      }
    } catch (err) {
      console.error("Error fetching template:", err);
      setError("Failed to load template data");
    } finally {
      setLoading(false);
    }
  };

  const defaultCode = '# PowerShell Script\n\n# Add your code here\n';

  // Handle creating a new file
  const handleCreateFile = async () => {
    if (!templateId) return;

    try {
      setIsCreatingFile(true);
      const success = await createPowerShellScript(templateId);
      if (success) {
        // Force a refresh of the editor component
        setEditorKey(`editor-${Date.now()}`);
      }
    } catch (error) {
      console.error("Error creating PowerShell script:", error);
    } finally {
      setIsCreatingFile(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex-1 flex flex-col h-full w-full overflow-hidden ${isFullScreen ? 'fullscreen-editor' : ''}`}>
        {isFullScreen && (
          <div className="fullscreen-tab cursor-pointer" onClick={toggleFullScreen}>
            <span className="flex items-center">
              <Minimize className="h-4 w-4 mr-2" />
              Exit Full Screen
            </span>
          </div>
        )}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: "#4285F4" }}></div>
            <p className="mt-4 text-lg text-foreground">Loading template data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex-1 flex flex-col h-full w-full overflow-hidden ${isFullScreen ? 'fullscreen-editor' : ''}`}>
        {isFullScreen && (
          <div className="fullscreen-tab cursor-pointer" onClick={toggleFullScreen}>
            <span className="flex items-center">
              <Minimize className="h-4 w-4 mr-2" />
              Exit Full Screen
            </span>
          </div>
        )}
        <div className="flex-1 p-4">
          <div className="bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg p-4">
            {error}
          </div>
        </div>
      </div>
    );
  }

  // Handle case where template data is loaded but code is missing
  const templateCode = templateData?.code || defaultCode;
  const templateName = templateData?.name || 'PowerShell Script';

  return (
    <div className={`flex-1 flex flex-col h-full w-full overflow-hidden ${isFullScreen ? 'fullscreen-editor' : ''}`}>
      {isFullScreen && (
        <div className="fullscreen-tab cursor-pointer" onClick={toggleFullScreen}>
          <span className="flex items-center">
            <Minimize className="h-4 w-4 mr-2" />
            Exit Full Screen
          </span>
        </div>
      )}
      <Card className="flex-1 overflow-hidden rounded-xl dark:bg-[#1e1e1e] border-none md-elevation-2">
        <SimpleEditor 
          key={editorKey}
          templateId={templateId || ""} 
          templateName={templateData?.name}
          templateVersion={templateData?.version}
          height="100%"
          initialValue={templateCode}
          onToggleFullScreen={toggleFullScreen}
          isFullScreen={isFullScreen}
        />
      </Card>
    </div>
  );
} 