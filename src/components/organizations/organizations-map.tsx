"use client";

import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { setWorkerUrl, type GeoJSONSource } from "maplibre-gl";
import Map, {
  AttributionControl,
  Layer,
  NavigationControl,
  Source,
  type CircleLayerSpecification,
  type MapMouseEvent,
  type MapRef,
  type StyleSpecification,
  type SymbolLayerSpecification,
} from "react-map-gl/maplibre";

import styles from "@/components/organizations/organizations-map.module.css";
import { useLocale } from "@/providers/locale-provider";
import type { OrganizationMapPoint } from "@/types/organization";

type OrganizationsMapProps = {
  organizations: OrganizationMapPoint[];
  onSelect: (organizationId: string | null) => void;
  selectedId: string | null;
};

type PointFeature = {
  type: "Feature";
  properties: { has_interactions: boolean; id: string };
  geometry: { type: "Point"; coordinates: [number, number] };
};

type PointsGeoJson = {
  type: "FeatureCollection";
  features: PointFeature[];
};

const defaultTileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const pointsSourceId = "organizations";
const clustersLayerId = "organization-clusters";
const clusterCountLayerId = "organization-cluster-count";
const pointsLayerId = "organization-points";

const initialViewState = {
  latitude: 61,
  longitude: 70,
  zoom: 2.5,
};

/**
 * Вуз, по которому идёт работа, красится акцентным цветом, остальные —
 * нейтральным. Оранжевый остаётся за обводкой выбранной метки, иначе выбор
 * смешался бы с признаком.
 */
const pointColors = {
  dark: { neutral: "#7c879b", withInteractions: "#a866ff" },
  light: { neutral: "#64748b", withInteractions: "#7700ff" },
};

setWorkerUrl(
  new URL(
    "maplibre-gl/dist/maplibre-gl-worker.mjs",
    import.meta.url,
  ).toString(),
);
// The worker imports this sibling module by its original filename. Referencing
// it here makes Next.js emit both runtime files together.
void new URL(
  "maplibre-gl/dist/maplibre-gl-shared.mjs",
  import.meta.url,
).toString();

const clusterCountLayer: SymbolLayerSpecification = {
  id: clusterCountLayerId,
  type: "symbol",
  source: pointsSourceId,
  filter: ["has", "point_count"],
  layout: {
    "text-field": ["get", "point_count_abbreviated"],
    "text-size": 12,
  },
  paint: {
    "text-color": "#ffffff",
  },
};

function getCoordinates(feature: { geometry: unknown }) {
  return (feature.geometry as PointFeature["geometry"]).coordinates;
}

