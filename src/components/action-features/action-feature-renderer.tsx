"use client";

import { useEffect } from "react";

import { ContactPersonCreateFeature } from "@/components/action-features/contact-person-create-feature";
import { useLocale } from "@/providers/locale-provider";
import type {
  ActionFeatureExecution,
  AvailableActionFeature,
} from "@/types/action-feature";

const renderers = {
  "contact_person.create": ContactPersonCreateFeature,
} as const;

const copy = {
  ru: {
    unavailable: "Эта возможность пока недоступна в интерфейсе.",
    history: "История возможностей",
    executed: "Выполнено",
  },
  en: {
    unavailable: "This feature is not available in the interface yet.",
    history: "Feature history",
    executed: "Executed",
  },
} as const;

type Props = {
  actionInstanceId: string;
  executionNo: number;
  csrfToken: string;
  workflowInstanceId: string;
  features: AvailableActionFeature[];
  executions: ActionFeatureExecution[];
};

export function ActionFeatureRenderer(props: Props) {
  const { locale } = useLocale();
  const unknown = props.features.filter(
    (feature) => !Object.prototype.hasOwnProperty.call(renderers, feature.code),
  );
  const unknownCodes = unknown.map((feature) => feature.code).join(",");

  useEffect(() => {
    for (const code of unknownCodes ? unknownCodes.split(",") : [])
      console.warn(`Unsupported action feature: ${code}`);
  }, [unknownCodes]);

  return (
    <div className="space-y-3">
      {props.executions.length ? (
        <section className="space-y-2 border-t pt-3">
          <h4 className="text-muted-foreground text-xs font-medium">
            {copy[locale].history}
          </h4>
          {props.executions.map((execution) => (
            <div
              className="bg-secondary rounded-lg p-3 text-sm"
              key={execution.id}
            >
              <p className="font-medium">
                {execution.target.data.full_name
                  ? String(execution.target.data.full_name)
                  : execution.feature_code}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {copy[locale].executed}:{" "}
                {new Date(execution.performed_at).toLocaleString(locale)}
                {execution.performed_by
                  ? ` · ${execution.performed_by.full_name}`
                  : ""}
              </p>
            </div>
          ))}
        </section>
      ) : null}
      {props.features.map((feature) => {
        const Renderer = renderers[feature.code as keyof typeof renderers];
        if (!Renderer)
          return (
            <p
              className="text-muted-foreground border-t pt-3 text-sm"
              key={feature.code}
            >
              {copy[locale].unavailable}
            </p>
          );
        return (
          <Renderer
            actionInstanceId={props.actionInstanceId}
            csrfToken={props.csrfToken}
            executionNo={props.executionNo}
            key={`${props.actionInstanceId}-${props.executionNo}-${feature.code}`}
            workflowInstanceId={props.workflowInstanceId}
          />
        );
      })}
    </div>
  );
}
