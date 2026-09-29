"use client";

import { useQuery } from "@tanstack/react-query";
import { ListChecks, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EntitySelect } from "@/components/ui/entity-select";
import { MultiEntitySelect } from "@/components/ui/multi-entity-select";
import {
  listDirectionPrograms,
  type LookupOption,
  searchDirections,
  searchPrograms,
} from "@/lib/api/catalog/lookups";
import { useLocale } from "@/providers/locale-provider";
import type { DirectionShort, ProgramWithDirection } from "@/types/catalog";

const copy = {
  ru: {
    addDirection: "Добавить направление",
    addDirectionPlaceholder: "Выберите направление",
    noDirections: "Сначала добавьте направление, затем выберите его программы.",
    programs: "Программы направления",
    programsPlaceholder: "Выберите программы",
    noPrograms: "Программы не выбраны.",
    removeDirection: "Убрать направление",
    removeSelected: "Убрать",
    selectAllPrograms: "Выбрать все программы",
    selectAllError: "Не удалось загрузить программы направления.",
  },
  en: {
    addDirection: "Add direction",
    addDirectionPlaceholder: "Choose a direction",
    noDirections: "Add a direction first, then choose its programs.",
    programs: "Direction programs",
    programsPlaceholder: "Choose programs",
    noPrograms: "No programs selected.",
    removeDirection: "Remove direction",
    removeSelected: "Remove",
    selectAllPrograms: "Select all programs",
    selectAllError: "The direction programs could not be loaded.",
  },
} as const;

type Text = (typeof copy)[keyof typeof copy];

/** Направление и выбранные в нём программы. */
export type DirectionPrograms = {
  direction: LookupOption;
  programs: LookupOption[];
};

/**
 * Направления с их программами. Программа, чьё направление не передано в
 * `directions`, добавляет его сама — так сохранённые программы не теряются.
 */
export function groupByDirection(
  directions: DirectionShort[],
  programs: ProgramWithDirection[],
): DirectionPrograms[] {
  const groups = new Map<string, DirectionPrograms>(
    directions.map((direction) => [
      direction.id,
      { direction: { id: direction.id, name: direction.name }, programs: [] },
    ]),
  );
  for (const program of programs) {
    const group = groups.get(program.direction.id) ?? {
      direction: { id: program.direction.id, name: program.direction.name },
      programs: [],
    };
    group.programs.push({ id: program.id, name: program.name });
    groups.set(program.direction.id, group);
  }

  return [...groups.values()];
}

