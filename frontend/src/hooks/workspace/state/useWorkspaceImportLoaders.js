import { useCallback } from 'react';

let jsZipModulePromise;
let xlsxModulePromise;

export default function useWorkspaceImportLoaders() {
  const loadJsZip = useCallback(async () => {
    if (!jsZipModulePromise) {
      jsZipModulePromise = import('jszip');
    }
    const module = await jsZipModulePromise;
    return module.default;
  }, []);

  const loadXlsx = useCallback(async () => {
    if (!xlsxModulePromise) {
      xlsxModulePromise = import('xlsx');
    }
    return xlsxModulePromise;
  }, []);

  return {
    loadJsZip,
    loadXlsx,
  };
}
