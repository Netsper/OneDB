import React from 'react';
import AppSidebar from './AppSidebar.jsx';
import CommandPalette from './CommandPalette.jsx';
import WorkspaceHeaderBar from './WorkspaceHeaderBar.jsx';
import WorkspaceStatusBar from './WorkspaceStatusBar.jsx';
import WorkspaceMainPanel from './WorkspaceMainPanel.jsx';

export default function WorkspaceLayout({ sidebar, header, mainPanel, statusBar, commandPalette }) {
  return (
    <>
      <div className="flex-1 flex overflow-hidden relative">
        <AppSidebar {...sidebar} />

        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#18181b]">
          <WorkspaceHeaderBar {...header} />
          <WorkspaceMainPanel {...mainPanel} />
        </div>
      </div>

      <WorkspaceStatusBar {...statusBar} />
      <CommandPalette {...commandPalette} />
    </>
  );
}
