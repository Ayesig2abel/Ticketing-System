import type { TicketAttachment } from "../data/TicketsContext";

// Attachments live entirely in browser memory (encoded as data URLs) since
// this app has no real file server — same honest tradeoff as everywhere
// else in this project. Capping size keeps that practical; without a cap,
// a few photos could make the whole in-memory ticket store sluggish.
export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024; // 5MB per file
export const MAX_ATTACHMENTS_PER_TICKET = 5;

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a FileList/array of File objects into TicketAttachment[], skipping
 * (and reporting) any that exceed the size cap rather than silently dropping them.
 */
export async function filesToAttachments(
  files: File[]
): Promise<{ attachments: TicketAttachment[]; rejected: string[] }> {
  const attachments: TicketAttachment[] = [];
  const rejected: string[] = [];

  for (const file of files) {
    if (file.size > MAX_ATTACHMENT_SIZE) {
      rejected.push(`${file.name} (${formatFileSize(file.size)} — over the ${formatFileSize(MAX_ATTACHMENT_SIZE)} limit)`);
      continue;
    }
    const dataUrl = await readFileAsDataUrl(file);
    attachments.push({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      dataUrl,
    });
  }

  return { attachments, rejected };
}
