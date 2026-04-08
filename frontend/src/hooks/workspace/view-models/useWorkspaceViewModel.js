import useWorkspaceLayoutViewModel from './useWorkspaceLayoutViewModel.js';
import useWorkspaceMainPanelViewModel from './useWorkspaceMainPanelViewModel.js';
import useWorkspaceOverlaysViewModel from './useWorkspaceOverlaysViewModel.js';

export default function useWorkspaceViewModel(params) {
  const { tc, theme, layoutInputs, mainPanelInputs, overlaysInputs, isLoading } = params;
  const layoutParts = useWorkspaceLayoutViewModel(layoutInputs);
  const mainPanel = useWorkspaceMainPanelViewModel(mainPanelInputs);
  const overlays = useWorkspaceOverlaysViewModel(overlaysInputs);

  return {
    tc,
    theme,
    isLoading,
    layout: {
      ...layoutParts,
      mainPanel,
    },
    overlays,
  };
}
