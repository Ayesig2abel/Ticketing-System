import { useRef, useState } from "react";
import { Paperclip, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import type { TicketAttachment } from "../data/TicketsContext";
import { filesToAttachments, formatFileSize, MAX_ATTACHMENT_SIZE, MAX_ATTACHMENTS_PER_TICKET } from "../lib/attachments";

interface AttachmentPickerProps {
  attachments: TicketAttachment[];
  onChange: (attachments: TicketAttachment[]) => void;
}

export function AttachmentPicker({ attachments, onChange }: AttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const remainingSlots = MAX_ATTACHMENTS_PER_TICKET - attachments.length;
    if (remainingSlots <= 0) {
      setError(`You can attach up to ${MAX_ATTACHMENTS_PER_TICKET} files per ticket.`);
      return;
    }

    const files = Array.from(fileList).slice(0, remainingSlots);
    setIsProcessing(true);
    const { attachments: newOnes, rejected } = await filesToAttachments(files);
    setIsProcessing(false);

    if (rejected.length > 0) {
      setError(`Skipped: ${rejected.join(", ")}`);
    }
    if (newOnes.length > 0) {
      onChange([...attachments, ...newOnes]);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeAttachment = (id: string) => {
    onChange(attachments.filter((a) => a.id !== id));
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isProcessing || attachments.length >= MAX_ATTACHMENTS_PER_TICKET}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <Paperclip size={13} />}
        {isProcessing ? "Processing..." : "Attach files"}
      </button>
      <p className="text-[10px] text-gray-400 mt-1">
        Up to {MAX_ATTACHMENTS_PER_TICKET} files, {formatFileSize(MAX_ATTACHMENT_SIZE)} max each.
      </p>

      {error && <p className="text-[11px] text-red-500 mt-1.5">{error}</p>}

      {attachments.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5">
              {a.type.startsWith("image/") ? (
                <ImageIcon size={13} className="text-gray-400 flex-shrink-0" />
              ) : (
                <FileText size={13} className="text-gray-400 flex-shrink-0" />
              )}
              <span className="text-xs text-[#1a1f5e] truncate flex-1">{a.name}</span>
              <span className="text-[10px] text-gray-400 flex-shrink-0">{formatFileSize(a.size)}</span>
              <button type="button" onClick={() => removeAttachment(a.id)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
