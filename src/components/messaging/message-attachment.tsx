import { Download, FileText } from "lucide-react";

import { formatFileSize } from "@/lib/format-file-size";
import type { Locale } from "@/i18n/translations";
import type { MessageAttachment as MessageAttachmentData } from "@/types/messaging";

const copy = {
  ru: { download: "Скачать" },
  en: { download: "Download" },
} as const;

export function MessageAttachment({
  attachment,
  locale,
}: {
  attachment: MessageAttachmentData;
  locale: Locale;
}) {
  const text = copy[locale];

  return (
    <a
      aria-label={`${text.download} ${attachment.original_name}`}
      className="mt-2 flex min-w-0 items-center gap-2 rounded-lg border border-current/20 bg-current/5 px-2.5 py-2 text-current transition-opacity hover:opacity-80"
      download
      href={attachment.download_url}
    >
      <FileText aria-hidden="true" className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium">
          {attachment.original_name}
        </span>
        <span className="block text-[0.625rem] opacity-70">
          {formatFileSize(attachment.size, locale)}
        </span>
      </span>
      <Download aria-hidden="true" className="size-4 shrink-0" />
    </a>
  );
}