export function OrganizationsMap({
  organizations,
  onSelect,
  selectedId,
}: OrganizationsMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [isReady, setIsReady] = useState(false);
  const [cursor, setCursor] = useState<"grab" | "pointer">("grab");
  const { locale } = useLocale();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const palette = isDark ? pointColors.dark : pointColors.light;

  const mapStyle = useMemo<StyleSpecification>(
    () => ({
      version: 8,
      sources: {
        "base-map": {
          type: "raster",
          tiles: [
            process.env.NEXT_PUBLIC_MAP_TILE_URL?.trim() || defaultTileUrl,
          ],
          tileSize: 256,
          maxzoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
        },
      },
      layers: [
        {
          id: "base-map",
          type: "raster",
          source: "base-map",
          paint: isDark
            ? {
                "raster-brightness-max": 0.68,
                "raster-contrast": 0.12,
                "raster-saturation": -0.28,
              }
            : {},
        },
      ],
    }),
    [isDark],
  );

  const points = useMemo<PointsGeoJson>(
    () => ({
      type: "FeatureCollection",
      features: organizations.flatMap((organization) => {
        const latitude = Number(organization.lat);
        const longitude = Number(organization.lon);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude))
          return [];

        return [
          {
            type: "Feature" as const,
            properties: {
              has_interactions: Boolean(organization.has_interactions),
              id: organization.id,
            },
            geometry: {
              type: "Point" as const,
              coordinates: [longitude, latitude] as [number, number],
            },
          },
        ];
      }),
    }),
    [organizations],
  );

  const clustersLayer = useMemo<CircleLayerSpecification>(
    () => ({
      id: clustersLayerId,
      type: "circle",
      source: pointsSourceId,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": isDark ? "#a866ff" : "#7700ff",
        "circle-radius": ["step", ["get", "point_count"], 18, 20, 23, 100, 28],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    }),
    [isDark],
  );

  const pointsLayer = useMemo<CircleLayerSpecification>(
    () => ({
      id: pointsLayerId,
      type: "circle",
      source: pointsSourceId,
      filter: ["!", ["has", "point_count"]],
      paint: {
        // Сравнение, а не просто `get`: условие в `case` должно быть boolean,
        // а `get` для валидатора выражений возвращает `value`.
        "circle-color": [
          "case",
          ["==", ["get", "has_interactions"], true],
          palette.withInteractions,
          palette.neutral,
        ],
        "circle-radius": 10,
        "circle-stroke-color": [
          "case",
          ["==", ["get", "id"], selectedId ?? ""],
          isDark ? "#ff8054" : "#ff4f12",
          "#ffffff",
        ],
        "circle-stroke-width": [
          "case",
          ["==", ["get", "id"], selectedId ?? ""],
          5,
          3,
        ],
      },
    }),
    [palette, selectedId, isDark],
  );

  useEffect(() => {
    if (!isReady || points.features.length === 0) return;

    if (points.features.length === 1) {
      const [longitude, latitude] = points.features[0].geometry.coordinates;
      mapRef.current?.flyTo({
        center: [longitude, latitude],
        duration: 500,
        zoom: 8,
      });
      return;
    }

    const longitudes = points.features.map(
      (feature) => feature.geometry.coordinates[0],
    );
    const latitudes = points.features.map(
      (feature) => feature.geometry.coordinates[1],
    );
    mapRef.current?.fitBounds(
      [
        [Math.min(...longitudes), Math.min(...latitudes)],
        [Math.max(...longitudes), Math.max(...latitudes)],
      ],
      { duration: 500, maxZoom: 6, padding: 52 },
    );
  }, [isReady, points]);

  const handleClick = useCallback(
    (event: MapMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) {
        onSelect(null);
        return;
      }

      const [longitude, latitude] = getCoordinates(feature);
      if (feature.layer.id === clustersLayerId) {
        const clusterId = Number(feature.properties?.cluster_id);
        const source = mapRef.current?.getSource(
          pointsSourceId,
        ) as GeoJSONSource | null;
        if (!source || !Number.isFinite(clusterId)) return;

        void source.getClusterExpansionZoom(clusterId).then((zoom) => {
          mapRef.current?.easeTo({ center: [longitude, latitude], zoom });
        });
        return;
      }

      const organizationId = String(feature.properties?.id ?? "");
      if (!organizationId) return;
      onSelect(organizationId);
      mapRef.current?.flyTo({
        center: [longitude, latitude],
        duration: 500,
        zoom: Math.max(mapRef.current.getZoom(), 8),
      });
    },
    [onSelect],
  );

  const loadingText = locale === "ru" ? "Загружаем карту…" : "Loading map…";
  const legend =
    locale === "ru"
      ? {
          title: "Взаимодействия",
          withInteractions: "есть",
          without: "нет",
        }
      : { title: "Interactions", withInteractions: "yes", without: "no" };
  return (
    <section
      aria-busy={!isReady}
      aria-label={locale === "ru" ? "Карта организаций" : "Organization map"}
      className={`${styles.root} relative border shadow-sm`}
      data-points-count={points.features.length}
    >
      {!isReady ? (
        <div className="text-muted-foreground bg-card absolute inset-0 z-10 flex items-center justify-center text-sm">
          {loadingText}
        </div>
      ) : null}
      <Map
        attributionControl={false}
        cursor={cursor}
        initialViewState={initialViewState}
        interactiveLayerIds={[clustersLayerId, pointsLayerId]}
        mapStyle={mapStyle}
        maxZoom={19}
        onClick={handleClick}
        onLoad={() => setIsReady(true)}
        onMouseEnter={() => setCursor("pointer")}
        onMouseLeave={() => setCursor("grab")}
        onStyleData={() => setIsReady(true)}
        ref={mapRef}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <AttributionControl compact position="bottom-right" />
        <Source
          cluster
          clusterMaxZoom={14}
          clusterRadius={58}
          data={points}
          id={pointsSourceId}
          type="geojson"
        >
          <Layer {...clustersLayer} />
          <Layer {...clusterCountLayer} />
          <Layer {...pointsLayer} />
        </Source>
      </Map>

      {isReady ? (
        <dl className="bg-card/90 text-muted-foreground absolute bottom-3 left-3 z-10 rounded-lg border px-3 py-2 text-xs shadow-sm backdrop-blur-sm">
          <dt className="text-foreground mb-1 font-medium">{legend.title}</dt>
          <dd className="flex items-center gap-4">
            {(
              [
                [palette.withInteractions, legend.withInteractions],
                [palette.neutral, legend.without],
              ] as const
            ).map(([color, label]) => (
              <span className="flex items-center gap-1.5" key={label}>
                <span
                  aria-hidden="true"
                  className="size-2.5 rounded-full"
                  style={{ background: color }}
                />
                {label}
              </span>
            ))}
          </dd>
        </dl>
      ) : null}
    </section>
  );
}
