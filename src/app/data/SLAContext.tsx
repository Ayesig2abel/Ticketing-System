import { createContext, useContext, useState, type ReactNode } from "react";
import type { TicketPriority, TicketCategory } from "./TicketsContext";

export interface SLAPolicy {
  priority: TicketPriority;
  /** Hours within which an agent should first respond. */
  responseHours: number;
  /** Hours within which the ticket should be fully resolved. */
  resolutionHours: number;
}

const PRIORITIES: TicketPriority[] = ["Critical", "High", "Medium", "Low"];

const DEFAULT_POLICIES: SLAPolicy[] = [
  { priority: "Critical", responseHours: 1, resolutionHours: 4 },
  { priority: "High", responseHours: 4, resolutionHours: 24 },
  { priority: "Medium", responseHours: 8, resolutionHours: 48 },
  { priority: "Low", responseHours: 24, resolutionHours: 72 },
];

/** A sub-subcategory is just a name (e.g. "RAM Replacement") — no further nesting. */
export interface Subcategory {
  name: string;
  /** Sub-subcategory names, e.g. under "Hardware": ["RAM Replacement", "Screen Repair"]. Can be empty. */
  items: string[];
}

export interface CategoryNode {
  name: TicketCategory;
  defaultPriority: TicketPriority;
  /** Subcategories under this category, e.g. under "Technical Support": "Hardware", "Software". Can be empty. */
  subcategories: Subcategory[];
}

const DEFAULT_CATEGORY_TREE: CategoryNode[] = [
  {
    name: "Technical Support",
    defaultPriority: "High",
    subcategories: [
      { name: "Hardware", items: ["RAM Replacement", "Screen Repair", "Battery Replacement"] },
      { name: "Software", items: ["Installation Issue", "Crash / Freeze", "Update Failure"] },
      { name: "Network", items: ["WiFi Connectivity", "VPN Access"] },
    ],
  },
  { name: "Billing", defaultPriority: "Medium", subcategories: [
    { name: "Invoices", items: ["Missing Invoice", "Incorrect Amount"] },
    { name: "Payments", items: ["Failed Payment", "Refund Request"] },
  ] },
  { name: "General Inquiry", defaultPriority: "Low", subcategories: [] },
  { name: "Bug Report", defaultPriority: "High", subcategories: [] },
  { name: "Feature Request", defaultPriority: "Low", subcategories: [] },
];

interface SLAContextValue {
  policies: SLAPolicy[];
  categoryTree: CategoryNode[];
  /** Flat list of category names — convenient for anything that just needs top-level options (e.g. a simple dropdown). */
  categories: TicketCategory[];
  /** Flat map of category name → its default priority. */
  categoryDefaults: Record<TicketCategory, TicketPriority>;
  updatePolicy: (priority: TicketPriority, responseHours: number, resolutionHours: number) => void;
  updateCategoryDefault: (category: TicketCategory, priority: TicketPriority) => void;
  /** Adds a new top-level category. Returns false (and adds nothing) if it already exists. */
  addCategory: (name: string, defaultPriority: TicketPriority) => boolean;
  /** Renames a category everywhere it's used — including on any existing tickets that already have it. */
  renameCategory: (oldName: string, newName: string) => void;
  /** Removes a category and everything nested under it. Existing tickets keep their old category value (kept for history), it just won't appear as an option for new tickets. */
  removeCategory: (name: string) => void;
  /** Adds a subcategory under a category. Returns false if it already exists there. */
  addSubcategory: (categoryName: string, subName: string) => boolean;
  renameSubcategory: (categoryName: string, oldName: string, newName: string) => void;
  removeSubcategory: (categoryName: string, subName: string) => void;
  /** Adds a sub-subcategory (a specific item) under a subcategory. Returns false if it already exists there. */
  addItem: (categoryName: string, subName: string, itemName: string) => boolean;
  renameItem: (categoryName: string, subName: string, oldItem: string, newItem: string) => void;
  removeItem: (categoryName: string, subName: string, itemName: string) => void;
  /** The configured resolution-time target (hours) for a given priority. */
  getResolutionHours: (priority: TicketPriority) => number;
}

const SLAContext = createContext<SLAContextValue | undefined>(undefined);

