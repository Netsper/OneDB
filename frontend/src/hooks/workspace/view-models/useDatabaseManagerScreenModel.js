import useDatabaseManagerActionsModel from './useDatabaseManagerActionsModel.js';
import useDatabaseManagerFoundationModel from './useDatabaseManagerFoundationModel.js';
import useWorkspaceViewModel from './useWorkspaceViewModel.js';

export default function useDatabaseManagerScreenModel() {
  const foundationModel = useDatabaseManagerFoundationModel();
  const { workspaceInputs, loginScreenProps } = useDatabaseManagerActionsModel(foundationModel);

  const workspaceViewModel = useWorkspaceViewModel({
    tc: foundationModel.tc,
    layoutInputs: workspaceInputs,
    mainPanelInputs: workspaceInputs,
    overlaysInputs: workspaceInputs,
  });

  return {
    isConnected: foundationModel.workspace.isConnected,
    workspaceViewModel,
    loginScreenProps,
  };
}
