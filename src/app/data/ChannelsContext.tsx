import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useTickets } from "./TicketsContext";

interface ChannelsContextValue {
  whatsappNumber: string;
  whatsappEnabled: boolean;
  setWhatsappNumber: (number: string) => void;
  setWhatsappEnabled: (enabled: boolean) => void;
}

const ChannelsContext = createContext<ChannelsContextValue | undefined>(undefined);

// The backend's WhatsApp webhook (server/index.js) queues incoming messages
// in memory — it has no way to write directly into this app's React state.
// So while WhatsApp intake is enabled, we poll a small endpoint on that same
// server every few seconds and turn anything new into a real ticket here.
const POLL_URL = "http://localhost:8787/api/whatsapp/pending";
const POLL_INTERVAL_MS = 4000;

export function ChannelsProvider({ children }: { children: ReactNode }) {
  const [whatsappNumber, setWhatsappNumber] = useState("+256726414687");
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const { addTicket } = useTickets();

  useEffect(() => {
    if (!whatsappEnabled) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(POLL_URL);
        if (!res.ok) return; // server not running or endpoint missing — silently skip this cycle
        const data = await res.json();
        if (cancelled || !Array.isArray(data.items)) return;

        for (const item of data.items as { from: string; profileName: string; body: string }[]) {
          const phone = item.from.replace("whatsapp:", "");
          await addTicket({
            subject: item.body.length > 60 ? `${item.body.slice(0, 60)}…` : item.body,
            details: item.body,
            customer: item.profileName || phone,
            email: `${phone.replace(/[^0-9]/g, "")}@whatsapp.local`,
            category: "General Inquiry",
            priority: "Medium",
            source: "WhatsApp",
          });
        }
      } catch {
        // Backend not reachable (e.g. not started yet) — fail silently and retry next cycle.
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [whatsappEnabled, addTicket]);

  return (
    <ChannelsContext.Provider value={{ whatsappNumber, whatsappEnabled, setWhatsappNumber, setWhatsappEnabled }}>
      {children}
    </ChannelsContext.Provider>
  );
}

export function useChannels() {
  const ctx = useContext(ChannelsContext);
  if (!ctx) throw new Error("useChannels must be used within a ChannelsProvider");
  return ctx;
}
