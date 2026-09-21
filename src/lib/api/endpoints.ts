export const apiEndpoints = {
  catalog: {
    universities: {
      detail: (id: string) => `/api/catalog/universities/${id}/`,
      list: "/api/catalog/universities/",
      map: "/api/catalog/universities/map/",
    },
  },
  interactions: {
    interactions: {
      detail: (id: string) => `/api/interactions/interactions/${id}/`,
      list: "/api/interactions/interactions/",
    },
  },
  processes: {
    actionAttachments: {
      list: "/api/processes/action-attachments/",
    },
    actionInstances: {
      complete: (id: string) =>
        `/api/processes/action-instances/${id}/complete/`,
    },
    stageInstances: {
      cancel: (id: string) => `/api/processes/stage-instances/${id}/cancel/`,
    },
    workflowInstances: {
      board: (id: string) => `/api/processes/workflow-instances/${id}/board/`,
      list: "/api/processes/workflow-instances/",
    },
  },
} as const;
