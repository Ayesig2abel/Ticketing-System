import { useState } from "react";
import { Sidebar } from "../components/layout/Sidebar";
import { UserProfileChip } from "../components/layout/UserProfileChip";
import { useAssets, type Asset, type AssetStatus, type AssetType,
  ASSET_TYPES, ASSET_STATUSES, STATUS_COLORS, TYPE_ICONS,
} from "../data/AssetsContext";
import { useTickets } from "../data/TicketsContext";
import { useAuth } from "../auth/AuthContext";
import {
  HardDrive, Plus, Search, X, Pencil, Trash2, Link2, LinkIcon,
  CheckCircle2, AlertTriangle, Clock, XCircle, ChevronDown,
  ExternalLink, Tag,
} from "lucide-react";

const ACCENT = "#5f63f2";

const DEPARTMENTS = [
  "IT", "Engineering", "Finance", "Marketing", "Operations",
  "Support", "Sales", "HR", "Legal", "Other",
];

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
function AssetForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Asset;
  onSave: (data: Omit<Asset, "id" | "dateAdded" | "linkedTicketIds">) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<AssetType>(initial?.type ?? "Laptop");
  const [make, setMake] = useState(initial?.make ?? "");
  const [model, setModel] = useState(initial?.model ?? "");
  const [serial, setSerial] = useState(initial?.serialNumber ?? "");
  const [status, setStatus] = useState<AssetStatus>(initial?.status ?? "Active");
  const [assignedTo, setAssignedTo] = useState(initial?.assignedTo ?? "");
  const [assignedName, setAssignedName] = useState(initial?.assignedName ?? "");
  const [department, setDepartment] = useState(initial?.department ?? "IT");
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchaseDate ?? "");
  const [warrantyExpiry, setWarrantyExpiry] = useState(initial?.warrantyExpiry ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Asset name is required";
    if (!make.trim()) e.make = "Make / brand is required";
    if (!model.trim()) e.model = "Model is required";
    return e;
  };

  const submit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({ name, type, make, model, serialNumber: serial, status, assignedTo, assignedName, department, purchaseDate, warrantyExpiry, notes });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full mx-4 overflow-hidden flex flex-col" style={{ maxWidth: 560, maxHeight: "90vh" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-[#1a1f5e]">{initial ? "Edit Asset" : "Add New Asset"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Name */}
            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Asset Name <span className="text-red-500">*</span></label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Marketing MacBook Pro"
                className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400 text-[#1a1f5e] ${errors.name ? "border-red-300" : "border-gray-200"}`} />
              {errors.name && <p className="text-[11px] text-red-500 mt-0.5">{errors.name}</p>}
            </div>

            {/* Type */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Type</label>
              <div className="relative">
                <select value={type} onChange={(e) => setType(e.target.value as AssetType)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400 text-[#1a1f5e] appearance-none">
                  {ASSET_TYPES.map((t) => <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Status</label>
              <div className="relative">
                <select value={status} onChange={(e) => setStatus(e.target.value as AssetStatus)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400 appearance-none"
                  style={{ color: STATUS_COLORS[status].color }}>
                  {ASSET_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Make */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Make / Brand <span className="text-red-500">*</span></label>
              <input value={make} onChange={(e) => setMake(e.target.value)} placeholder="e.g. Apple, Dell, HP"
                className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400 text-[#1a1f5e] ${errors.make ? "border-red-300" : "border-gray-200"}`} />
              {errors.make && <p className="text-[11px] text-red-500 mt-0.5">{errors.make}</p>}
            </div>

            {/* Model */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Model <span className="text-red-500">*</span></label>
              <input value={model} onChange={(e) => setModel(e.target.value)} placeholder='e.g. MacBook Pro 14"'
                className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400 text-[#1a1f5e] ${errors.model ? "border-red-300" : "border-gray-200"}`} />
              {errors.model && <p className="text-[11px] text-red-500 mt-0.5">{errors.model}</p>}
            </div>

            {/* Serial */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Serial Number</label>
              <input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="e.g. C02XG1JXJGH6"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400 text-[#1a1f5e]" />
            </div>

            {/* Department */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Department</label>
              <div className="relative">
                <select value={department} onChange={(e) => setDepartment(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400 text-[#1a1f5e] appearance-none">
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Assigned name (free text, since users may not have accounts) */}
            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Assigned To</label>
              <div className="grid grid-cols-2 gap-2">
                <input value={assignedName} onChange={(e) => setAssignedName(e.target.value)} placeholder="Full name (e.g. Emma Johnson)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400 text-[#1a1f5e]" />
                <input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Email (optional)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400 text-[#1a1f5e]" />
              </div>
            </div>

            {/* Purchase Date */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Purchase Date</label>
              <input value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} placeholder="e.g. Jan 15, 2024"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400 text-[#1a1f5e]" />
            </div>

            {/* Warranty Expiry */}
            <div>
              <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Warranty Expiry</label>
              <input value={warrantyExpiry} onChange={(e) => setWarrantyExpiry(e.target.value)} placeholder="e.g. Jan 15, 2027"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400 text-[#1a1f5e]" />
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-gray-500 mb-1 block">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any relevant notes (e.g. AppleCare enrolled, custom specs…)"
                rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400 text-[#1a1f5e] resize-none" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">Cancel</button>
          <button onClick={submit} className="flex-1 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity" style={{ background: ACCENT }}>
            {initial ? "Save Changes" : "Add Asset"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function AssetPanel({
  asset,
  isAdmin,
  onClose,
  onEdit,
  onDelete,
}: {
  asset: Asset;
  isAdmin: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { tickets } = useTickets();
  const { linkTicket, unlinkTicket } = useAssets();
  const [linkInput, setLinkInput] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const sc = STATUS_COLORS[asset.status];
  const linkedTickets = tickets.filter((t) => asset.linkedTicketIds.includes(t.id));

  const handleLink = () => {
    const id = linkInput.trim();
    if (!id) return;
    const exists = tickets.find((t) => t.id === id);
    if (!exists) { setLinkError(`No ticket found with ID "${id}"`); return; }
    if (asset.linkedTicketIds.includes(id)) { setLinkError("Already linked."); return; }
    linkTicket(asset.id, id);
    setLinkInput("");
    setLinkError(null);
  };

  return (
    <div className="w-80 flex-shrink-0 border-l border-gray-100 flex flex-col bg-white overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-bold text-[#1a1f5e]">{asset.id}</p>
        <div className="flex items-center gap-1">
          {isAdmin && (
            <>
              <button onClick={onEdit} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400"><Pencil size={13} /></button>
              {confirmDelete ? (
                <div className="flex items-center gap-1">
                  <button onClick={onDelete} className="text-[11px] font-semibold text-white px-2 py-1 rounded-lg bg-red-500">Confirm</button>
                  <button onClick={() => setConfirmDelete(false)} className="text-[11px] text-gray-400 px-1.5">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
              )}
            </>
          )}
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400"><X size={13} /></button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Identity */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{TYPE_ICONS[asset.type]}</span>
            <div>
              <p className="text-sm font-bold text-[#1a1f5e]">{asset.name}</p>
              <p className="text-xs text-gray-400">{asset.make} {asset.model}</p>
            </div>
          </div>
          <span className="inline-block text-[10px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.color }}>
            {asset.status}
          </span>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            ["Type", asset.type],
            ["Department", asset.department],
            ["Serial No.", asset.serialNumber || "—"],
            ["Added", asset.dateAdded],
            ["Purchased", asset.purchaseDate || "—"],
            ["Warranty", asset.warrantyExpiry || "—"],
          ].map(([l, v]) => (
            <div key={l} className="bg-gray-50 rounded-lg px-2.5 py-2">
              <p className="text-[10px] text-gray-400 mb-0.5">{l}</p>
              <p className="font-semibold text-[#1a1f5e] truncate">{v}</p>
            </div>
          ))}
        </div>

        {/* Assigned */}
        <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-xs">
          <p className="text-[10px] text-gray-400 mb-0.5">Assigned To</p>
          <p className="font-semibold text-[#1a1f5e]">{asset.assignedName || "Unassigned"}</p>
          {asset.assignedTo && <p className="text-gray-400 text-[10px]">{asset.assignedTo}</p>}
        </div>

        {/* Notes */}
        {asset.notes && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Notes</p>
            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{asset.notes}</p>
          </div>
        )}

        {/* Linked tickets */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
            Linked Tickets {linkedTickets.length > 0 && `(${linkedTickets.length})`}
          </p>

          {linkedTickets.length > 0 ? (
            <div className="space-y-1.5 mb-3">
              {linkedTickets.map((t) => (
                <div key={t.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold" style={{ color: ACCENT }}>{t.id}</p>
                    <p className="text-[10px] text-gray-500 truncate">{t.subject}</p>
                  </div>
                  <button onClick={() => unlinkTicket(asset.id, t.id)} className="text-gray-300 hover:text-red-400 flex-shrink-0"><X size={11} /></button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic mb-3">No tickets linked yet.</p>
          )}

          {/* Link a ticket by ID */}
          <div className="flex items-center gap-1.5">
            <input
              value={linkInput}
              onChange={(e) => { setLinkInput(e.target.value); setLinkError(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleLink()}
              placeholder="#T-1001"
              className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-purple-400 text-[#1a1f5e]"
            />
            <button onClick={handleLink} className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg text-white flex-shrink-0 hover:opacity-90" style={{ background: ACCENT }}>
              <Link2 size={11} /> Link
            </button>
          </div>
          {linkError && <p className="text-[11px] text-red-500 mt-1">{linkError}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AssetsPage() {
  const { assets, addAsset, updateAsset, removeAsset } = useAssets();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AssetType | "All">("All");
  const [statusFilter, setStatusFilter] = useState<AssetStatus | "All">("All");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>(undefined);

  const filtered = assets.filter((a) => {
    const matchSearch = !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.make.toLowerCase().includes(search.toLowerCase()) ||
      a.model.toLowerCase().includes(search.toLowerCase()) ||
      a.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
      a.assignedName.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "All" || a.type === typeFilter;
    const matchStatus = statusFilter === "All" || a.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  // Summary counts
  const counts = {
    total: assets.length,
    active: assets.filter((a) => a.status === "Active").length,
    inRepair: assets.filter((a) => a.status === "In Repair").length,
    retired: assets.filter((a) => a.status === "Retired").length,
    lost: assets.filter((a) => a.status === "Lost / Stolen").length,
  };

  const handleSave = (data: Omit<Asset, "id" | "dateAdded" | "linkedTicketIds">) => {
    if (editingAsset) {
      updateAsset({ ...editingAsset, ...data });
      if (selectedAsset?.id === editingAsset.id) {
        setSelectedAsset({ ...editingAsset, ...data });
      }
    } else {
      addAsset(data);
    }
  };

  const handleDelete = (asset: Asset) => {
    removeAsset(asset.id);
    if (selectedAsset?.id === asset.id) setSelectedAsset(null);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ fontFamily: "Inter, sans-serif", background: "#f0f2f8" }}>
      <Sidebar active="assets" />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3 bg-white shadow-sm flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: ACCENT }}>
              <HardDrive size={15} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#1a1f5e]">Asset Management</h1>
              <p className="text-xs text-gray-400">Track devices, equipment, and linked tickets</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                onClick={() => { setEditingAsset(undefined); setShowForm(true); }}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-white hover:opacity-90 transition-opacity"
                style={{ background: ACCENT }}
              >
                <Plus size={13} /> Add Asset
              </button>
            )}
            <UserProfileChip />
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Main content */}
          <div className="flex-1 flex flex-col overflow-hidden px-6 py-5 space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: "Total Assets", value: counts.total, color: ACCENT },
                { label: "Active", value: counts.active, color: "#10b981" },
                { label: "In Repair", value: counts.inRepair, color: "#f59e0b" },
                { label: "Retired", value: counts.retired, color: "#6b7280" },
                { label: "Lost / Stolen", value: counts.lost, color: "#ef4444" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-xl px-4 py-3 shadow-sm">
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-100 flex-1 min-w-48">
                <Search size={13} className="text-gray-400 flex-shrink-0" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, make, model, serial, assigned user…"
                  className="bg-transparent text-xs outline-none w-full text-gray-600 placeholder-gray-400" />
                {search && <button onClick={() => setSearch("")}><X size={13} className="text-gray-400" /></button>}
              </div>
              <div className="relative">
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as AssetType | "All")}
                  className="appearance-none bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs text-gray-600 outline-none focus:border-purple-400 pr-7">
                  <option value="All">All Types</option>
                  {ASSET_TYPES.map((t) => <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>)}
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AssetStatus | "All")}
                  className="appearance-none bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs text-gray-600 outline-none focus:border-purple-400 pr-7">
                  <option value="All">All Statuses</option>
                  {ASSET_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <span className="text-xs text-gray-400">{filtered.length} asset{filtered.length !== 1 ? "s" : ""}</span>
            </div>

            {/* Table */}
            <div className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50 z-10">
                    <tr>
                      {["Asset ID", "Name", "Type", "Make / Model", "Serial No.", "Status", "Assigned To", "Dept.", "Linked Tickets", ""].map((h) => (
                        <th key={h} className="text-left px-4 py-3 font-semibold text-gray-400 text-[10px] uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={10} className="text-center py-12 text-gray-400 text-sm">No assets found</td></tr>
                    ) : filtered.map((asset) => {
                      const sc = STATUS_COLORS[asset.status];
                      const isSelected = selectedAsset?.id === asset.id;
                      return (
                        <tr key={asset.id}
                          onClick={() => setSelectedAsset(isSelected ? null : asset)}
                          className="border-t border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                          style={{ background: isSelected ? "#f5f4ff" : undefined }}>
                          <td className="px-4 py-3 font-semibold whitespace-nowrap" style={{ color: ACCENT }}>{asset.id}</td>
                          <td className="px-4 py-3 max-w-[160px]">
                            <div className="flex items-center gap-1.5">
                              <span className="text-base flex-shrink-0">{TYPE_ICONS[asset.type]}</span>
                              <p className="font-medium text-[#1a1f5e] truncate">{asset.name}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500">{asset.type}</td>
                          <td className="px-4 py-3 max-w-[140px]">
                            <p className="font-medium text-[#1a1f5e] truncate">{asset.make}</p>
                            <p className="text-gray-400 text-[10px] truncate">{asset.model}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-400 whitespace-nowrap font-mono text-[10px]">{asset.serialNumber || "—"}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: sc.bg, color: sc.color }}>
                              {asset.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-[130px]">
                            <p className="text-[#1a1f5e] truncate">{asset.assignedName || "—"}</p>
                            {asset.assignedTo && <p className="text-gray-400 text-[10px] truncate">{asset.assignedTo}</p>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500">{asset.department}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {asset.linkedTicketIds.length > 0 ? (
                              <span className="flex items-center gap-1 text-xs" style={{ color: ACCENT }}>
                                <LinkIcon size={11} />{asset.linkedTicketIds.length}
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isAdmin && (
                              <button onClick={(e) => { e.stopPropagation(); setEditingAsset(asset); setShowForm(true); }}
                                className="w-6 h-6 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400">
                                <Pencil size={11} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Detail panel */}
          {selectedAsset && (
            <AssetPanel
              asset={selectedAsset}
              isAdmin={isAdmin}
              onClose={() => setSelectedAsset(null)}
              onEdit={() => { setEditingAsset(selectedAsset); setShowForm(true); }}
              onDelete={() => handleDelete(selectedAsset)}
            />
          )}
        </div>
      </div>

      {/* Add / Edit modal */}
      {showForm && (
        <AssetForm
          initial={editingAsset}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingAsset(undefined); }}
        />
      )}
    </div>
  );
}
