import { useState } from "react";
import { Sidebar } from "../components/layout/Sidebar";
import { UserProfileChip } from "../components/layout/UserProfileChip";
import { useKnowledgeBase } from "../data/KnowledgeBaseContext";
import { useAuth } from "../auth/AuthContext";
import {
  BookOpen, Search, Plus, X, Pencil, Trash2,
  Eye, ChevronLeft, ChevronDown
} from "lucide-react";

const ACCENT = "#5f63f2";
const AVAILABLE_CATEGORIES = ["Hardware", "Software", "Network", "Access Control", "Policies", "Other"];

// Simple markdown-like renderer for the content body
function renderContent(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trim().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i} className="bg-gray-900 text-green-400 rounded-lg px-4 py-3 text-xs overflow-x-auto my-3 leading-relaxed">
          {codeLines.join("\n")}
        </pre>
      );
      i++;
      continue;
    }

    // Table row
    if (line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines
        .filter((l) => !l.trim().replace(/[\s|:-]/g, ""))
        .map((l) => l.split("|").filter((_, ci) => ci > 0 && ci < l.split("|").length - 1).map((c) => c.trim()));
      if (rows.length > 0) {
        elements.push(
          <div key={i} className="overflow-x-auto my-3">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  {rows[0].map((cell, ci) => (
                    <th key={ci} className="border border-gray-200 px-3 py-2 text-left font-semibold text-[#1a1f5e]">{cell}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(1).map((row, ri) => (
                  <tr key={ri} className="hover:bg-gray-50">
                    {row.map((cell, ci) => (
                      <td key={ci} className="border border-gray-200 px-3 py-2 text-gray-600">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Headings and lists
    if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-base font-bold text-[#1a1f5e] mt-5 mb-2">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-sm font-bold text-[#1a1f5e] mt-4 mb-1.5">{line.slice(4)}</h3>);
    } else if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      elements.push(
        <li key={i} className="text-sm text-gray-600 leading-relaxed ml-4 list-disc"
          dangerouslySetInnerHTML={{ __html: inlineFormat(line.trim().slice(2)) }} />
      );
    } else if (/^\d+\. /.test(line.trim())) {
      elements.push(
        <li key={i} className="text-sm text-gray-600 leading-relaxed ml-4 list-decimal"
          dangerouslySetInnerHTML={{ __html: inlineFormat(line.trim().replace(/^\d+\. /, "")) }} />
      );
    } else if (!line.trim()) {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="text-sm text-gray-600 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
      );
    }
    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, '<code class="bg-gray-100 text-purple-700 px-1.5 py-0.5 rounded text-[11px] font-mono">$1</code>');
}

// ─── Article Editor Modal ─────────────────────────────────────────────────────
function ArticleEditor({
  initial,
  onSave,
  onClose,
  categories,
}: {
  initial?: any;
  onSave: (data: any) => void;
  onClose: () => void;
  categories: string[];
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [category, setCategory] = useState(initial?.category ?? categories[0] ?? "");
  const [tags, setTags] = useState(initial?.tags.join(", ") ?? "");
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!title.trim()) { setError("Title is required."); return; }
    if (!content.trim()) { setError("Content is required."); return; }
    onSave({
      title: title.trim(),
      content,
      category,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      status: "Published",
      authorId: user?.id ?? "system",
      author: user?.name ?? "Agent",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full mx-4 flex flex-col overflow-hidden" style={{ maxWidth: 720, maxHeight: "92vh" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-[#1a1f5e]">{initial ? "Edit Article" : "New Article"}</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setPreview(!preview)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
              {preview ? "Edit" : "Preview"}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <input value={title} onChange={(e) => { setTitle(e.target.value); setError(null); }}
            placeholder="Article title"
            className="w-full text-lg font-bold text-[#1a1f5e] outline-none border-b border-gray-200 pb-2 focus:border-purple-400" />

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="appearance-none border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-purple-400 text-gray-600 pr-7">
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <input value={tags} onChange={(e) => setTags(e.target.value)}
              placeholder="Tags (comma-separated)"
              className="flex-1 min-w-40 border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-purple-400 text-gray-600" />
          </div>

          {preview ? (
            <div className="border border-gray-100 rounded-xl p-5 min-h-64">
              {renderContent(content)}
            </div>
          ) : (
            <textarea value={content} onChange={(e) => { setContent(e.target.value); setError(null); }}
              placeholder={`Write your article here. Supports markdown syntax.`}
              rows={18}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#1a1f5e] outline-none focus:border-purple-400 resize-none font-mono leading-relaxed" />
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">Cancel</button>
          <button onClick={submit} className="flex-1 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity" style={{ background: ACCENT }}>
            {initial ? "Save Changes" : "Publish Article"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Article Reader ────────────────────────────────────────────────────────────
function ArticleReader({ article, onBack, onEdit, isAdmin }: {
  article: any;
  onBack: () => void;
  onEdit: () => void;
  isAdmin: boolean;
}) {
  const [voted, setVoted] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 max-w-3xl">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-5">
        <ChevronLeft size={13} /> Back to Knowledge Base
      </button>

      <div className="flex items-start justify-between mb-2">
        <h1 className="text-xl font-bold text-[#1a1f5e] leading-snug flex-1 pr-4">{article.title}</h1>
        {isAdmin && (
          <button onClick={onEdit} className="flex items-center gap-1 text-xs text-gray-400 hover:text-purple-600 flex-shrink-0">
            <Pencil size={12} /> Edit
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap border-b border-gray-100 pb-4">
        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: "#f0f0ff", color: ACCENT }}>
          {article.category}
        </span>
        {(article.tags ?? []).map((tag: string) => (
          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">#{tag}</span>
        ))}
        <span className="text-[10px] text-gray-400 ml-auto">
          By {article.author} · Updated {article.updatedAt} · {article.views} views
        </span>
      </div>

      <div className="prose-like mb-10">
        {renderContent(article.content)}
      </div>

      <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between border border-gray-100">
        <p className="text-xs font-medium text-[#1a1f5e]">Was this article helpful?</p>
        {voted ? (
          <p className="text-xs text-emerald-600 font-medium">Thank you for your feedback!</p>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setVoted(true)} className="text-xs px-3 py-1 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">👍 Yes</button>
            <button onClick={() => setVoted(true)} className="text-xs px-3 py-1 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">👎 No</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function KnowledgeBasePage() {
  const { articles, categories, addArticle, updateArticle, removeArticle, incrementViews } = useKnowledgeBase();
  const { user } = useAuth();
  
  const isAdmin = user?.role === "admin" || user?.role === "agent";

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = articles.filter((a: any) => {
    const matchSearch = !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase()) ||
      a.tags.some((t: string) => t.toLowerCase().includes(search.toLowerCase()));
    const matchCategory = categoryFilter === "All" || a.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const openArticle = (article: any) => {
    incrementViews(article.id);
    setSelectedArticle(article);
  };

  const handleSave = async (data: any) => {
    if (editingArticle) {
      await updateArticle(editingArticle.id, data);
      if (selectedArticle?.id === editingArticle.id) {
        setSelectedArticle({ ...selectedArticle, ...data });
      }
    } else {
      await addArticle(data);
    }
  };

  const groupedByCategory = AVAILABLE_CATEGORIES.reduce<Record<string, any[]>>((acc, cat) => {
    const items = filtered.filter((a: any) => a.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  if (false) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f0f2f8]">
        <p className="text-sm text-gray-400">Loading Knowledge Base...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ fontFamily: "Inter, sans-serif", background: "#f0f2f8" }}>
      <Sidebar active="kb" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-3 bg-white shadow-sm flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: ACCENT }}>
              <BookOpen size={15} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#1a1f5e]">Knowledge Base</h1>
              <p className="text-xs text-gray-400">{articles.length} articles across {AVAILABLE_CATEGORIES.length} categories</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && !selectedArticle && (
              <button
                onClick={() => { setEditingArticle(undefined); setShowEditor(true); }}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-white hover:opacity-90 transition-opacity"
                style={{ background: ACCENT }}
              >
                <Plus size={13} /> New Article
              </button>
            )}
            <UserProfileChip />
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {selectedArticle ? (
            <ArticleReader
              article={selectedArticle}
              onBack={() => setSelectedArticle(null)}
              onEdit={() => { setEditingArticle(selectedArticle); setShowEditor(true); }}
              isAdmin={isAdmin}
            />
          ) : (
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 border border-gray-100 flex-1">
                  <Search size={14} className="text-gray-400 flex-shrink-0" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search articles by title, content, or tag…"
                    className="bg-transparent text-sm outline-none w-full text-gray-600 placeholder-gray-400" />
                  {search && <button onClick={() => setSearch("")}><X size={13} className="text-gray-400" /></button>}
                </div>
                <div className="relative">
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                    className="appearance-none bg-white border border-gray-100 rounded-xl px-3 py-2.5 text-xs text-gray-600 outline-none focus:border-purple-400 pr-7">
                    <option value="All">All Categories</option>
                    {AVAILABLE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <BookOpen size={32} className="text-gray-300 mb-3" />
                  <p className="text-sm text-gray-400">{search ? "No articles match your search." : "No articles yet."}</p>
                </div>
              ) : search || categoryFilter !== "All" ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">{filtered.length} results</p>
                  {filtered.map((article: any) => (
                    <ArticleCard key={article.id} article={article} isAdmin={isAdmin}
                      onOpen={() => openArticle(article)}
                      onEdit={() => { setEditingArticle(article); setShowEditor(true); }}
                      onDelete={() => setConfirmDelete(article.id)}
                      confirmingDelete={confirmDelete === article.id}
                      onConfirmDelete={() => { removeArticle(article.id); setConfirmDelete(null); }}
                      onCancelDelete={() => setConfirmDelete(null)}
                    />
                  ))}
                </div>
              ) : (
                Object.entries(groupedByCategory).map(([cat, items]) => (
                  <div key={cat}>
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{cat}</h2>
                    <div className="space-y-2">
                      {items.map((article: any) => (
                        <ArticleCard key={article.id} article={article} isAdmin={isAdmin}
                          onOpen={() => openArticle(article)}
                          onEdit={() => { setEditingArticle(article); setShowEditor(true); }}
                          onDelete={() => setConfirmDelete(article.id)}
                          confirmingDelete={confirmDelete === article.id}
                          onConfirmDelete={() => { removeArticle(article.id); setConfirmDelete(null); }}
                          onCancelDelete={() => setConfirmDelete(null)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {showEditor && (
        <ArticleEditor
          initial={editingArticle}
          onSave={handleSave}
          onClose={() => { setShowEditor(false); setEditingArticle(undefined); }}
          categories={AVAILABLE_CATEGORIES}
        />
      )}
    </div>
  );
}

// ─── Article Card ─────────────────────────────────────────────────────────────
function ArticleCard({ article, isAdmin, onOpen, onEdit, onDelete, confirmingDelete, onConfirmDelete, onCancelDelete }: {
  article: any;
  isAdmin: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  confirmingDelete: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 hover:border-purple-200 hover:shadow-sm transition-all cursor-pointer group"
      onClick={onOpen}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-[#1a1f5e] group-hover:text-purple-600 transition-colors truncate">
              {article.title}
            </p>
          </div>
          <p className="text-xs text-gray-400 truncate">
            {article.content.replace(/#{1,3} /g, "").replace(/\*\*/g, "").slice(0, 100)}…
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#f0f0ff", color: ACCENT }}>
              {article.category}
            </span>
            {article.tags.slice(0, 3).map((tag: string) => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">#{tag}</span>
            ))}
            <span className="text-[10px] text-gray-300 ml-auto flex items-center gap-1">
              <Eye size={10} /> {article.views}
            </span>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}>
            <button onClick={onEdit} className="w-6 h-6 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400">
              <Pencil size={11} />
            </button>
            {confirmingDelete ? (
              <div className="flex items-center gap-1">
                <button onClick={onConfirmDelete} className="text-[10px] font-semibold text-white px-2 py-0.5 rounded-lg bg-red-500">Delete</button>
                <button onClick={onCancelDelete} className="text-[10px] text-gray-400">Cancel</button>
              </div>
            ) : (
              <button onClick={onDelete} className="w-6 h-6 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-400">
                <Trash2 size={11} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}