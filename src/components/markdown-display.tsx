import React from 'react';
import ReactMarkdown from 'react-markdown';
import { createLogger } from "@/lib/logger";
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

const logger = createLogger('markdown-display.tsx');

interface MarkdownDisplayProps {
  markdown: string;
  className?: string;
  showDebug?: boolean;
}

export function MarkdownDisplay({ markdown, className = "", showDebug = false }: MarkdownDisplayProps) {
  const displayLogger = logger.forFunction('MarkdownDisplay');

  // Format the markdown for better rendering if needed
  const formattedMarkdown = React.useMemo(() => {
    // Apply minimal formatting to preserve the original structure
    // but ensure proper spacing between elements
    let formatted = markdown;
    
    // Only make sure we have consistent line endings and spacing
    formatted = formatted
      .replace(/\r\n/g, '\n')      // Normalize line endings
      .replace(/\n{3,}/g, '\n\n'); // No more than 2 consecutive newlines
    
    return formatted;
  }, [markdown]);

  // Log information about the markdown content
  React.useEffect(() => {
    displayLogger.info('Rendering markdown', {
      length: markdown.length,
      sample: markdown.substring(0, 100),
      hasMarkdownSyntax: markdown.includes('#') || markdown.includes('*') || markdown.includes('`'),
      hasNewlines: markdown.includes('\n'),
      newlineCount: (markdown.match(/\n/g) || []).length
    });
  }, [markdown]);

  // Add a function to dump raw markdown to console for debugging
  const dumpRawMarkdown = React.useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('===== RAW MARKDOWN =====');
      console.log(markdown);
      console.log('=======================');
    }
  }, [markdown]);

  // Custom components for ReactMarkdown
  const components = {
    // Style code blocks with syntax highlighting
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className="bg-gray-800 dark:bg-gray-900 px-1 py-0.5 rounded text-sm" {...props}>
          {children}
        </code>
      );
    },
    // Style inline code (backticks)
    inlineCode({ children }: any) {
      return (
        <code className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">
          {children}
        </code>
      );
    },
    // Add custom styling for headings
    h1({ children }: any) {
      return <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>;
    },
    h2({ children }: any) {
      return <h2 className="text-xl font-bold mt-5 mb-3">{children}</h2>;
    },
    h3({ children }: any) {
      return <h3 className="text-lg font-bold mt-4 mb-2">{children}</h3>;
    },
    // Style list items
    li({ children }: any) {
      return <li className="mb-1">{children}</li>;
    },
    // Add spacing for paragraph elements
    p({ children }: any) {
      return <p className="mb-4">{children}</p>;
    },
  };

  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none break-words ${className}`}>
      {showDebug && (
        <div className="mb-2 p-2 bg-yellow-100 dark:bg-yellow-900 rounded text-xs">
          <strong>Debug:</strong> Length: {markdown.length}
          <div className="mt-1 grid grid-cols-2 gap-2">
            <div>
              <div className="font-semibold mb-1">Raw Markdown:</div>
              <pre className="p-1 bg-white dark:bg-gray-800 rounded text-xs overflow-auto max-h-20 whitespace-pre-wrap">
                {markdown.substring(0, 150)}...
              </pre>
              <button 
                onClick={dumpRawMarkdown}
                className="mt-1 px-2 py-1 bg-blue-500 text-white rounded text-xs"
              >
                Dump Full Markdown to Console
              </button>
            </div>
            <div>
              <div className="font-semibold mb-1">Formatted Markdown:</div> 
              <pre className="p-1 bg-white dark:bg-gray-800 rounded text-xs overflow-auto max-h-20 whitespace-pre-wrap">
                {formattedMarkdown.substring(0, 150)}...
              </pre>
            </div>
          </div>
        </div>
      )}
      <div className="markdown-content">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]} 
          rehypePlugins={[rehypeSanitize]}
          components={components}
        >
          {formattedMarkdown}
        </ReactMarkdown>
      </div>
    </div>
  );
} 