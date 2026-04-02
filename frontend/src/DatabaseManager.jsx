import React from 'react';
import LoginScreen from './components/auth/LoginScreen.jsx';
import ConnectedWorkspace from './components/workspace/ConnectedWorkspace.jsx';
import useDatabaseManagerScreenModel from './hooks/workspace/view-models/useDatabaseManagerScreenModel.js';

export default function DatabaseManager() {
  const { isConnected, workspaceViewModel, loginScreenProps } = useDatabaseManagerScreenModel();

  // --- GİRİŞ EKRANI ---
  if (!isConnected) {
    return <LoginScreen {...loginScreenProps} />;
  }

  // --- ANA YAPI (WRAPPER) ---
  return <ConnectedWorkspace viewModel={workspaceViewModel} />;
}
