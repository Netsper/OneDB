import React from 'react';
import WorkspaceLayout from './WorkspaceLayout.jsx';
import WorkspaceOverlays from './WorkspaceOverlays.jsx';

export default function ConnectedWorkspace({ viewModel }) {
  const { tc, theme, density, layout, overlays } = viewModel;

  return (
    <div
      data-theme={theme || 'emerald'}
      data-density={density === 'compact' ? 'compact' : 'comfortable'}
      className={`h-screen flex flex-col bg-[#18181b] text-zinc-300 font-sans overflow-hidden ${tc.selection}`}
    >
      <WorkspaceLayout
        sidebar={layout.sidebar}
        header={layout.header}
        mainPanel={layout.mainPanel}
        statusBar={layout.statusBar}
        commandPalette={layout.commandPalette}
      />
      <WorkspaceOverlays
        contextMenus={overlays.contextMenus}
        rowFormDrawer={overlays.rowFormDrawer}
        jsonViewerModal={overlays.jsonViewerModal}
        databaseActionModals={overlays.databaseActionModals}
        settingsModal={overlays.settingsModal}
        shortcutsModal={overlays.shortcutsModal}
        toastStack={overlays.toastStack}
      />
    </div>
  );
}
