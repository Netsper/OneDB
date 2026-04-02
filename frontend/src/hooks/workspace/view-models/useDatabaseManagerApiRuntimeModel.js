import useOneDbApi from '../../api/useOneDbApi.js';
import useWorkspaceRuntimeEffects from '../state/useWorkspaceRuntimeEffects.js';

export default function useDatabaseManagerApiRuntimeModel(model) {
  const { workspace, currentDriver, escapeLiteral, t, showToast } = model;

  const apiModel = useOneDbApi({
    ...workspace,
    currentDriver,
    escapeLiteral,
  });

  const {
    callApi,
    ensureDatabaseTablesLoaded,
    loadTableDetails,
    refreshActiveTable,
    refreshPing,
    refreshDatabaseSize,
  } = apiModel;

  useWorkspaceRuntimeEffects({
    ...workspace,
    isConnected: workspace.isConnected,
    refreshActiveTable,
    refreshPing,
    connForm: workspace.connForm,
    refreshDatabaseSize,
    ensureDatabaseTablesLoaded,
    callApi,
    t,
    loadTableDetails,
    showToast,
  });

  return apiModel;
}
