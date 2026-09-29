/** Адрес организации — публичный; координаты нужны для карты и указываются вместе. */
export type OrganizationAddress = {
  country_code: string;
  region: string;
  city: string;
  street: string;
  house: string;
  office: string;
  postal_code: string;
  lat: string | null;
  lon: string | null;
};

/** Открытая часть адреса B2C-клиента: видна всем, кому доступен каталог. */
export type B2CClientOpenAddress = {
  country_code: string;
  region: string;
  city: string;
};

/**
 * Адрес регистрации B2C-клиента целиком. Улица, дом, квартира и индекс —
 * персональные данные: их отдаёт и принимает только отдельный эндпоинт по
 * праву `catalog.personal_data.*`, каждое обращение пишется в журнал.
 */
export type B2CClientRegistrationAddress = B2CClientOpenAddress & {
  street: string;
  house: string;
  apartment: string;
  postal_code: string;
};

export type WriteB2CClientRegistrationAddress = Pick<
  B2CClientRegistrationAddress,
  "street" | "house" | "apartment" | "postal_code"
>;
