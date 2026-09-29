export type InteractionContact = {
  id: string;
  contact_person: {
    id: string;
    full_name: string;
    /** Должность у контрагента этого взаимодействия. */
    position: string;
    email: string;
    phone: string;
    telegram: string;
  };
  linked_at: string;
};
