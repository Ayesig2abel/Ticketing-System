import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "../lib/supabase";

export interface KBArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  author: string;
  createdAt: string;
  updatedAt: string;
  views: number;
  pinned: boolean;
}

interface KBContextValue {
  articles: KBArticle[];
  categories: string[];
  isLoading: boolean;
  addArticle: (input: Omit<KBArticle, "id" | "createdAt" | "updatedAt" | "views">) => Promise<KBArticle>;
  updateArticle: (updated: KBArticle) => Promise<void>;
  removeArticle: (id: string) => Promise<void>;
  addCategory: (name: string) => boolean;
  removeCategory: (name: string) => void;
  incrementViews: (id: string) => Promise<void>;
}

const KBContext = createContext<KBContextValue | undefined>(undefined);

const DEFAULT_CATEGORIES = [
  "Getting Started", "Account & Billing", "Technical Support",
  "Network & Connectivity", "Hardware", "Software", "Policies",
];

function rowToArticle(row: Record<string, unknown>): KBArticle {
  return {
    id: row.id as string,
    title: row.title as string,
    content: row.content as string,
    category: row.category as string,
    tags: (row.tags as string[]) ?? [],
    author: row.author as string,
    pinned: (row.pinned as boolean) ?? false,
    views: (row.views as number) ?? 0,
    createdAt: new Date(row.created_at as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    updatedAt: new Date(row.updated_at as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  };
}

export function KnowledgeBaseProvider({ children }: { children: ReactNode }) {
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);

  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("kb_articles")
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setArticles((data ?? []).map(rowToArticle));
    } catch (err) {
      console.error("Failed to load KB articles:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const addArticle: KBContextValue["addArticle"] = async (input) => {
    const now = new Date().toISOString();
    const id = `kb-${Date.now()}`;
    const row = {
      id, title: input.title, content: input.content,
      category: input.category, tags: input.tags,
      author: input.author, pinned: input.pinned,
      views: 0, created_at: now, updated_at: now,
    };
    const { error } = await supabase.from("kb_articles").insert(row);
    if (error) throw error;
    const newArticle = rowToArticle(row);
    setArticles((prev) => [newArticle, ...prev]);
    return newArticle;
  };

  const updateArticle: KBContextValue["updateArticle"] = async (updated) => {
    const now = new Date().toISOString();
    const { error } = await supabase.from("kb_articles").update({
      title: updated.title, content: updated.content,
      category: updated.category, tags: updated.tags,
      author: updated.author, pinned: updated.pinned,
      updated_at: now,
    }).eq("id", updated.id);
    if (error) throw error;
    setArticles((prev) => prev.map((a) =>
      a.id === updated.id ? { ...updated, updatedAt: new Date(now).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) } : a
    ));
  };

  const removeArticle: KBContextValue["removeArticle"] = async (id) => {
    const { error } = await supabase.from("kb_articles").delete().eq("id", id);
    if (error) throw error;
    setArticles((prev) => prev.filter((a) => a.id !== id));
  };

  const addCategory: KBContextValue["addCategory"] = (name) => {
    const trimmed = name.trim();
    if (!trimmed || categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) return false;
    setCategories((prev) => [...prev, trimmed]);
    return true;
  };

  const removeCategory: KBContextValue["removeCategory"] = (name) => {
    setCategories((prev) => prev.filter((c) => c !== name));
  };

  const incrementViews: KBContextValue["incrementViews"] = async (id) => {
    const article = articles.find((a) => a.id === id);
    if (!article) return;
    const newViews = article.views + 1;
    await supabase.from("kb_articles").update({ views: newViews }).eq("id", id);
    setArticles((prev) => prev.map((a) => a.id === id ? { ...a, views: newViews } : a));
  };

  return (
    <KBContext.Provider value={{ articles, categories, isLoading, addArticle, updateArticle, removeArticle, addCategory, removeCategory, incrementViews }}>
      {children}
    </KBContext.Provider>
  );
}

export function useKnowledgeBase() {
  const ctx = useContext(KBContext);
  if (!ctx) throw new Error("useKnowledgeBase must be used within a KnowledgeBaseProvider");
  return ctx;
}
