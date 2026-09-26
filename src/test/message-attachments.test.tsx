import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MessageAttachment } from "@/components/messaging/message-attachment";
import {
  MessageDraftAttachment,
  type DraftAttachment,
} from "@/components/messaging/message-draft-attachment";
import { formatFileSize } from "@/lib/format-file-size";

const attachment = {
  id: "0199f5db-2778-7000-8000-000000000004",
  original_name: "report.pdf",
  size: 2048,
  content_type: "application/pdf",
  download_url: "/api/messaging/attachments/attachment/download/",
};

describe("formatFileSize", () => {
  it("formats binary units for the selected locale", () => {
    expect(formatFileSize(1536, "en")).toBe("1.5 KB");
    expect(formatFileSize(1536, "ru")).toBe("1,5 КБ");
    expect(formatFileSize(null, "en")).toBeNull();
  });
});

describe("message attachments", () => {
  it("renders a downloadable attachment", () => {
    render(<MessageAttachment attachment={attachment} locale="en" />);

    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByText("2 KB")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /download report\.pdf/i }),
    ).toHaveAttribute("href", attachment.download_url);
  });

  it("renders an upload error with retry and remove actions", () => {
    const item: DraftAttachment = {
      status: "error",
      localId: "local-1",
      file: new File(["broken"], "broken.pdf", { type: "application/pdf" }),
      error: "Upload failed",
    };
    const onRemove = vi.fn();
    const onRetry = vi.fn();

    render(
      <MessageDraftAttachment
        isRemoving={false}
        item={item}
        locale="en"
        onRemove={onRemove}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText("Upload failed")).toBeInTheDocument();
    screen.getByRole("button", { name: /retry upload broken\.pdf/i }).click();
    screen.getByRole("button", { name: /remove broken\.pdf/i }).click();
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
