import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../auth/AuthContext";
import { Sidebar } from "../components/layout/Sidebar";
import { supabase } from "../lib/supabase";
import { MessageSquare, Send, Search, Circle, ChevronLeft, Loader2 } from "lucide-react";

const ACCENT = "#5f63f2";

// ─── Types ────────────────────────────────────────────────────────────────
type Contact = {
  id: string;          // profiles.id
  name: string;
  email: string;
  role: string;        // customer / agent / admin
  avatar: string;
  color: string;
  online: boolean;
};

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
};

const AVATAR_COLORS = ["#f87171", "#fbbf24", "#c084fc", "#fb923c", "#34d399", "#60a5fa", "#a78bfa", "#f472b6"];

function colorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initialsFor(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "??";
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function MessengerPage() {
  const { user } = useAuth(); // expects user.id to be the profiles.id / auth uid

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [search, setSearch] = useState("");
  const [roleTab, setRoleTab] = useState<"All" | "agent" | "admin" | "customer">("All");

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [unread, setUnread] = useState<Record<string, number>>({});
  const [lastPreview, setLastPreview] = useState<Record<string, { text: string; time: string }>>({});

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Supabase Realtime Presence ───────────────────────────────────────────
  useEffect(() => {
  if (!user?.id) {
    console.error("MessengerPage: user.id is missing or undefined!", user);
    return;
  }

  const channel = supabase.channel("global-presence", {
    config: {
      presence: { key: user.id },
    },
  });

  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      console.log("Current online presence state:", state); // Check your console logs
      const activeIds = new Set<string>(Object.keys(state));
      setOnlineUserIds(activeIds);
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ online_at: new Date().toISOString() });
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}, [user]);

  // ── Load profiles as contacts ────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingContacts(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, role")
        .neq("id", user.id);

      if (error) {
        console.error("Failed to load contacts:", error);
        setLoadingContacts(false);
        return;
      }

      setContacts(
        (data ?? []).map((p: any) => ({
          id: p.id,
          name: p.name || p.email,
          email: p.email,
          role: p.role,
          avatar: initialsFor(p.name || p.email),
          color: colorFor(p.id),
          online: onlineUserIds.has(p.id),
        }))
      );
      setLoadingContacts(false);
    })();
  }, [user, onlineUserIds]);

  // Sync contacts online state when presence state updates
  const contactsWithPresence = contacts.map((contact) => ({
    ...contact,
    online: onlineUserIds.has(contact.id),
  }));

  const activeSelectedContact = selectedContact
    ? { ...selectedContact, online: onlineUserIds.has(selectedContact.id) }
    : null;

  // ── Open (or create) a conversation ──────────────────────────────────────
  const openConversation = useCallback(
    async (contact: Contact) => {
      setSelectedContact(contact);
      setUnread((prev) => ({ ...prev, [contact.id]: 0 }));
      setLoadingMessages(true);
      setMessages([]);

      const { data: convId, error: convErr } = await supabase.rpc(
        "get_or_create_conversation",
        { other_user_id: contact.id }
      );
      if (convErr || !convId) {
        console.error("Failed to open conversation:", convErr);
        setLoadingMessages(false);
        return;
      }
      setConversationId(convId);

      const { data: msgs, error: msgErr } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, text, created_at")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      if (msgErr) {
        console.error("Failed to load messages:", msgErr);
      } else {
        setMessages(
          (msgs ?? []).map((m: any) => ({
            id: m.id,
            conversationId: m.conversation_id,
            senderId: m.sender_id,
            text: m.text,
            createdAt: m.created_at,
          }))
        );
      }
      setLoadingMessages(false);
    },
    []
  );

  // ── Realtime: listen for new messages ────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("messages-inbox")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as any;
          const incoming: Message = {
            id: m.id,
            conversationId: m.conversation_id,
            senderId: m.sender_id,
            text: m.text,
            createdAt: m.created_at,
          };

          if (incoming.conversationId === conversationId) {
            setMessages((prev) => (prev.some((x) => x.id === incoming.id) ? prev : [...prev, incoming]));
          } else if (incoming.senderId !== user.id) {
            setUnread((prev) => ({ ...prev, [incoming.senderId]: (prev[incoming.senderId] ?? 0) + 1 }));
          }

          setLastPreview((prev) => ({
            ...prev,
            [incoming.senderId === user.id ? "__self__" : incoming.senderId]: {
              text: incoming.text,
              time: formatTime(incoming.createdAt),
            },
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send a message ────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !conversationId || !user || sending) return;

    setSending(true);
    setInput("");

    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: user.id, text })
      .select()
      .single();

    setSending(false);

    if (error) {
      console.error("Failed to send message:", error);
      setInput(text);
      return;
    }

    setMessages((prev) =>
      prev.some((m) => m.id === data.id)
        ? prev
        : [
            ...prev,
            {
              id: data.id,
              conversationId: data.conversation_id,
              senderId: data.sender_id,
              text: data.text,
              createdAt: data.created_at,
            },
          ]
    );
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filtered = contactsWithPresence.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchTab = roleTab === "All" || c.role === roleTab;
    return matchSearch && matchTab;
  });

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ fontFamily: "Inter, sans-serif", background: "#f0f2f8" }}>
      <Sidebar active="messenger" />

      <div className="flex-1 flex overflow-hidden">
        {/* Contact list */}
        <div className="w-72 flex-shrink-0 flex flex-col bg-white border-r border-gray-100">
          <div className="px-4 pt-5 pb-3">
            <h2 className="text-sm font-bold text-[#1a1f5e] mb-3">Messages</h2>
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
              <Search size={13} className="text-gray-400 flex-shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search people..."
                className="bg-transparent text-xs outline-none w-full text-gray-600 placeholder-gray-400"
              />
            </div>
          </div>

          <div className="flex gap-1 px-4 mb-2 flex-wrap">
            {(["All", "agent", "admin", "customer"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setRoleTab(t)}
                className="text-xs px-3 py-1 rounded-full font-medium transition-colors capitalize"
                style={{ background: roleTab === t ? ACCENT : "#f0f2f8", color: roleTab === t ? "#fff" : "#9ca3af" }}
              >
                {t === "All" ? "All" : t + "s"}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-2">
            {loadingContacts ? (
              <div className="flex items-center justify-center py-10 text-gray-400">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-10">No people found</p>
            ) : (
              filtered.map((contact) => {
                const preview = lastPreview[contact.id];
                return (
                  <button
                    key={contact.id}
                    onClick={() => openConversation(contact)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-0.5 text-left transition-colors"
                    style={{ background: activeSelectedContact?.id === contact.id ? "#f0f0ff" : "transparent" }}
                  >
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: contact.color }}
                      >
                        {contact.avatar}
                      </div>
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                          contact.online ? "bg-green-400" : "bg-gray-300"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[#1a1f5e] truncate">{contact.name}</p>
                        {preview && <span className="text-[10px] text-gray-400 ml-2 flex-shrink-0">{preview.time}</span>}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-[10px] text-gray-400 truncate capitalize">{preview?.text ?? contact.role}</p>
                        {unread[contact.id] > 0 && (
                          <span
                            className="ml-2 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                            style={{ background: ACCENT }}
                          >
                            {unread[contact.id]}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat thread */}
        <div className="flex-1 flex flex-col">
          {!activeSelectedContact ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
              <MessageSquare size={32} />
              <p className="text-sm">Select someone to start chatting</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedContact(null)} className="md:hidden mr-1 text-gray-400">
                    <ChevronLeft size={18} />
                  </button>
                  <div className="relative">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: activeSelectedContact.color }}
                    >
                      {activeSelectedContact.avatar}
                    </div>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                        activeSelectedContact.online ? "bg-green-400" : "bg-gray-300"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#1a1f5e]">{activeSelectedContact.name}</p>
                    <p className="text-[10px] text-gray-400 flex items-center gap-1 capitalize">
                      {activeSelectedContact.online ? (
                        <>
                          <Circle size={6} className="fill-green-400 text-green-400" />
                          Online
                        </>
                      ) : (
                        <>
                          <Circle size={6} className="fill-gray-300 text-gray-300" />
                          Offline
                        </>
                      )}
                      {" · "}
                      {activeSelectedContact.role}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <Loader2 size={20} className="animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-gray-400">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{ background: activeSelectedContact.color + "22" }}
                    >
                      <MessageSquare size={24} style={{ color: activeSelectedContact.color }} />
                    </div>
                    <p className="text-sm font-medium text-[#1a1f5e]">Start a conversation</p>
                    <p className="text-xs">Send a message to {activeSelectedContact.name}</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === user?.id;
                    return (
                      <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                        {!isMe && (
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mb-1"
                            style={{ background: activeSelectedContact.color }}
                          >
                            {activeSelectedContact.avatar.slice(0, 1)}
                          </div>
                        )}
                        <div className={`max-w-xs lg:max-w-md ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                          <div
                            className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                            style={{
                              background: isMe ? ACCENT : "#fff",
                              color: isMe ? "#fff" : "#1a1f5e",
                              borderBottomRightRadius: isMe ? 4 : undefined,
                              borderBottomLeftRadius: !isMe ? 4 : undefined,
                              boxShadow: isMe ? "none" : "0 1px 4px rgba(0,0,0,0.07)",
                            }}
                          >
                            {msg.text}
                          </div>
                          <span className="text-[10px] text-gray-400 px-1">{formatTime(msg.createdAt)}</span>
                        </div>
                        {isMe && (
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mb-1"
                            style={{ background: ACCENT }}
                          >
                            {user ? initialsFor(user.name || user.email) : "?"}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <div className="px-6 py-4 bg-white border-t border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder={`Message ${activeSelectedContact.name}...`}
                    className="flex-1 bg-transparent text-sm outline-none text-[#1a1f5e] placeholder-gray-400"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || sending}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-opacity flex-shrink-0"
                    style={{ background: input.trim() ? ACCENT : "#d1d5db" }}
                  >
                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 text-center mt-2">
                  Press <kbd className="bg-gray-100 px-1 rounded text-[9px]">Enter</kbd> to send ·{" "}
                  <kbd className="bg-gray-100 px-1 rounded text-[9px]">Shift+Enter</kbd> for new line
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}