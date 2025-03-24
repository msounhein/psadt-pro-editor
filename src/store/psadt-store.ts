import { create } from 'zustand';

export interface PSADTRelease {
  version: string;
  date: string;
  isLatest: boolean;
  downloadUrl: string;
  notes?: string;
}

export interface MSIMetadata {
  productName: string;
  productVersion: string;
  manufacturer: string;
  productCode: string;
  language: string;
  estimatedSize: string;
  installLocation: string;
}

export interface Parameters {
  recommendedInstall: string;
  recommendedUninstall: string;
  silentParams: string[];
  confidence: string;
  webFindings?: {
    source: string;
    parameters: string;
  }[];
}

interface PSADTState {
  // PSADT Setup
  psadtStatus: 'checking' | 'not-found' | 'found';
  availableVersions: PSADTRelease[];
  selectedVersion: string | null;
  templateName: string;
  
  // MSI Processing
  msiPath: string;
  msiMetadata: MSIMetadata | null;
  
  // Parameters
  parameters: Parameters | null;
  installCommand: string;
  uninstallCommand: string;
  silentParameters: string;
  
  // Script Generation
  scriptContent: string;
  
  // Status
  isLoading: boolean;
  
  // Actions
  setPsadtStatus: (status: 'checking' | 'not-found' | 'found') => void;
  setAvailableVersions: (versions: PSADTRelease[]) => void;
  setSelectedVersion: (version: string | null) => void;
  setTemplateName: (name: string) => void;
  setMsiPath: (path: string) => void;
  setMsiMetadata: (metadata: MSIMetadata | null) => void;
  setParameters: (params: Parameters | null) => void;
  setInstallCommand: (command: string) => void;
  setUninstallCommand: (command: string) => void;
  setSilentParameters: (params: string) => void;
  setScriptContent: (content: string) => void;
  setIsLoading: (loading: boolean) => void;
  
  // Reset
  resetStore: () => void;
}

const initialState = {
  psadtStatus: 'checking' as const,
  availableVersions: [],
  selectedVersion: null,
  templateName: '',
  msiPath: '',
  msiMetadata: null,
  parameters: null,
  installCommand: '',
  uninstallCommand: '',
  silentParameters: '',
  scriptContent: '',
  isLoading: false,
};

export const usePsadtStore = create<PSADTState>((set) => ({
  ...initialState,
  
  setPsadtStatus: (status) => set({ psadtStatus: status }),
  setAvailableVersions: (versions) => set({ availableVersions: versions }),
  setSelectedVersion: (version) => set({ selectedVersion: version }),
  setTemplateName: (name) => set({ templateName: name }),
  setMsiPath: (path) => set({ msiPath: path }),
  setMsiMetadata: (metadata) => set({ msiMetadata: metadata }),
  setParameters: (params) => set({ parameters: params }),
  setInstallCommand: (command) => set({ installCommand: command }),
  setUninstallCommand: (command) => set({ uninstallCommand: command }),
  setSilentParameters: (params) => set({ silentParameters: params }),
  setScriptContent: (content) => set({ scriptContent: content }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  resetStore: () => set(initialState),
})); 