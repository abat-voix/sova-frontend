export const apiEndpoints = {
  integrations: {
    entities: "/api/integrations/v1/metadata/entities/",
    systems: "/api/integrations/v1/systems/",
    mappings: {
      list: "/api/integrations/v1/mappings/",
      detail: (id: string) => `/api/integrations/v1/mappings/${id}/`,
      preview: "/api/integrations/v1/mappings/preview/",
    },
  },
  catalog: {
    b2cClients: {
      detail: (id: string) => `/api/catalog/b2c-clients/${id}/`,
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
    vendors: {
      detail: (id: string) => `/api/catalog/vendors/${id}/`,
      list: "/api/catalog/vendors/",
    },
  },
  interactions: {
    contractFiles: {
      download: (id: string) =>
        `/api/interactions/contract-files/${id}/download/`,
      list: "/api/interactions/contract-files/",
    },
    contracts: {
      detail: (id: string) => `/api/interactions/contracts/${id}/`,
      download: (id: string) => `/api/interactions/contracts/${id}/download/`,
      list: "/api/interactions/contracts/",
    },
    licenses: {
      detail: (id: string) => `/api/interactions/licenses/${id}/`,
      list: "/api/interactions/licenses/",
    },
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
      chat: (id: string) => `/api/interactions/interactions/${id}/chat/`,
      chatParticipants: (id: string) =>
        `/api/interactions/interactions/${id}/chat/participants/`,
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
  messaging: {
    attachments: {
      list: "/api/messaging/attachments/",
      detail: (id: string) => `/api/messaging/attachments/${id}/`,
      download: (id: string) => `/api/messaging/attachments/${id}/download/`,
    },
    conversations: {
      detail: (id: string) => `/api/messaging/conversations/${id}/`,
      direct: "/api/messaging/conversations/direct/",
      list: "/api/messaging/conversations/",
      recipients: "/api/messaging/conversations/recipients/",
      messages: (id: string) => `/api/messaging/conversations/${id}/messages/`,
      read: (id: string) => `/api/messaging/conversations/${id}/read/`,
      unreadCount: "/api/messaging/conversations/unread-count/",
    },
  },
  notifications: {
    inbox: {
      detail: (id: string) => `/api/notifications/inbox/${id}/`,
      kinds: "/api/notifications/inbox/kinds/",
      list: "/api/notifications/inbox/",
      read: (id: string) => `/api/notifications/inbox/${id}/read/`,
      readAll: "/api/notifications/inbox/read-all/",
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
      featureInitial: (id: string, code: string) =>
        `/api/processes/action-instances/${id}/features/${encodeURIComponent(code)}/initial/`,
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
    actionDependencies: {
      create: "/api/workflows/action-dependencies/",
      detail: (id: string) => `/api/workflows/action-dependencies/${id}/`,
    },
    actionFeatures: {
      create: "/api/workflows/action-features/",
      detail: (id: string) => `/api/workflows/action-features/${id}/`,
    },
    actionOutcomes: {
      create: "/api/workflows/action-outcomes/",
      detail: (id: string) => `/api/workflows/action-outcomes/${id}/`,
    },
    actionTransitions: {
      create: "/api/workflows/action-transitions/",
      detail: (id: string) => `/api/workflows/action-transitions/${id}/`,
    },
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
      detail: (id: string) => `/api/workflows/workflow-stages/${id}/`,
    },
    stageTransitions: {
      create: "/api/workflows/stage-transitions/",
      detail: (id: string) => `/api/workflows/stage-transitions/${id}/`,
    },
    actions: {
      create: "/api/workflows/workflow-actions/",
      detail: (id: string) => `/api/workflows/workflow-actions/${id}/`,
    },
  },
} as const;