function SelectedPrograms({
  emptyLabel,
  id,
  onChange,
  text,
  value,
}: {
  emptyLabel: string;
  id: string;
  onChange: (value: LookupOption[]) => void;
  text: Text;
  value: LookupOption[];
}) {
  if (value.length === 0)
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;

  return (
    <ul aria-labelledby={`${id}-label`} className="flex flex-wrap gap-2">
      {value.map((item) => (
        <li
          className="bg-secondary inline-flex items-center gap-1 rounded-full py-1 pr-1 pl-3 text-sm"
          key={item.id}
        >
          {item.name}
          <button
            aria-label={`${text.removeSelected}: ${item.name}`}
            className="hover:bg-muted rounded-full p-1"
            onClick={() =>
              onChange(value.filter((option) => option.id !== item.id))
            }
            type="button"
          >
            <X aria-hidden="true" className="size-3" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Отмечает все активные программы направления на момент нажатия. Программы,
 * которые появятся в каталоге позже, сами не добавятся.
 */
function SelectAllProgramsButton({
  group,
  onSelect,
  text,
}: {
  group: DirectionPrograms;
  onSelect: (programs: LookupOption[]) => void;
  text: Text;
}) {
  const directionId = group.direction.id;
  // Список нужен и для неактивности кнопки: всё уже выбрано — выбирать нечего
  const programsQuery = useQuery({
    queryKey: ["catalog", "direction-programs", directionId, "all"],
    queryFn: () => listDirectionPrograms(directionId),
  });
  const selected = new Set(group.programs.map((program) => program.id));
  const all = programsQuery.data ?? [];
  const isAllSelected =
    programsQuery.isSuccess && all.every((program) => selected.has(program.id));

  return (
    <Button
      aria-label={`${text.selectAllPrograms}: ${group.direction.name}`}
      colorScheme="neutral"
      disabled={!programsQuery.isSuccess || isAllSelected}
      onClick={() =>
        onSelect([
          ...group.programs,
          ...all.filter((program) => !selected.has(program.id)),
        ])
      }
      size="s"
      title={programsQuery.isError ? text.selectAllError : undefined}
      type="button"
      variant="ghost"
    >
      <ListChecks aria-hidden="true" className="size-3.5" />
      {text.selectAllPrograms}
    </Button>
  );
}

/**
 * Программы, выбранные через направления: сначала направление, внутри — его
 * программы. Программа ищется только в своём направлении, поэтому тёзки из
 * разных направлений не путаются; снятое направление уносит свои программы.
 * Общий для компетенций преподавателя и программ продукта.
 */
export function DirectionProgramsField({
  idPrefix,
  noProgramsHint,
  onChange,
  value,
}: {
  idPrefix: string;
  /** Подсказка у направления без программ — что они дают. */
  noProgramsHint?: string;
  onChange: (value: DirectionPrograms[]) => void;
  value: DirectionPrograms[];
}) {
  const { locale } = useLocale();
  const text = copy[locale];
  const update = (directionId: string, programs: LookupOption[]) =>
    onChange(
      value.map((group) =>
        group.direction.id === directionId ? { ...group, programs } : group,
      ),
    );

  return (
    <div className="space-y-4">
      <div className="max-w-md space-y-2">
        <p className="text-muted-foreground text-xs">{text.addDirection}</p>
        <EntitySelect
          excludeIds={value.map((group) => group.direction.id)}
          id={`${idPrefix}-add-direction`}
          label={text.addDirection}
          onChange={(direction) => {
            if (direction) onChange([...value, { direction, programs: [] }]);
          }}
          placeholder={text.addDirectionPlaceholder}
          queryKey={["catalog", "direction-programs", "directions"]}
          search={searchDirections}
          value={null}
        />
      </div>
      {value.length === 0 ? (
        <p className="text-muted-foreground text-sm">{text.noDirections}</p>
      ) : (
        <ul className="space-y-3">
          {value.map((group) => {
            const id = `${idPrefix}-programs-${group.direction.id}`;

            return (
              <li
                aria-label={group.direction.name}
                className="space-y-3 rounded-lg border p-3"
                key={group.direction.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{group.direction.name}</p>
                  <div className="flex flex-wrap gap-1">
                    <SelectAllProgramsButton
                      group={group}
                      onSelect={(programs) =>
                        update(group.direction.id, programs)
                      }
                      text={text}
                    />
                    <Button
                      aria-label={`${text.removeDirection}: ${group.direction.name}`}
                      colorScheme="neutral"
                      onClick={() =>
                        onChange(
                          value.filter(
                            (item) => item.direction.id !== group.direction.id,
                          ),
                        )
                      }
                      size="s"
                      type="button"
                      variant="ghost"
                    >
                      <X aria-hidden="true" className="size-3.5" />
                      {text.removeDirection}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <p
                    className="text-muted-foreground text-xs"
                    id={`${id}-label`}
                  >
                    {text.programs}
                  </p>
                  <MultiEntitySelect
                    id={id}
                    label={text.programs}
                    onChange={(programs) =>
                      update(group.direction.id, programs)
                    }
                    placeholder={text.programsPlaceholder}
                    queryKey={[
                      "catalog",
                      "direction-programs",
                      group.direction.id,
                    ]}
                    search={(term) => searchPrograms(term, group.direction.id)}
                    value={group.programs}
                  />
                  <SelectedPrograms
                    emptyLabel={
                      noProgramsHint
                        ? `${text.noPrograms} ${noProgramsHint}`
                        : text.noPrograms
                    }
                    id={id}
                    onChange={(programs) =>
                      update(group.direction.id, programs)
                    }
                    text={text}
                    value={group.programs}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
