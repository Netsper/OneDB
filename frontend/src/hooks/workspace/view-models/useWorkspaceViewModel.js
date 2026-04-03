import useWorkspaceLayoutViewModel from './useWorkspaceLayoutViewModel.js';
import useWorkspaceMainPanelViewModel from './useWorkspaceMainPanelViewModel.js';
import useWorkspaceOverlaysViewModel from './useWorkspaceOverlaysViewModel.js';

export default function useWorkspaceViewModel(params) {
  const { tc, theme, density, layoutInputs, mainPanelInputs, overlaysInputs } = params;
  const layoutParts = useWorkspaceLayoutViewModel(layoutInputs);
  const mainPanel = useWorkspaceMainPanelViewModel(mainPanelInputs);
  const overlays = useWorkspaceOverlaysViewModel(overlaysInputs);

  return {
    tc,
    theme,
    density,
    layout: {
      ...layoutParts,
      mainPanel,
    },
    overlays,
  };
}
