import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "../lib/supabase";

export type AssetStatus = "Active" | "In Repair" | "Retired" | "Lost / Stolen";
export type AssetType = string; // was a fixed union — now allows custom types too
export const KNOWN_ASSET_TYPES = [
  "Laptop", "Desktop", "Printer", "Phone", "Server",
  "Network Device", "Monitor", "Tablet", "Other",
] as const;

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  make: string;
  model: string;
  serialNumber: string;
  status: AssetStatus;
  assignedTo: string;
  assignedName: string;
  department: string;
  purchaseDate: string;
  warrantyExpiry: string;
  notes: string;
  lastSeen: string;
  linkedTicketIds: string[];
  dateAdded: string;
}

interface AssetsContextValue {
  assets: Asset[];
  isLoading: boolean;
  addAsset: (input: Omit<Asset, "id" | "dateAdded" | "linkedTicketIds">) => Promise<Asset>;
  updateAsset: (updated: Asset) => Promise<void>;
  removeAsset: (id: string) => Promise<void>;
  linkTicket: (assetId: string, ticketId: string) => Promise<void>;
  unlinkTicket: (assetId: string, ticketId: string) => Promise<void>;
}

const AssetsContext = createContext<AssetsContextValue | undefined>(undefined);

function todayDisplay() {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function rowToAsset(row: Record<string, unknown>): Asset {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as AssetType,
    make: row.make as string,
    model: row.model as string,
    serialNumber: (row.serial_number as string) ?? "",
    status: row.status as AssetStatus,
    assignedTo: (row.assigned_to as string) ?? "",
    assignedName: (row.assigned_name as string) ?? "",
    department: (row.department as string) ?? "",
    purchaseDate: (row.purchase_date as string) ?? "",
    warrantyExpiry: (row.warranty_expiry as string) ?? "",
    notes: (row.notes as string) ?? "",
    lastSeen: (row.last_seen as string) ?? "",
    linkedTicketIds: (row.linked_ticket_ids as string[]) ?? [],
    dateAdded: (row.date_added as string) ?? todayDisplay(),
  };
}

export function AssetsProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from("assets").select("*").order("date_added", { ascending: false });
      if (error) throw error;
      setAssets((data ?? []).map(rowToAsset));
    } catch (err) {
      console.error("Failed to load assets:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const addAsset: AssetsContextValue["addAsset"] = async (input) => {
    const id = `AST-${String(assets.length + 1).padStart(3, "0")}`;
    const row = {
      id,
      name: input.name,
      type: input.type,
      make: input.make,
      model: input.model,
      serial_number: input.serialNumber || null,
      status: input.status,
      assigned_to: input.assignedTo || null,
      assigned_name: input.assignedName || null,
      department: input.department || null,
      purchase_date: input.purchaseDate || null,
      warranty_expiry: input.warrantyExpiry || null,
      notes: input.notes || null,
      last_seen: input.lastSeen || null,
      linked_ticket_ids: [],
      date_added: todayDisplay(),
    };
    const { error } = await supabase.from("assets").insert(row);
    if (error) throw error;
    const newAsset = rowToAsset(row);
    setAssets((prev) => [newAsset, ...prev]);
    return newAsset;
  };

  const updateAsset: AssetsContextValue["updateAsset"] = async (updated) => {
    const { error } = await supabase.from("assets").update({
      name: updated.name,
      type: updated.type,
      make: updated.make,
      model: updated.model,
      serial_number: updated.serialNumber || null,
      status: updated.status,
      assigned_to: updated.assignedTo || null,
      assigned_name: updated.assignedName || null,
      department: updated.department || null,
      purchase_date: updated.purchaseDate || null,
      warranty_expiry: updated.warrantyExpiry || null,
      notes: updated.notes || null,
      last_seen: updated.lastSeen || null,
      linked_ticket_ids: updated.linkedTicketIds,
    }).eq("id", updated.id);
    if (error) throw error;
    setAssets((prev) => prev.map((a) => a.id === updated.id ? updated : a));
  };

  const removeAsset: AssetsContextValue["removeAsset"] = async (id) => {
    const { error } = await supabase.from("assets").delete().eq("id", id);
    if (error) throw error;
    setAssets((prev) => prev.filter((a) => a.id !== id));
  };

  const linkTicket: AssetsContextValue["linkTicket"] = async (assetId, ticketId) => {
    const asset = assets.find((a) => a.id === assetId);
    if (!asset || asset.linkedTicketIds.includes(ticketId)) return;
    const updated = [...asset.linkedTicketIds, ticketId];
    const { error } = await supabase.from("assets").update({ linked_ticket_ids: updated }).eq("id", assetId);
    if (error) throw error;
    setAssets((prev) => prev.map((a) => a.id === assetId ? { ...a, linkedTicketIds: updated } : a));
  };

  const unlinkTicket: AssetsContextValue["unlinkTicket"] = async (assetId, ticketId) => {
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return;
    const updated = asset.linkedTicketIds.filter((id) => id !== ticketId);
    const { error } = await supabase.from("assets").update({ linked_ticket_ids: updated }).eq("id", assetId);
    if (error) throw error;
    setAssets((prev) => prev.map((a) => a.id === assetId ? { ...a, linkedTicketIds: updated } : a));
  };

  return (
    <AssetsContext.Provider value={{ assets, isLoading, addAsset, updateAsset, removeAsset, linkTicket, unlinkTicket }}>
      {children}
    </AssetsContext.Provider>
  );
}

export function useAssets() {
  const ctx = useContext(AssetsContext);
  if (!ctx) throw new Error("useAssets must be used within an AssetsProvider");
  return ctx;
}

export const ASSET_TYPES = KNOWN_ASSET_TYPES;
export const ASSET_STATUSES: AssetStatus[] = ["Active", "In Repair", "Retired", "Lost / Stolen"];
export const STATUS_COLORS: Record<AssetStatus, { color: string; bg: string }> = {
  "Active": { color: "#10b981", bg: "#ecfdf5" },
  "In Repair": { color: "#f59e0b", bg: "#fffbeb" },
  "Retired": { color: "#6b7280", bg: "#f3f4f6" },
  "Lost / Stolen": { color: "#ef4444", bg: "#fef2f2" },
};
export const TYPE_ICONS: Record<string, string> = {
  Laptop: "💻", Desktop: "🖥️", Printer: "🖨️", Phone: "📱",
  Server: "🗄️", "Network Device": "🌐", Monitor: "🖥️", Tablet: "📱", Other: "📦",
};