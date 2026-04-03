import React from 'react';
import LoginScreen from './components/auth/LoginScreen.jsx';
import ConnectedWorkspace from './components/workspace/ConnectedWorkspace.jsx';
import useDatabaseManagerScreenModel from './hooks/workspace/view-models/useDatabaseManagerScreenModel.js';

export default function DatabaseManager() {
  const { isConnected, workspaceViewModel, loginScreenProps } = useDatabaseManagerScreenModel();

  // Render login screen until an active DB session is established.
  if (!isConnected) {
    return <LoginScreen {...loginScreenProps} />;
  }

  // Render main workspace once connected.
  return <ConnectedWorkspace viewModel={workspaceViewModel} />;
}
