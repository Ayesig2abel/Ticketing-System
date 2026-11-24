import { useState } from "react";
import { useSLA, PRIORITIES } from "../../data/SLAContext";
import type { TicketPriority } from "../../data/TicketsContext";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";

const ACCENT = "#5f63f2";

const PRIORITY_COLORS: Record<TicketPriority, { color: string; bg: string }> = {
  Critical: { color: "#7c3aed", bg: "#f5f3ff" },
  High: { color: "#ef4444", bg: "#fef2f2" },
  Medium: { color: "#f59e0b", bg: "#fffbeb" },
  Low: { color: "#6b7280", bg: "#f3f4f6" },
};

/** Small reusable inline "name + confirm-delete" row, used at all 3 tree levels. */
function EditableRow({
  name, onRename, onDelete, trailing, indent = 0,
}: {
  name: string;
  onRename: (newName: string) => void;
  onDelete: () => void;
  trailing?: React.ReactNode;
  indent?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const save = () => {
    if (draft.trim() && draft.trim() !== name) onRename(draft.trim());
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2 py-1.5" style={{ paddingLeft: indent }}>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          onBlur={save}
          className="flex-1 border border-purple-300 rounded-lg px-2 py-1 text-sm outline-none text-[#1a1f5e]"
        />
      ) : (
        <span className="flex-1 text-sm text-[#1a1f5e]">{name}</span>
      )}
      {trailing}
      <button onClick={() => { setDraft(name); setEditing(true); }} className="w-6 h-6 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
        <Pencil size={12} />
      </button>
      {confirmingDelete ? (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onDelete} className="text-[11px] font-semibold text-white px-2 py-1 rounded-lg bg-red-500 hover:bg-red-600">Confirm</button>
          <button onClick={() => setConfirmingDelete(false)} className="text-[11px] text-gray-400 px-1.5">Cancel</button>
        </div>
      ) : (
        <button onClick={() => setConfirmingDelete(true)} className="w-6 h-6 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 flex-shrink-0">
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
}

function AddRow({ placeholder, onAdd }: { placeholder: string; onAdd: (name: string) => boolean }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!value.trim()) return;
    const ok = onAdd(value.trim());
    if (!ok) {
      setError("Already exists at this level.");
      return;
    }
    setValue("");
    setError(null);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => { setValue(e.target.value); setError(null); }}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder={placeholder}
        className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-purple-400 text-[#1a1f5e]"
      />
      <button onClick={submit} className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity flex-shrink-0" style={{ background: ACCENT }}>
        <Plus size={11} /> Add
      </button>
      {error && <span className="text-[11px] text-red-500 flex-shrink-0">{error}</span>}
    </div>
  );
}

/**
 * Full 3-level category tree editor: Category → Subcategory → Item
 * (e.g. Technical Support → Hardware → RAM Replacement).
 * Every level supports add / rename / delete, all backed by real state in
 * SLAContext — changes here immediately affect the category dropdowns on
 * RaiseTicketPage, MyTicketsPage, and the TicketsPage filter.
 */
