import React, { useEffect } from 'react';
import LoginScreen from './components/auth/LoginScreen.jsx';
import ConnectedWorkspace from './components/workspace/ConnectedWorkspace.jsx';
import useDatabaseManagerScreenModel from './hooks/workspace/view-models/useDatabaseManagerScreenModel.js';

export default function DatabaseManager() {
  const { isConnected, workspaceViewModel, loginScreenProps, density } =
    useDatabaseManagerScreenModel();

  useEffect(() => {
    const root = document.documentElement;
    const normalizedDensity = density === 'compact' ? 'compact' : 'comfortable';
    root.setAttribute('data-onedb-density', normalizedDensity);
    return () => {
      root.removeAttribute('data-onedb-density');
    };
  }, [density]);

  // Render login screen until an active DB session is established.
  if (!isConnected) {
    return <LoginScreen {...loginScreenProps} />;
  }

  // Render main workspace once connected.
  return <ConnectedWorkspace viewModel={workspaceViewModel} />;
}
