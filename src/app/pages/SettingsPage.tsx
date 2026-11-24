import { useState } from "react";
import { Sidebar } from "../components/layout/Sidebar";
import { UserProfileChip } from "../components/layout/UserProfileChip";
import { CategoryTreeEditor } from "../components/settings/CategoryTreeEditor";
import { useSLA, PRIORITIES } from "../data/SLAContext";
import { useChannels } from "../data/ChannelsContext";
import type { TicketPriority } from "../data/TicketsContext";
import {
  Settings as SettingsIcon, Clock, CheckCircle2, Tag,
  MessageCircle, Info,
} from "lucide-react";

const ACCENT = "#5f63f2";

const PRIORITY_COLORS: Record<TicketPriority, { color: string; bg: string }> = {
  Critical: { color: "#7c3aed", bg: "#f5f3ff" },
  High: { color: "#ef4444", bg: "#fef2f2" },
  Medium: { color: "#f59e0b", bg: "#fffbeb" },
  Low: { color: "#6b7280", bg: "#f3f4f6" },
};

function formatHours(hours: number) {
  if (hours < 24) return `${hours}h`;
  const days = hours / 24;
  return days % 1 === 0 ? `${days}d` : `${days.toFixed(1)}d`;
}

export default function SettingsPage() {
  const { policies, updatePolicy } = useSLA();
  const { whatsappNumber, whatsappEnabled, setWhatsappNumber, setWhatsappEnabled } = useChannels();

  // SLA policy drafts
  const [drafts, setDrafts] = useState<Record<TicketPriority, { response: string; resolution: string }>>(
    () =>
      Object.fromEntries(
        PRIORITIES.map((p) => {
          const policy = policies.find((x) => x.priority === p)!;
          return [p, { response: String(policy.responseHours), resolution: String(policy.resolutionHours) }];
        })
      ) as Record<TicketPriority, { response: string; resolution: string }>
  );
  const [savedFlash, setSavedFlash] = useState<TicketPriority | null>(null);

  const setDraft = (priority: TicketPriority, field: "response" | "resolution", value: string) => {
    setDrafts((prev) => ({ ...prev, [priority]: { ...prev[priority], [field]: value } }));
  };

  const saveRow = (priority: TicketPriority) => {
    const draft = drafts[priority];
    updatePolicy(priority, Math.max(0, Number(draft.response) || 0), Math.max(0, Number(draft.resolution) || 0));
    setSavedFlash(priority);
    setTimeout(() => setSavedFlash((cur) => (cur === priority ? null : cur)), 1500);
  };

  // WhatsApp number — light local validation only, no real verification here
  const [whatsappDraft, setWhatsappDraft] = useState(whatsappNumber);
  const [whatsappSaved, setWhatsappSaved] = useState(false);

  const saveWhatsapp = () => {
    setWhatsappNumber(whatsappDraft.trim());
    setWhatsappSaved(true);
    setTimeout(() => setWhatsappSaved(false), 1500);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ fontFamily: "Inter, sans-serif", background: "#f0f2f8" }}>
      <Sidebar active="settings" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-3 bg-white shadow-sm flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: ACCENT }}>
              <SettingsIcon size={15} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#1a1f5e]">Settings</h1>
              <p className="text-xs text-gray-400">Categories, SLA targets, and intake channels</p>
            </div>
          </div>
          <UserProfileChip />
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Ticket Categories */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-1">
              <Tag size={15} style={{ color: ACCENT }} />
              <h2 className="text-sm font-bold text-[#1a1f5e]">Ticket Categories</h2>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              These appear in every "Raise a Ticket" form. Each category can have subcategories, and each subcategory can have its own items — e.g. Technical Support → Hardware → RAM Replacement. Click a category to expand it. Subcategories and items are optional at every level.
            </p>
            <CategoryTreeEditor />
          </div>

          {/* SLA Policies by priority */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={15} style={{ color: ACCENT }} />
              <h2 className="text-sm font-bold text-[#1a1f5e]">Resolution Time by Priority</h2>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Every ticket's deadline is its creation time plus the resolution target below, based on its priority. Tickets still open past that deadline show as breached on the Tickets page and in the Dashboard's SLA count.
            </p>

            <div className="grid grid-cols-12 gap-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-3 mb-1">
              <div className="col-span-3">Priority</div>
              <div className="col-span-3">First Response Target</div>
              <div className="col-span-3">Resolution Target</div>
              <div className="col-span-3"></div>
            </div>

            {PRIORITIES.map((priority) => {
              const { color, bg } = PRIORITY_COLORS[priority];
              const draft = drafts[priority];
              return (
                <div key={priority} className="grid grid-cols-12 gap-3 items-center px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="col-span-3">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ color, background: bg }}>
                      {priority}
                    </span>
                  </div>
                  <div className="col-span-3 flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      value={draft.response}
                      onChange={(e) => setDraft(priority, "response", e.target.value)}
                      className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-purple-400 text-[#1a1f5e]"
                    />
                    <span className="text-xs text-gray-400">hours</span>
                  </div>
                  <div className="col-span-3 flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      value={draft.resolution}
                      onChange={(e) => setDraft(priority, "resolution", e.target.value)}
                      className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-purple-400 text-[#1a1f5e]"
                    />
                    <span className="text-xs text-gray-400">hours ({formatHours(Number(draft.resolution) || 0)})</span>
                  </div>
                  <div className="col-span-3 flex items-center gap-2">
                    <button
                      onClick={() => saveRow(priority)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity"
                      style={{ background: ACCENT }}
                    >
                      Save
                    </button>
                    {savedFlash === priority && (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                        <CheckCircle2 size={13} /> Saved
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Channels — WhatsApp */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle size={15} style={{ color: "#25D366" }} />
              <h2 className="text-sm font-bold text-[#1a1f5e]">WhatsApp Intake</h2>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Let customers create tickets by texting your WhatsApp Business number.
            </p>

            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
              <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700 leading-relaxed space-y-1.5">
                <p>This app's backend can now receive real WhatsApp messages and turn them into tickets automatically. To finish connecting it:</p>
                <ol className="list-decimal list-inside space-y-0.5 pl-1">
                  <li>Create a free Twilio account and activate the WhatsApp Sandbox (or use a paid WhatsApp Business number once ready for production)</li>
                  <li>Run <code className="bg-blue-100 px-1 rounded">npm run dev:all</code> locally, then expose your backend publicly — easiest with <code className="bg-blue-100 px-1 rounded">ngrok http 8787</code></li>
                  <li>In Twilio's WhatsApp Sandbox settings, set the incoming webhook URL to <code className="bg-blue-100 px-1 rounded">https://your-ngrok-url/api/whatsapp/webhook</code></li>
                  <li>Enable the toggle below and text the sandbox number — a real ticket will appear on the Tickets page within a few seconds</li>
                </ol>
                <p>Saving a number here is just a label for your own reference; the actual connection happens in Twilio's dashboard via the webhook URL above.</p>
              </div>
            </div>

            <div className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2.5 mb-3">
              <div>
                <p className="text-sm font-medium text-[#1a1f5e]">Enable WhatsApp ticket intake</p>
                <p className="text-xs text-gray-400">Tickets will be tagged with a "WhatsApp" source once connected</p>
              </div>
              <button
                onClick={() => setWhatsappEnabled(!whatsappEnabled)}
                className="w-11 h-6 rounded-full relative transition-colors flex-shrink-0"
                style={{ background: whatsappEnabled ? "#25D366" : "#d1d5db" }}
              >
                <div
                  className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow-sm"
                  style={{ left: whatsappEnabled ? "22px" : "2px" }}
                />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                value={whatsappDraft}
                onChange={(e) => setWhatsappDraft(e.target.value)}
                placeholder="+1 555 123 4567"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400 text-[#1a1f5e]"
              />
              <button
                onClick={saveWhatsapp}
                className="text-xs font-semibold px-4 py-2 rounded-lg text-white hover:opacity-90 transition-opacity flex-shrink-0"
                style={{ background: ACCENT }}
              >
                Save Number
              </button>
              {whatsappSaved && (
                <span className="flex items-center gap-1 text-xs font-medium text-green-600 flex-shrink-0">
                  <CheckCircle2 size={13} /> Saved
                </span>
              )}
            </div>
            {whatsappNumber && (
              <p className="text-xs text-gray-400 mt-2">
                Currently connected: <span className="font-semibold text-[#1a1f5e]">{whatsappNumber}</span>
                {!whatsappEnabled && " (intake disabled)"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
