export const apiEndpoints = {
  catalog: {
    universities: {
      detail: (id: string) => `/api/catalog/universities/${id}/`,
      list: "/api/catalog/universities/",
      map: "/api/catalog/universities/map/",
    },
  },
} as const;
