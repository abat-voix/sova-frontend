"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";

import styles from "@/components/organizations/organizations-map.module.css";
import { useLocale } from "@/providers/locale-provider";
import type { UniversityMapPoint } from "@/types/university";

type OrganizationsMapProps = {
  organizations: UniversityMapPoint[];
  onSelect: (organizationId: string | null) => void;
  selectedId: string | null;
};

const defaultTileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const attributionPrefix =
  '<a href="https://leafletjs.com" title="A JavaScript library for interactive maps">Leaflet</a>';

type LeafletModule = typeof import("leaflet");

// leaflet и leaflet.markercluster публикуются как CJS: плагин дописывает
// markerClusterGroup в module.exports библиотеки. Turbopack отдаёт из
// `await import("leaflet")` снимок namespace-объекта, в котором этой мутации
// уже не видно, поэтому работаем с самим module.exports через `default`.
async function loadLeaflet() {
  const leafletModule = await import("leaflet");
  const L = ((leafletModule as { default?: LeafletModule }).default ??
    leafletModule) as LeafletModule;
  await import("leaflet.markercluster");
  return L;
}

export function OrganizationsMap({
  organizations,
  onSelect,
  selectedId,
}: OrganizationsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef(new Map<string, LeafletMarker>());
  const onSelectRef = useRef(onSelect);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const { locale } = useLocale();

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    let active = true;
    let map: LeafletMap | null = null;
    const markers = markersRef.current;

    async function initialize() {
      try {
        const L = await loadLeaflet();
        if (!active || !containerRef.current) return;

        map = L.map(containerRef.current, {
          attributionControl: true,
          zoomControl: false,
        });
        mapRef.current = map;
        map.attributionControl.setPrefix(attributionPrefix);
        L.control.zoom({ position: "topright" }).addTo(map);

        L.tileLayer(
          process.env.NEXT_PUBLIC_MAP_TILE_URL?.trim() || defaultTileUrl,
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
            maxZoom: 19,
          },
        ).addTo(map);

        const bounds = L.latLngBounds([]);
        const markerCluster = L.markerClusterGroup({
          chunkedLoading: true,
          maxClusterRadius: 58,
          showCoverageOnHover: false,
          spiderfyOnMaxZoom: true,
        }).addTo(map);

        organizations.forEach((organization) => {
          const latitude = Number(organization.lat);
          const longitude = Number(organization.lon);
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
          const markerLabel = `${locale === "ru" ? "Организация" : "Organization"} ${organization.id}`;

          const icon = L.divIcon({
            className: styles.marker,
            html: '<span aria-hidden="true"></span>',
            iconAnchor: [14, 14],
            iconSize: [28, 28],
          });
          const marker = L.marker([latitude, longitude], {
            icon,
            keyboard: true,
            title: markerLabel,
          }).addTo(markerCluster);

          marker.on("click", () => {
            onSelectRef.current(organization.id);
            map?.flyTo([latitude, longitude], Math.max(map.getZoom(), 8), {
              duration: 0.65,
            });
          });
          markers.set(organization.id, marker);
          bounds.extend([latitude, longitude]);
        });

        map.on("click", () => onSelectRef.current(null));
        if (bounds.isValid()) {
          map.fitBounds(bounds, { maxZoom: 6, padding: [52, 52] });
        }
        if (active) setState("ready");
      } catch {
        if (active) setState("error");
      }
    }

    void initialize();

    return () => {
      active = false;
      markers.clear();
      mapRef.current = null;
      map?.remove();
    };
  }, [locale, organizations]);

  useEffect(() => {
    markersRef.current.forEach((marker, organizationId) => {
      marker
        .getElement()
        ?.classList.toggle(
          styles.markerSelected,
          organizationId === selectedId,
        );
    });
  }, [selectedId, state]);

  const loadingText = locale === "ru" ? "Загружаем карту…" : "Loading map…";
  const errorText =
    locale === "ru"
      ? "Не удалось загрузить карту."
      : "The map could not be loaded.";

  return (
    <section
      aria-busy={state === "loading"}
      aria-label={locale === "ru" ? "Карта вузов" : "University map"}
      className={`${styles.root} relative border shadow-sm`}
    >
      {state !== "ready" ? (
        <div className="text-muted-foreground bg-card absolute inset-0 z-[500] flex items-center justify-center text-sm">
          {state === "error" ? errorText : loadingText}
        </div>
      ) : null}
      <div className="h-full min-h-[32rem] w-full" ref={containerRef} />
    </section>
  );
}
