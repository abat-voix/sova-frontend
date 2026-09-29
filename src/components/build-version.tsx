import { useLocale } from "@/providers/locale-provider";

const version = process.env.NEXT_PUBLIC_BUILD_VERSION?.trim() || "dev";
const revision = process.env.NEXT_PUBLIC_BUILD_SHA?.trim().slice(0, 7) || "";

export function BuildVersion() {
  const { t } = useLocale();
  const label = version;
  const title = revision
    ? `${t("buildVersion")} ${label} (${revision})`
    : `${t("buildVersion")} ${label}`;

  return (
    <span
      aria-label={title}
      className="text-muted-foreground bg-secondary inline-flex h-7 items-center rounded-full px-2 text-[0.625rem] leading-none font-medium tracking-[0.04em]"
      title={title}
    >
      {label}
    </span>
  );
}
