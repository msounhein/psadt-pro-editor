import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { createLogger, LogLevel } from '@/lib/logger';

const logger = createLogger('api/psadt/versions/route.ts');

interface Release {
  version: string;
  date: string;
  isLatest: boolean;
  downloadUrl: string;
  notes?: string;
}

// Helper function to sanitize markdown
function sanitizeMarkdown(text: string): string {
  if (!text) return '';
  
  // Normalize line endings and do minimal formatting
  // Note: We keep all GitHub flavors intact
  const sanitized = text
    .replace(/\r\n/g, '\n')       // Normalize Windows line endings
    .replace(/\n{3,}/g, '\n\n')   // No more than 2 consecutive newlines
    .trim();
    
  // Add explicit code markers for backticked text that might be commands
  let processedMarkdown = sanitized.replace(/`([^`]+)`/g, (match, p1) => {
    // Check if this likely contains PowerShell commands
    if (p1.includes('-') || p1.includes('Get-') || p1.includes('Set-') || p1.includes('$')) {
      return '`' + p1 + '`';
    }
    return match;
  });
  
  return processedMarkdown;
}

export async function GET(req: NextRequest) {
  const getVersions = logger.forFunction('GET');
  try {
    // Use GitHub API to get releases
    const apiUrl = "https://api.github.com/repos/PSAppDeployToolkit/PSAppDeployToolkit/releases";
    getVersions.info(`Fetching PSADT versions from ${apiUrl}`);
    
    const response = await axios.get(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github+json',
        // Add GitHub token if available in environment variables
        ...(process.env.GITHUB_TOKEN && {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`
        })
      },
      timeout: 10000 // 10 second timeout
    });
    
    // Map the response to our format
    let releases: Release[] = [];
    
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      // Map the GitHub API response
      getVersions.info(`Successfully fetched ${response.data.length} releases from GitHub API`);
      releases = response.data.map((release: any, index: number) => {
        const notes = sanitizeMarkdown(release.body);
        
        // Log info about the notes for debugging
        if (index === 0) {
          getVersions.info(`First release notes sample`, {
            version: release.tag_name,
            noteLength: notes?.length,
            sample: notes?.substring(0, 100)
          });
          
          // Log the full raw markdown for the first release (for debugging)
          if (process.env.NODE_ENV === 'development') {
            getVersions.debug('Raw Markdown for first release', {
              raw: release.body
            });
          }
        }
        
        return {
          version: release.tag_name,
          date: release.published_at,
          isLatest: index === 0,
          downloadUrl: release.zipball_url,
          notes: notes || 'No release notes available.'
        };
      });
    } else {
      // Use fallback data if GitHub API returns empty/invalid data
      getVersions.warn('GitHub API returned empty or invalid data, using fallback data');
      releases = getFallbackReleases();
    }
    
    return NextResponse.json({ 
      success: true,
      releases 
    });
  } catch (error: any) {
    getVersions.error('Error fetching from GitHub API', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    // Return fallback data on error
    const fallbackReleases = getFallbackReleases();
    
    return NextResponse.json({ 
      success: true,
      releases: fallbackReleases,
      error: 'Could not fetch from GitHub API. Using fallback data.'
    });
  }
}

// Fallback releases when GitHub API fails
function getFallbackReleases(): Release[] {
  return [
    { 
      version: '4.0.1', 
      date: '2023-11-15T00:00:00.000Z', 
      notes: '## Changes in 4.0.1\n\n### Fixed\n- Fixed issue with Install-SCConfigMgrApplication when retrying applications in an error state.\n- Fixed execution policy bypass when using -ExecutionPolicyBypass parameter.\n\n### Changed\n- Updated PSADT to properly inherit $ErrorActionPreference.',
      isLatest: true,
      downloadUrl: 'https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/archive/refs/tags/4.0.1.zip'
    },
    { 
      version: '4.0.0', 
      date: '2023-09-20T09:12:59.000Z', 
      notes: '## Changes in 4.0.0\n\n### Fixed\n- Fixed various bugs related to PowerShell Core compatibility\n- Fixed issue with registry key enumeration\n\n### Added\n- Added support for PowerShell 7 and newer\n- Added better logging for installations',
      isLatest: false,
      downloadUrl: 'https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/archive/refs/tags/4.0.0.zip'
    },
    { 
      version: '3.9.3', 
      date: '2023-07-19T22:31:00.000Z', 
      notes: '## Changes in 3.9.3\n\n### Fixed\n- Fixed issue with timeout parameter in Execute-Process\n- Fixed detection of pending reboots in Windows 11\n\n### Added\n- Added better error handling for network operations\n- Added support for additional exit codes',
      isLatest: false,
      downloadUrl: 'https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/archive/refs/tags/3.9.3.zip'
    },
    { 
      version: '3.9.2', 
      date: '2023-04-09T10:17:07.000Z', 
      notes: '## Changes in 3.9.2\n\n### Fixed\n- Fixed detection logic for active users\n- Fixed path handling with spaces\n\n### Added\n- Added improved progress reporting\n- Added new Show-InstallationProgress parameters',
      isLatest: false,
      downloadUrl: 'https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/archive/refs/tags/3.9.2.zip'
    },
    {
      version: '3.9.1',
      date: '2023-01-15T10:17:07.000Z',
      notes: '## Changes in 3.9.1\n\n### Fixed\n- Fixed install behavior in non-interactive mode\n- Improved registry handling\n\n### Added\n- Added enhanced logging options\n- Better Unicode support in log files',
      isLatest: false,
      downloadUrl: 'https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/archive/refs/tags/3.9.1.zip'
    }
  ];
} 