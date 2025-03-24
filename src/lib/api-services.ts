import axios from 'axios';
import { PSADTRelease, MSIMetadata, Parameters } from '@/store/psadt-store';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// PSADT Services
export const checkPsadtExists = async (): Promise<boolean> => {
  const response = await api.get('/psadt/check');
  return response.data.exists;
};

export const getAvailableVersions = async (): Promise<PSADTRelease[]> => {
  const response = await api.get('/psadt/versions');
  return response.data.releases;
};

export const downloadPsadt = async (version: string): Promise<string> => {
  const response = await api.post('/psadt/download', { version });
  return response.data.path;
};

export const createTemplate = async (templateName: string): Promise<string> => {
  const response = await api.post('/psadt/create-template', { templateName });
  return response.data.templatePath;
};

// MSI Services
export const extractMsiMetadata = async (msiPath: string): Promise<MSIMetadata> => {
  const response = await api.post('/msi/metadata', { msiPath });
  return response.data.metadata;
};

// Parameter Services
export const analyzeParameters = async (msiPath: string): Promise<Parameters> => {
  const response = await api.post('/parameters/analyze', { msiPath });
  return response.data.parameters;
};

export const scrapeWebParameters = async (productName: string, productVersion: string): Promise<any> => {
  const response = await api.post('/parameters/scrape', { productName, productVersion });
  return response.data.findings;
};

// Script Generation
export const generateScript = async (params: {
  templateName: string;
  msiMetadata: MSIMetadata;
  installCommand: string;
  uninstallCommand: string;
  silentParameters: string;
}): Promise<string> => {
  const response = await api.post('/script/generate', params);
  return response.data.scriptContent;
}; 