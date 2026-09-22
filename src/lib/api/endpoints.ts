export const apiEndpoints = {
  catalog: {
    b2cClients: {
      list: "/api/catalog/b2c-clients/",
    },
    contactPersons: {
      detail: (id: string) => `/api/catalog/contact-persons/${id}/`,
      list: "/api/catalog/contact-persons/",
    },
    directions: {
      detail: (id: string) => `/api/catalog/directions/${id}/`,
      list: "/api/catalog/directions/",
    },
    products: {
      detail: (id: string) => `/api/catalog/products/${id}/`,
      list: "/api/catalog/products/",
    },
    programs: {
      detail: (id: string) => `/api/catalog/programs/${id}/`,
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
      contacts: (id: string) =>
        `/api/interactions/interactions/${id}/contacts/`,
      contact: (id: string, contactId: string) =>
        `/api/interactions/interactions/${id}/contacts/${contactId}/`,
      detail: (id: string) => `/api/interactions/interactions/${id}/`,
      list: "/api/interactions/interactions/",
      unassignResponsible: (id: string) =>
        `/api/interactions/interactions/${id}/unassign-responsible/`,
    },
  },
  processes: {
    actionAttachments: {
      list: "/api/processes/action-attachments/",
    },
    actionInstances: {
      cancel: (id: string) => `/api/processes/action-instances/${id}/cancel/`,
      complete: (id: string) =>
        `/api/processes/action-instances/${id}/complete/`,
      executeFeature: (id: string, code: string) =>
        `/api/processes/action-instances/${id}/features/${encodeURIComponent(code)}/execute/`,
      list: "/api/processes/action-instances/",
    },
    actionRollbacks: {
      list: "/api/processes/action-rollbacks/",
    },
    stageInstances: {
      cancel: (id: string) => `/api/processes/stage-instances/${id}/cancel/`,
    },
    stageRollbacks: {
      list: "/api/processes/stage-rollbacks/",
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