export function CategoryTreeEditor() {
  const {
    categoryTree, categoryDefaults, updateCategoryDefault,
    addCategory, renameCategory, removeCategory,
    addSubcategory, renameSubcategory, removeSubcategory,
    addItem, renameItem, removeItem,
  } = useSLA();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryPriority, setNewCategoryPriority] = useState<TicketPriority>("Medium");
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const subKey = (category: string, sub: string) => `${category}::${sub}`;
  const toggleSubcategory = (category: string, sub: string) => {
    const key = subKey(category, sub);
    setExpandedSubcategories((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleAddCategory = () => {
    setCategoryError(null);
    if (!newCategoryName.trim()) {
      setCategoryError("Category name can't be empty.");
      return;
    }
    const ok = addCategory(newCategoryName, newCategoryPriority);
    if (!ok) {
      setCategoryError("A category with that name already exists.");
      return;
    }
    setNewCategoryName("");
    setNewCategoryPriority("Medium");
  };

  return (
    <div className="space-y-2">
      {categoryTree.map((category) => {
        const priority = categoryDefaults[category.name] ?? "Medium";
        const { color } = PRIORITY_COLORS[priority];
        const isExpanded = expandedCategories.has(category.name);

        return (
          <div key={category.name} className="border border-gray-100 rounded-lg overflow-hidden">
            {/* Level 1: Category */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50">
              <button onClick={() => toggleCategory(category.name)} className="text-gray-400 flex-shrink-0">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              <EditableRow
                name={category.name}
                onRename={(newName) => renameCategory(category.name, newName)}
                onDelete={() => removeCategory(category.name)}
                trailing={
                  <select
                    value={priority}
                    onChange={(e) => updateCategoryDefault(category.name, e.target.value as TicketPriority)}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs font-semibold border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-purple-400 flex-shrink-0"
                    style={{ color }}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                }
              />
              {category.subcategories.length > 0 && (
                <span className="text-[10px] text-gray-400 flex-shrink-0">{category.subcategories.length} subcategor{category.subcategories.length === 1 ? "y" : "ies"}</span>
              )}
            </div>

            {/* Level 2 + 3: Subcategories and items, only when expanded */}
            {isExpanded && (
              <div className="px-3 py-3 space-y-3">
                {category.subcategories.map((sub) => {
                  const subExpanded = expandedSubcategories.has(subKey(category.name, sub.name));
                  return (
                    <div key={sub.name} className="border-l-2 pl-3" style={{ borderColor: "#e5e7eb" }}>
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleSubcategory(category.name, sub.name)} className="text-gray-400 flex-shrink-0">
                          {subExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>
                        <EditableRow
                          name={sub.name}
                          onRename={(newName) => renameSubcategory(category.name, sub.name, newName)}
                          onDelete={() => removeSubcategory(category.name, sub.name)}
                        />
                        {sub.items.length > 0 && (
                          <span className="text-[10px] text-gray-400 flex-shrink-0">{sub.items.length} item{sub.items.length === 1 ? "" : "s"}</span>
                        )}
                      </div>

                      {subExpanded && (
                        <div className="pl-5 mt-1 space-y-1">
                          {sub.items.map((item) => (
                            <EditableRow
                              key={item}
                              name={item}
                              onRename={(newName) => renameItem(category.name, sub.name, item, newName)}
                              onDelete={() => removeItem(category.name, sub.name, item)}
                            />
                          ))}
                          <div className="pt-1">
                            <AddRow placeholder={`Add item under "${sub.name}"…`} onAdd={(name) => addItem(category.name, sub.name, name)} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <AddRow placeholder={`Add subcategory under "${category.name}"…`} onAdd={(name) => addSubcategory(category.name, name)} />
              </div>
            )}
          </div>
        );
      })}

      {categoryTree.length === 0 && (
        <p className="text-xs text-gray-400 italic py-3 text-center">No categories yet — add one below.</p>
      )}

      <div className="border-t pt-4 mt-2">
        <p className="text-xs font-semibold text-gray-500 mb-2">Add a new top-level category</p>
        <div className="flex items-center gap-2">
          <input
            value={newCategoryName}
            onChange={(e) => { setNewCategoryName(e.target.value); setCategoryError(null); }}
            onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
            placeholder="e.g. Account Cancellation"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-400 text-[#1a1f5e]"
          />
          <select
            value={newCategoryPriority}
            onChange={(e) => setNewCategoryPriority(e.target.value as TicketPriority)}
            className="text-xs font-semibold border border-gray-200 rounded-lg px-2 py-2 outline-none focus:border-purple-400"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p} default</option>
            ))}
          </select>
          <button
            onClick={handleAddCategory}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg text-white hover:opacity-90 transition-opacity flex-shrink-0"
            style={{ background: ACCENT }}
          >
            <Plus size={13} /> Add
          </button>
        </div>
        {categoryError && <p className="text-xs text-red-500 mt-1.5">{categoryError}</p>}
      </div>
    </div>
  );
}
