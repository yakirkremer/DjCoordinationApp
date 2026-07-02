export const CLIENT_STAGE_IDS = ["form", "catalog", "contract"];

export const DEFAULT_CLIENT_STAGES = {
  form: true,
  catalog: true,
  contract: true,
};

export const CLIENT_STAGE_LABELS = {
  form: "טופס",
  catalog: "קטלוג",
  contract: "חוזה",
};

/** Maps client screens to the stage that must be enabled to view them. */
export const CLIENT_SCREEN_STAGE = {
  wizard: "form",
  browse: "catalog",
  contract: "contract",
};

export function getClientStages(client) {
  const stored = client?.stages;
  return {
    form: stored?.form !== false,
    catalog: stored?.catalog !== false,
    contract: stored?.contract !== false,
  };
}

export function isClientStageEnabled(client, stageId) {
  return getClientStages(client)[stageId];
}