export function SLAProvider({ children }: { children: ReactNode }) {
  const [policies, setPolicies] = useState<SLAPolicy[]>(DEFAULT_POLICIES);
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>(DEFAULT_CATEGORY_TREE);

  // Flat derived views — kept in sync automatically since they're computed from categoryTree, not stored separately.
  const categories = categoryTree.map((c) => c.name);
  const categoryDefaults = Object.fromEntries(categoryTree.map((c) => [c.name, c.defaultPriority]));

  const updatePolicy: SLAContextValue["updatePolicy"] = (priority, responseHours, resolutionHours) => {
    setPolicies((prev) => prev.map((p) => (p.priority === priority ? { ...p, responseHours, resolutionHours } : p)));
  };

  const updateCategoryDefault: SLAContextValue["updateCategoryDefault"] = (category, priority) => {
    setCategoryTree((prev) => prev.map((c) => (c.name === category ? { ...c, defaultPriority: priority } : c)));
  };

  const addCategory: SLAContextValue["addCategory"] = (name, defaultPriority) => {
    const trimmed = name.trim();
    if (!trimmed || categoryTree.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) return false;
    setCategoryTree((prev) => [...prev, { name: trimmed, defaultPriority, subcategories: [] }]);
    return true;
  };

  const renameCategory: SLAContextValue["renameCategory"] = (oldName, newName) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    setCategoryTree((prev) => prev.map((c) => (c.name === oldName ? { ...c, name: trimmed } : c)));
  };

  const removeCategory: SLAContextValue["removeCategory"] = (name) => {
    setCategoryTree((prev) => prev.filter((c) => c.name !== name));
  };

  const addSubcategory: SLAContextValue["addSubcategory"] = (categoryName, subName) => {
    const trimmed = subName.trim();
    if (!trimmed) return false;
    const category = categoryTree.find((c) => c.name === categoryName);
    if (!category || category.subcategories.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) return false;
    setCategoryTree((prev) =>
      prev.map((c) => (c.name === categoryName ? { ...c, subcategories: [...c.subcategories, { name: trimmed, items: [] }] } : c))
    );
    return true;
  };

  const renameSubcategory: SLAContextValue["renameSubcategory"] = (categoryName, oldName, newName) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setCategoryTree((prev) =>
      prev.map((c) =>
        c.name === categoryName
          ? { ...c, subcategories: c.subcategories.map((s) => (s.name === oldName ? { ...s, name: trimmed } : s)) }
          : c
      )
    );
  };

  const removeSubcategory: SLAContextValue["removeSubcategory"] = (categoryName, subName) => {
    setCategoryTree((prev) =>
      prev.map((c) => (c.name === categoryName ? { ...c, subcategories: c.subcategories.filter((s) => s.name !== subName) } : c))
    );
  };

  const addItem: SLAContextValue["addItem"] = (categoryName, subName, itemName) => {
    const trimmed = itemName.trim();
    if (!trimmed) return false;
    const category = categoryTree.find((c) => c.name === categoryName);
    const sub = category?.subcategories.find((s) => s.name === subName);
    if (!sub || sub.items.some((i) => i.toLowerCase() === trimmed.toLowerCase())) return false;
    setCategoryTree((prev) =>
      prev.map((c) =>
        c.name === categoryName
          ? { ...c, subcategories: c.subcategories.map((s) => (s.name === subName ? { ...s, items: [...s.items, trimmed] } : s)) }
          : c
      )
    );
    return true;
  };

  const renameItem: SLAContextValue["renameItem"] = (categoryName, subName, oldItem, newItem) => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    setCategoryTree((prev) =>
      prev.map((c) =>
        c.name === categoryName
          ? {
              ...c,
              subcategories: c.subcategories.map((s) =>
                s.name === subName ? { ...s, items: s.items.map((i) => (i === oldItem ? trimmed : i)) } : s
              ),
            }
          : c
      )
    );
  };

  const removeItem: SLAContextValue["removeItem"] = (categoryName, subName, itemName) => {
    setCategoryTree((prev) =>
      prev.map((c) =>
        c.name === categoryName
          ? { ...c, subcategories: c.subcategories.map((s) => (s.name === subName ? { ...s, items: s.items.filter((i) => i !== itemName) } : s)) }
          : c
      )
    );
  };

  const getResolutionHours: SLAContextValue["getResolutionHours"] = (priority) => {
    return policies.find((p) => p.priority === priority)?.resolutionHours ?? 48;
  };

  return (
    <SLAContext.Provider
      value={{
        policies, categoryTree, categories, categoryDefaults, updatePolicy, updateCategoryDefault,
        addCategory, renameCategory, removeCategory,
        addSubcategory, renameSubcategory, removeSubcategory,
        addItem, renameItem, removeItem,
        getResolutionHours,
      }}
    >
      {children}
    </SLAContext.Provider>
  );
}

export function useSLA() {
  const ctx = useContext(SLAContext);
  if (!ctx) throw new Error("useSLA must be used within an SLAProvider");
  return ctx;
}

export { PRIORITIES };

/**
 * Given a ticket's created date + priority, and whether it's already
 * closed/resolved, computes SLA status against the configured policy.
 * Used by TicketsPage (to show a badge) and DashboardPage (to count breaches).
 */
export function getSLAStatus(
  createdDisplay: string,
  priority: TicketPriority,
  isClosed: boolean,
  resolutionHours: number
): { breached: boolean; dueAt: Date; hoursRemaining: number } {
  const createdAt = new Date(createdDisplay);
  const dueAt = new Date(createdAt.getTime() + resolutionHours * 60 * 60 * 1000);
  const now = new Date();
  const hoursRemaining = (dueAt.getTime() - now.getTime()) / (1000 * 60 * 60);
  const breached = !isClosed && now.getTime() > dueAt.getTime();
  return { breached, dueAt, hoursRemaining };
}
