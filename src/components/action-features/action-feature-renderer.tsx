"use client";

import { useEffect } from "react";
import type { ComponentType } from "react";

import { ContactPersonCreateFeature } from "@/components/action-features/contact-person-create-feature";
import { ContractCreateFeature } from "@/components/action-features/contract-create-feature";
import { useLocale } from "@/providers/locale-provider";
import type {
  ActionFeatureCode,
  ActionFeatureExecution,
  AvailableActionFeature,
} from "@/types/action-feature";
import type { InteractionShort } from "@/types/workflow-board";
import { ContactPersonSelectFeature } from "@/components/action-features/contact-person-select-feature";

export type ActionFeatureRendererProps = {
  actionInstanceId: string;
  executionNo: number;
  csrfToken: string;
  workflowInstanceId: string;
  features?: AvailableActionFeature[];
  executions: ActionFeatureExecution[];
  interaction?: InteractionShort;
  featureCode?: ActionFeatureCode;
};

export type ActionFeatureDefinition = {
  code: ActionFeatureCode;
  Component: ComponentType<ActionFeatureRendererProps>;
};

export const actionFeatureDefinitions: Record<string, ActionFeatureDefinition> =
  {
    "contact_person.create": {
      code: "contact_person.create",
      Component: ContactPersonCreateFeature,
    },
    "contact_person.select": {
      code: "contact_person.select",
      Component: ContactPersonSelectFeature,
    },
    "contact_person.link": {
      code: "contact_person.link",
      Component: ContactPersonSelectFeature,
    },
    "contract.create": {
      code: "contract.create",
      Component: ContractCreateFeature,
    },
  };

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
  interaction?: InteractionShort;
};

export function ActionFeatureRenderer(props: Props) {
  const { locale } = useLocale();
  const hasContactLink = props.features.some(
    (feature) => feature.code === "contact_person.link",
  );
  const visibleFeatures = hasContactLink
    ? props.features.filter(
        (feature) => feature.code !== "contact_person.select",
      )
    : props.features;
  const unknown = visibleFeatures.filter(
    (feature) =>
      !Object.prototype.hasOwnProperty.call(
        actionFeatureDefinitions,
        feature.code,
      ),
  );
  const unknownCodes = unknown.map((feature) => feature.code).join(",");

  useEffect(() => {
    for (const code of unknownCodes ? unknownCodes.split(",") : [])
      console.warn(`Unsupported action feature: ${code}`);
  }, [unknownCodes]);

  return (
    <div className="space-y-3">
      {visibleFeatures.map((feature) => {
        const Renderer = actionFeatureDefinitions[feature.code]?.Component;
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
            executions={props.executions}
            featureCode={feature.code as ActionFeatureCode}
            key={`${props.actionInstanceId}-${props.executionNo}-${feature.code}`}
            workflowInstanceId={props.workflowInstanceId}
            interaction={props.interaction}
          />
        );
      })}
    </div>
  );
}

function executionTitle(execution: ActionFeatureExecution) {
  const { full_name: fullName, contract_number: contractNumber } =
    execution.target.data;
  if (fullName) return String(fullName);
  if (contractNumber) return String(contractNumber);
  return execution.feature_code;
}

export function FeatureExecutionHistory({
  executions,
}: Pick<Props, "executions">) {
  const { locale } = useLocale();
  const text = copy[locale];

  if (executions.length === 0) return null;

  return (
    <details className="border-t pt-3">
      <summary className="text-muted-foreground cursor-pointer text-xs font-medium">
        {text.history} ({executions.length})
      </summary>
      <div className="mt-2 space-y-2">
        {executions.map((execution) => (
          <div
            className="bg-secondary rounded-lg p-3 text-sm"
            key={execution.id}
          >
            <p className="font-medium">{executionTitle(execution)}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {text.executed}:{" "}
              {new Date(execution.performed_at).toLocaleString(locale)}
              {execution.performed_by
                ? ` · ${execution.performed_by.full_name}`
                : ""}
            </p>
          </div>
        ))}
      </div>
    </details>
  );
}
