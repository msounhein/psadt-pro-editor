"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { 
  Package2, 
  FileCode2,
  Search,
  FileText
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  packageType: string;
  type: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
  version?: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  // Fetch templates on component mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/templates');
        
        if (!response.ok) {
          throw new Error('Failed to fetch templates');
        }
        
        // API returns array directly in this implementation
        const data = await response.json();
        setTemplates(data);
      } catch (error) {
        console.error('Error fetching templates:', error);
        setError('Failed to load templates');
        toast({
          title: 'Error',
          description: 'Failed to load templates',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [toast]);

  // Filter templates by type
  const defaultTemplates = templates.filter(t => t.type === 'Default');
  const customTemplates = templates.filter(t => t.type === 'Custom');
  
  // Filter templates by search query
  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.packageType.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredDefaultTemplates = defaultTemplates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.packageType.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredCustomTemplates = customTemplates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.packageType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return dateString;
    }
  };

  // Template card component similar to what's shown in the screenshot
  const TemplateCard = ({ template }: { template: Template }) => {
    const isDefault = template.type === 'Default';
    
    return (
      <Card className="bg-[#161b22] border-[#30363d] transition-shadow hover:shadow-md hover:bg-[#1c2128] cursor-pointer"
           onClick={() => router.push(`/templates/${template.id}`)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="bg-[#0e1116] p-3 rounded-md">
                <FileCode2 className="h-6 w-6 text-[#e6edf3]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium text-[#e6edf3]">{template.name}</h3>
                  {isDefault && (
                    <Badge className="bg-[#1f6feb] text-[#e6edf3] text-xs">
                      Default
                    </Badge>
                  )}
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center text-sm text-[#e6edf399]">
                    <FileText className="h-4 w-4 mr-1" />
                    Type: {template.packageType}
                  </div>
                  {template.version && (
                    <div className="flex items-center text-sm text-[#e6edf399]">
                      <Package2 className="h-4 w-4 mr-1" />
                      Version: {template.version}
                    </div>
                  )}
                </div>
                <div className="mt-2 text-xs text-[#e6edf380]">
                  Created: {formatDate(template.createdAt)}
                </div>
              </div>
            </div>
            <div className="flex items-center">
              <Button variant="ghost" size="sm" className="text-[#e6edf3] hover:bg-[#30363d]"
                     onClick={(e) => {
                       e.stopPropagation();
                       router.push(`/templates/${template.id}`);
                     }}>
                View details
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-[#e6edf3] flex items-center">
            <FileCode2 className="mr-2 h-6 w-6" /> Templates
          </h1>
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#2188ff' }}></div>
              <p className="mt-4 text-lg text-[#e6edf3]">Loading templates...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main content
  return (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-[#e6edf3] flex items-center mb-6">
          <FileCode2 className="mr-2 h-6 w-6" /> Templates
        </h1>
        
        {/* Search input */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#e6edf380]" />
          <input 
            type="text" 
            placeholder="Search templates..." 
            className="w-full bg-[#0e1116] border border-[#30363d] rounded-md py-2 pl-10 pr-4 text-[#e6edf3] focus:outline-none focus:ring-1 focus:ring-[#2188ff]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Template tabs */}
        <Tabs defaultValue="all" className="mb-6">
          <TabsList className="bg-[#21262d] mb-6">
            <TabsTrigger value="all" className="text-[#e6edf3] data-[state=active]:bg-[#2188ff]">
              All Templates ({filteredTemplates.length})
            </TabsTrigger>
            <TabsTrigger value="default" className="text-[#e6edf3] data-[state=active]:bg-[#2188ff]">
              Default ({filteredDefaultTemplates.length})
            </TabsTrigger>
            <TabsTrigger value="custom" className="text-[#e6edf3] data-[state=active]:bg-[#2188ff]">
              Custom ({filteredCustomTemplates.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="grid grid-cols-1 gap-4">
              {filteredTemplates.length > 0 ? (
                filteredTemplates.map(template => (
                  <TemplateCard key={template.id} template={template} />
                ))
              ) : (
                <EmptyState message={searchQuery ? "No matching templates found" : "No templates found"} />
              )}
            </div>
          </TabsContent>

          <TabsContent value="default">
            <div className="grid grid-cols-1 gap-4">
              {filteredDefaultTemplates.length > 0 ? (
                filteredDefaultTemplates.map(template => (
                  <TemplateCard key={template.id} template={template} />
                ))
              ) : (
                <EmptyState message={searchQuery ? "No matching default templates found" : "No default templates found"} />
              )}
            </div>
          </TabsContent>

          <TabsContent value="custom">
            <div className="grid grid-cols-1 gap-4">
              {filteredCustomTemplates.length > 0 ? (
                filteredCustomTemplates.map(template => (
                  <TemplateCard key={template.id} template={template} />
                ))
              ) : (
                <EmptyState message={searchQuery ? "No matching custom templates found" : "No custom templates found"} />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Empty state component
function EmptyState({ message = 'No templates found' }) {
  const router = useRouter();
  
  return (
    <div className="text-center py-12 border border-[#30363d] rounded-lg">
      <FileCode2 className="h-16 w-16 mx-auto mb-4 text-[#e6edf340]" />
      <h3 className="text-xl font-medium mb-2 text-[#e6edf3]">
        {message}
      </h3>
      <p className="mb-6 text-[#e6edf399]">
        Create a new template or download a default template to get started.
      </p>
      <div className="flex justify-center gap-4">
        <Button 
          onClick={() => router.push('/templates/new')}
          className="bg-[#2188ff] hover:bg-[#1c7ed6] text-[#e6edf3]"
        >
          Create Template
        </Button>
        <Button 
          variant="outline" 
          onClick={() => router.push('/default-template')}
          className="border-[#30363d] bg-[#21262d] text-[#e6edf3] hover:bg-[#30363d]"
        >
          Download Default Template
        </Button>
      </div>
    </div>
  );
}