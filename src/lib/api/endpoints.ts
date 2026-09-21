export const apiEndpoints = {
  catalog: {
    b2cClients: {
      list: "/api/catalog/b2c-clients/",
    },
    directions: {
      list: "/api/catalog/directions/",
    },
    products: {
      list: "/api/catalog/products/",
    },
    programs: {
      list: "/api/catalog/programs/",
    },
    universities: {
      detail: (id: string) => `/api/catalog/universities/${id}/`,
      list: "/api/catalog/universities/",
      map: "/api/catalog/universities/map/",
    },
  },
  interactions: {
    interactionDirections: {
      list: "/api/interactions/interaction-directions/",
    },
    interactionProducts: {
      list: "/api/interactions/interaction-products/",
    },
    interactionPrograms: {
      list: "/api/interactions/interaction-programs/",
    },
    interactions: {
      assignResponsible: (id: string) =>
        `/api/interactions/interactions/${id}/assign-responsible/`,
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
  users: {
    list: "/api/users/",
  },
  workflows: {
    workflows: {
      list: "/api/workflows/workflows/",
    },
  },
} as const;
