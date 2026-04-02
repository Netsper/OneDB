import useDatabaseManagerApiRuntimeModel from './useDatabaseManagerApiRuntimeModel.js';
import useDatabaseManagerLoginModel from './useDatabaseManagerLoginModel.js';
import useDatabaseManagerWorkspaceActionsModel from './useDatabaseManagerWorkspaceActionsModel.js';

export default function useDatabaseManagerActionsModel(model) {
  const apiRuntimeModel = useDatabaseManagerApiRuntimeModel(model);
  const { loginScreenProps } = useDatabaseManagerLoginModel(model, apiRuntimeModel);
  const { workspaceInputs } = useDatabaseManagerWorkspaceActionsModel(model, apiRuntimeModel);

  return {
    workspaceInputs,
    loginScreenProps,
  };
}
