import React, { useState, useEffect, useRef } from 'react';
import useDatabaseManagerActionsModel from './useDatabaseManagerActionsModel.js';
import useDatabaseManagerFoundationModel from './useDatabaseManagerFoundationModel.js';
import useWorkspaceViewModel from './useWorkspaceViewModel.js';

export default function useDatabaseManagerScreenModel() {
  const foundationModel = useDatabaseManagerFoundationModel();
  const { workspaceInputs, loginScreenProps } = useDatabaseManagerActionsModel(foundationModel);

  const [showLoading, setShowLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const loadingStartedRef = useRef(null);

  const rawIsLoading =
    foundationModel.workspace.isConnecting ||
    foundationModel.workspace.isRefreshing ||
    foundationModel.workspace.isQueryRunning;

  // Finalize initial load state
  useEffect(() => {
    if (!foundationModel.workspace.isInitializing && !rawIsLoading && isInitialLoad) {
      const timer = setTimeout(() => {
        setIsInitialLoad(false);
      }, 500); // Small buffer to ensure first render is complete
      return () => clearTimeout(timer);
    }
  }, [foundationModel.workspace.isInitializing, rawIsLoading, isInitialLoad]);

  useEffect(() => {
    if (rawIsLoading) {
      if (!showLoading) {
        setShowLoading(true);
        loadingStartedRef.current = Date.now();
      }
    } else {
      if (showLoading) {
        const elapsed = Date.now() - (loadingStartedRef.current || 0);
        const remaining = Math.max(0, 1000 - elapsed);

        const timer = setTimeout(() => {
          setShowLoading(false);
        }, remaining);

        return () => clearTimeout(timer);
      }
    }
  }, [rawIsLoading, showLoading]);

  const workspaceViewModel = useWorkspaceViewModel({
    tc: foundationModel.tc,
    theme: foundationModel.workspace.theme,
    layoutInputs: workspaceInputs,
    mainPanelInputs: workspaceInputs,
    overlaysInputs: workspaceInputs,
    isLoading: isInitialLoad ? showLoading : false,
  });

  return {
    isConnected: foundationModel.workspace.isConnected,
    isInitializing: foundationModel.workspace.isInitializing,
    workspaceViewModel,
    loginScreenProps,
  };
}
