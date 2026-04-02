import React from 'react';
import WorkspaceContextMenus from './WorkspaceContextMenus.jsx';
import RowFormDrawer from '../modals/RowFormDrawer.jsx';
import JsonViewerModal from '../modals/JsonViewerModal.jsx';
import DatabaseActionModals from '../modals/DatabaseActionModals.jsx';
import SettingsModal from '../modals/SettingsModal.jsx';
import ShortcutsModal from '../modals/ShortcutsModal.jsx';
import ToastStack from '../shared/ToastStack.jsx';

export default function WorkspaceOverlays({
  contextMenus,
  rowFormDrawer,
  jsonViewerModal,
  databaseActionModals,
  settingsModal,
  shortcutsModal,
  toastStack,
}) {
  return (
    <>
      <WorkspaceContextMenus {...contextMenus} />
      <RowFormDrawer {...rowFormDrawer} />
      <JsonViewerModal {...jsonViewerModal} />
      <DatabaseActionModals {...databaseActionModals} />
      <SettingsModal {...settingsModal} />
      <ShortcutsModal {...shortcutsModal} />
      <ToastStack {...toastStack} />
    </>
  );
}
