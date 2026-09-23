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
  reports: {
    exports: {
      detail: (id: string) => `/api/reports/exports/${id}/`,
      download: (id: string) => `/api/reports/exports/${id}/download/`,
    },
    interactions: {
      exports: "/api/reports/interactions/exports/",
      preview: "/api/reports/interactions/preview/",
      summary: "/api/reports/interactions/summary/",
    },
  },
  users: {
    list: "/api/users/",
  },
  workflows: {
    workflows: {
      create: "/api/workflows/workflows/",
      definition: (id: string) => `/api/workflows/workflows/${id}/definition/`,
      detail: (id: string) => `/api/workflows/workflows/${id}/`,
      list: "/api/workflows/workflows/",
      publish: (id: string) => `/api/workflows/workflows/${id}/publish/`,
      unpublish: (id: string) => `/api/workflows/workflows/${id}/unpublish/`,
      validate: (id: string) => `/api/workflows/workflows/${id}/validate/`,
    },
    stages: {
      create: "/api/workflows/workflow-stages/",
    },
    stageTransitions: {
      create: "/api/workflows/stage-transitions/",
    },
    actions: {
      create: "/api/workflows/workflow-actions/",
    },
  },
} as const;
