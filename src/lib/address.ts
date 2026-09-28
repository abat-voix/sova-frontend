import type { OrganizationAddress } from "@/types/address";
import type { Organization } from "@/types/organization";

type AddressParts = Partial<
  Pick<
    OrganizationAddress,
    "postal_code" | "region" | "city" | "street" | "house" | "office"
  >
> & { apartment?: string };

/** Адрес одной строкой: индекс, регион, город, улица, дом, помещение. */
export function formatAddress(address: AddressParts | null | undefined) {
  if (!address) return "";

  return [
    address.postal_code,
    address.region,
    address.city,
    address.street,
    address.house,
    address.office,
    address.apartment,
  ]
    .filter(Boolean)
    .join(", ");
}

/** Город организации: по фактическому адресу, иначе по юридическому. */
export function organizationCity(organization: Organization) {
  return (
    organization.actual_address?.city || organization.legal_address?.city || ""
  );
}

/**
 * Координаты из одной строки, как их копируют Яндекс Карты и Google Maps:
 * `55.752040, 37.617810`. Пустая строка — координат нет (`null`),
 * неразборчивая или вне диапазона — `undefined`.
 */
export function parseCoordinates(
  value: string,
): { lat: string; lon: string } | null | undefined {
  const text = value.trim();
  if (!text) return null;

  const match = text.match(/^(-?\d+(?:[.,]\d+)?)[\s,;]+(-?\d+(?:[.,]\d+)?)$/);
  if (!match) return undefined;

  const [lat, lon] = [match[1], match[2]].map((part) =>
    Number(part.replace(",", ".")),
  );
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return undefined;

  return { lat: lat.toFixed(6), lon: lon.toFixed(6) };
}

/** Координаты адреса одной строкой для поля ввода. */
export function formatCoordinates(
  address: Pick<OrganizationAddress, "lat" | "lon"> | null | undefined,
) {
  return address?.lat && address.lon ? `${address.lat}, ${address.lon}` : "";
}
