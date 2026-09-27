import { apiEndpoints } from "@/lib/api/endpoints";
import {
  buildQuery,
  deleteJson,
  getJson,
  patchFormData,
  patchJson,
  postFormData,
} from "@/lib/api/http";
import type { PaginatedResponse } from "@/types/api";
import type { Contract, PatchedWriteContract } from "@/types/contract";
import type { ContractFile } from "@/types/contract-file";

export const contractsPageSize = 20;

export type ContractSignedFilter = "all" | "signed" | "unsigned";

export type ContractsQuery = {
  interactionId: string | null;
  ordering: string | null;
  page: number;
  search: string;
  signed: ContractSignedFilter;
  /** ГГГГ-ММ-ДД, включительно. */
  signedFrom: string;
  signedTo: string;
};

export function contractsQueryKey(params?: ContractsQuery) {
  return params
    ? (["interactions", "contracts", "list", params] as const)
    : (["interactions", "contracts"] as const);
}

export function contractQueryKey(id: string) {
  return ["interactions", "contracts", "detail", id] as const;
}

export function contractFilesQueryKey(contractId: string) {
  return ["interactions", "contract-files", contractId] as const;
}

export function interactionContractsQueryKey(interactionId: string) {
  return [
    "interactions",
    "contracts",
    "by-interaction",
    interactionId,
  ] as const;
}

export function getContracts({
  interactionId,
  ordering,
  page,
  search,
  signed,
  signedFrom,
  signedTo,
}: ContractsQuery) {
  const query = buildQuery({
    interaction__ids: interactionId ?? undefined,
    is_signed: signed === "all" ? undefined : String(signed === "signed"),
    ordering: ordering ?? undefined,
    page,
    page_size: contractsPageSize,
    search: search.trim(),
    signed_at__gte: signedFrom,
    signed_at__lte: signedTo,
  });

  return getJson<PaginatedResponse<Contract>>(
    `${apiEndpoints.interactions.contracts.list}?${query}`,
  );
}

/** Все договоры взаимодействия: последовательно собирает страницы API. */
export async function getInteractionContracts(interactionId: string) {
  const results: Contract[] = [];
  let page = 1;
  let response: PaginatedResponse<Contract>;

  do {
    const query = buildQuery({
      interaction__ids: interactionId,
      ordering: "-created_at",
      page,
      page_size: 200,
    });
    response = await getJson<PaginatedResponse<Contract>>(
      `${apiEndpoints.interactions.contracts.list}?${query}`,
    );
    results.push(...response.results);
    page += 1;
  } while (response.next && results.length < response.count);

  return { ...response, next: null, previous: null, results };
}

export function getContract(id: string) {
  return getJson<Contract>(apiEndpoints.interactions.contracts.detail(id));
}

export type CreateContractPayload = {
  contract_number: string;
  corrected_at: string;
  file: File | null;
  interaction: string;
  sent_at: string;
  signed_at: string;
};

/**
 * Договор создаётся multipart-запросом, чтобы файл ушёл вместе с полями.
 * Пустая дата уходит пустой строкой — DRF превращает её в `null`.
 */
export function createContract(
  payload: CreateContractPayload,
  csrfToken: string,
) {
  const body = new FormData();
  body.set("interaction", payload.interaction);
  body.set("contract_number", payload.contract_number);
  body.set("sent_at", payload.sent_at);
  body.set("corrected_at", payload.corrected_at);
  body.set("signed_at", payload.signed_at);
  if (payload.file) body.set("file", payload.file);

  return postFormData<Contract>(
    apiEndpoints.interactions.contracts.list,
    body,
    csrfToken,
  );
}

export function updateContract(
  id: string,
  payload: PatchedWriteContract,
  csrfToken: string,
) {
  return patchJson<Contract>(
    apiEndpoints.interactions.contracts.detail(id),
    payload,
    csrfToken,
  );
}

/** Новая версия файла: прежние остаются в журнале `contract-files`. */
export function uploadContractFile(id: string, file: File, csrfToken: string) {
  const body = new FormData();
  body.set("file", file);

  return patchFormData<Contract>(
    apiEndpoints.interactions.contracts.detail(id),
    body,
    csrfToken,
  );
}

export function deleteContract(id: string, csrfToken: string) {
  return deleteJson(apiEndpoints.interactions.contracts.detail(id), csrfToken);
}

export function getContractFiles(contractId: string) {
  const query = buildQuery({
    contract: contractId,
    ordering: "-uploaded_at",
    page: 1,
    page_size: 100,
  });

  return getJson<PaginatedResponse<ContractFile>>(
    `${apiEndpoints.interactions.contractFiles.list}?${query}`,
  );
}
