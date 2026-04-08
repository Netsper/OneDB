import React from 'react';
import LoginScreen from './components/auth/LoginScreen.jsx';
import ConnectedWorkspace from './components/workspace/ConnectedWorkspace.jsx';
import useDatabaseManagerScreenModel from './hooks/workspace/view-models/useDatabaseManagerScreenModel.js';

export default function DatabaseManager() {
  const { isConnected, isInitializing, workspaceViewModel, loginScreenProps } = useDatabaseManagerScreenModel();

  // Show a splash screen while restoring session or checking URL params.
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#1c1c1c] flex flex-col items-center justify-center font-sans text-zinc-400">
        <div className="flex flex-col items-center animate-pulse">
           <div className="w-16 h-16 bg-[#232323] border border-[#333] rounded-2xl flex items-center justify-center mb-6 shadow-2xl">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
           </div>
           <div className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
             One<span className="text-emerald-500">DB</span>
           </div>
           <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 mt-2 font-medium">
             Initializing...
           </div>
        </div>
      </div>
    );
  }

  // Render login screen until an active DB session is established.
  if (!isConnected) {
    return <LoginScreen {...loginScreenProps} />;
  }

  // Render main workspace once connected.
  return <ConnectedWorkspace viewModel={workspaceViewModel} />;
}
