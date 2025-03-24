import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { createLogger } from "@/lib/logger";

const logger = createLogger('components/template-download-dialog.tsx');

interface Template {
  name: string;
  type: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
}

interface TemplateDownloadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template: Template;
  version: string;
  onDownload: (template: Template) => Promise<void>;
}

export function TemplateDownloadDialog({
  isOpen,
  onClose,
  template,
  version,
  onDownload
}: TemplateDownloadDialogProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      setError(null);
      setSuccess(false);
      
      await onDownload(template);
      
      setSuccess(true);
      
      // Close dialog after success with a slight delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download template");
      logger.error('Error downloading template', { error: err });
    } finally {
      setIsDownloading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">Download Template</DialogTitle>
          <DialogDescription className="text-sm">
            Download the {template.name} from PSADT version {version}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col space-y-3 py-3">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileDown className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-sm">{template.name}</h3>
              <p className="text-xs text-muted-foreground">Version {version}</p>
            </div>
          </div>
          
          {error && (
            <div className="flex items-start bg-red-50 dark:bg-red-950/30 p-2 rounded-md">
              <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-red-600" />
              <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="flex items-start bg-green-50 dark:bg-green-950/30 p-2 rounded-md">
              <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-green-600" />
              <p className="text-xs text-green-700 dark:text-green-400">
                Template downloaded successfully! Template v{version} will be stored in your Default templates.
              </p>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            This template will be stored in your Default templates folder and cannot be modified directly, only copied.
          </p>
        </div>
        
        <DialogFooter className="sm:justify-between">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isDownloading}
            size="sm"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDownload}
            disabled={isDownloading || success}
            className="min-w-[100px]"
            size="sm"
          >
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Downloading...
              </>
            ) : success ? (
              <>
                <CheckCircle className="mr-2 h-3 w-3" />
                Downloaded
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-3 w-3" />
                Download
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 