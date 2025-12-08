import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { X, Minus, Send, Phone, Video, Image as ImageIcon, Smile, Mic, MoreHorizontal, Paperclip, Trash2, Copy, Reply, Pin, Edit2, Loader2, AlertCircle } from "lucide-react";
import type { User } from "../types";
import { io, Socket } from "socket.io-client";
import DOMPurify from 'dompurify';

/* ---------- Security & Config ---------- */
const MAX_FILE_SIZE_MB = 2; // Limit file upload size
const MAX_STORED_MSGS = 50; // Prevent LocalStorage overflow
const MAX_TEXT_LENGTH = 1000; // Limit text message length
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'data:', 'blob:'];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/* ---------- Theme ---------- */
const MAIN_BG = "bg-green-600";
const HOVER_BG = "hover:bg-green-700";

/* ---------- Utilities ---------- */
const LS_PREFIX = "tourloop_chat_";

// Security: Sanitize URLs to prevent 'javascript:' execution
const sanitizeUrl = (url?: string): string | undefined => {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return ALLOWED_PROTOCOLS.includes(parsed.protocol) ? url : undefined;
  } catch (e) {
    return undefined;
  }
};

// Security: Sanitize text content using DOMPurify
const sanitizeText = (text: string): string => {
  return DOMPurify.sanitize(text, { 
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: [] 
  }).trim();
};

const saveLS = <T,>(k: string, v: T) => {
  try {
    // Optimization: Only store the last N messages to prevent QuotaExceededError
    if (Array.isArray(v)) {
      const trimmed = v.slice(-MAX_STORED_MSGS);
      localStorage.setItem(LS_PREFIX + k, JSON.stringify(trimmed));
    } else {
      localStorage.setItem(LS_PREFIX + k, JSON.stringify(v));
    }
  } catch (e) {
    console.warn("LocalStorage Save Error (Quota might be full):", e);
  }
};

const loadLS = <T,>(k: string): T | null => {
  try {
    const raw = localStorage.getItem(LS_PREFIX + k);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("LocalStorage Load Error:", e);
    return null;
  }
};

// Security: Robust UID Generator using Crypto API
const uid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  } 
  // Fallback with higher entropy
  return Date.now().toString(36) + Array.from(crypto.getRandomValues(new Uint32Array(2))).map(n => n.toString(36)).join("");
};

const EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍", "🔥", "🎉", "😅", "😍", "🙈", "💀", "😎"];

/* ---------- Types ---------- */
type MsgType = "text" | "image" | "voice" | "system";

interface Message {
  id: string;
  text?: string;
  sender: "me" | "them" | "system";
  timestamp: string;
  type?: MsgType;
  mediaUrl?: string;
  duration?: string;
  seen?: boolean;
  delivered?: boolean;
  edited?: boolean;
  reactions?: Record<string, string[]>;
  replyTo?: string | null;
  pinned?: boolean;
}

interface Props {
  user: User;
  currentUser: User;
  index: number;
  onClose: () => void;
  onUnreadChange?: (room: string, unread: number) => void;
}

/* ---------- Component ---------- */
const ChatWindow: React.FC<Props> = ({ user, currentUser, index, onClose, onUnreadChange }) => {
  // Security: Ensure room ID is consistent and safe
  const room = useMemo(() => [currentUser.id, user.id].sort().join("*"), [currentUser.id, user.id]);
  
  const persisted = loadLS<Message[]>(room);
  const [messages, setMessages] = useState<Message[]>(persisted || [{
    id: "sys_welcome",
    sender: "system",
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    type: "system",
    text: `مرحبًا! يمكنك بدء المحادثة مع ${user.name}`
  }]);

  const [inputText, setInputText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [theyTyping, setTheyTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [online, setOnline] = useState<boolean>(!!user.online);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, msgId: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const typingTimerRef = useRef<number | undefined>(undefined);
  const saveTimerRef = useRef<number | undefined>(undefined);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const CHAT_WINDOW_WIDTH = 340;
  const CHAT_WINDOW_OFFSET = 20;
  // Fixed style calculation to handle RTL if necessary or just absolute positioning
  const stylePos = { 
    left: `${CHAT_WINDOW_OFFSET + index * CHAT_WINDOW_WIDTH}px`,
    // Ensure it doesn't go off-screen on smaller screens
    maxWidth: 'calc(100vw - 40px)' 
  };

  /* ---------------- Helper Functions ---------------- */
  const findMsg = useCallback((id?: string | null) => {
    if (!id) return undefined;
    return messagesRef.current.find(m => m.id === id);
  }, []);

  /* ---------------- Throttled LocalStorage Save ---------------- */
  useEffect(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveLS(room, messages);
    }, 1000); // Debounce save to prevent performance lag
    return () => { if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current); };
  }, [messages, room]);

  /* ---------------- Scroll Logic ---------------- */
  const scrollBottom = useCallback((smooth = true, force = false) => {
    if (!messagesEndRef.current || isMinimized) return;
    const parent = messagesEndRef.current.parentElement;
    if (!parent) return;

    const { scrollHeight, clientHeight, scrollTop } = parent;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;

    if (force || isNearBottom) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    }
  }, [isMinimized]);

  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    const isMyMsg = lastMsg?.sender === "me";
    scrollBottom(true, isMyMsg);

    if (!isMinimized && messages.length > 0 && lastMsg?.sender === "them" && !lastMsg.seen) {
      audioRef.current?.play().catch(() => {}); // Silent catch for autoplay policies
    }
  }, [messages.length, isMinimized, scrollBottom]);

  /* ---------------- Socket Initialization ---------------- */
  useEffect(() => {
    let mounted = true;
    let currentSocket: Socket | null = null;

    const handleFocus = () => {
      if (!mounted) return;
      setUnreadCount(0);
      onUnreadChange?.(room, 0);
      
      const unseenIds = messagesRef.current
        .filter(m => m.sender === "them" && !m.seen)
        .map(m => m.id);
        
      if (unseenIds.length > 0 && currentSocket && currentSocket.connected) {
        unseenIds.forEach(id => {
           currentSocket?.emit("chat:seen", { messageId: id, room, userId: currentUser.id });
        });
        setMessages(prev => prev.map(m => unseenIds.includes(m.id) ? { ...m, seen: true } : m));
      }
    };

    const setupSocket = () => {
      try {
        const globalSocket = (window as any).SOCKET;
        if (globalSocket) {
          currentSocket = globalSocket;
        } else {
          const url = (window as any).API_SOCKET_URL || "http://localhost:5000";
          // Security: Prefer WSS in production, force websocket to avoid polling issues
          currentSocket = io(url, { 
            path: "/socket.io", 
            autoConnect: true, 
            transports: ['websocket'],
            forceNew: false,
            reconnectionAttempts: 5
          });
        }
        
        socketRef.current = currentSocket;
        if (!currentSocket) return;

        currentSocket.emit("chat:join", { room, userId: currentUser.id });

        /* --- Event Handlers --- */
        const onMessage = (msg: Message & { room?: string }) => {
          if (!mounted) return;
          if (msg.room && msg.room !== room) return;

          // Security: Sanitize incoming URL and Text
          if (msg.mediaUrl) msg.mediaUrl = sanitizeUrl(msg.mediaUrl);
          if (msg.text) msg.text = sanitizeText(msg.text);

          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, { ...msg, delivered: true, seen: false }];
          });

          if (isMinimized || !document.hasFocus()) {
            setUnreadCount(c => {
              const newCount = c + 1;
              onUnreadChange?.(room, newCount);
              return newCount;
            });
          } else {
            currentSocket?.emit("chat:seen", { messageId: msg.id, room, userId: currentUser.id });
          }
          currentSocket?.emit("chat:delivered", { messageId: msg.id, room, userId: currentUser.id });
        };

        const onTyping = ({ userId, typing }: { userId: string; typing: boolean }) => {
          if (userId === user.id) setTheyTyping(typing);
        };

        const onStatus = ({ userId, online: onl }: { userId: string; online: boolean }) => {
          if (userId === user.id) setOnline(onl);
        };

        const onSeen = ({ messageId }: { messageId: string }) => {
          if (!mounted) return;
          setMessages(prev => prev.map(m => m.id === messageId ? { ...m, seen: true, delivered: true } : m));
        };

        const onDelivered = ({ messageId }: { messageId: string }) => {
          if (!mounted) return;
          setMessages(prev => prev.map(m => m.id === messageId ? { ...m, delivered: true } : m));
        };

        const onReaction = ({ messageId, emoji, userId }: { messageId: string, emoji: string, userId: string }) => {
          if (!mounted) return;
          setMessages(prev => prev.map(m => {
            if (m.id !== messageId) return m;
            const reactions = { ...(m.reactions || {}) };
            const userIds = reactions[emoji] ? new Set(reactions[emoji]) : new Set();
            if (userIds.has(userId)) userIds.delete(userId);
            else userIds.add(userId);
            reactions[emoji] = Array.from(userIds);
            return { ...m, reactions };
          }));
        };

        const onEdit = ({ messageId, text }: { messageId: string, text: string }) => {
          if (!mounted) return;
          // Security: Sanitize edited text
          const safeText = sanitizeText(text);
          setMessages(prev => prev.map(m => m.id === messageId ? { ...m, text: safeText, edited: true } : m));
        };

        const onDelete = ({ messageId }: { messageId: string }) => {
          if (!mounted) return;
          setMessages(prev => prev.filter(m => m.id !== messageId));
        };

        /* --- Attach Listeners --- */
        currentSocket.on("chat:message", onMessage);
        currentSocket.on("chat:typing", onTyping);
        currentSocket.on("chat:status", onStatus);
        currentSocket.on("chat:seen", onSeen);
        currentSocket.on("chat:delivered", onDelivered);
        currentSocket.on("chat:reaction", onReaction);
        currentSocket.on("chat:edit", onEdit);
        currentSocket.on("chat:delete", onDelete);

        window.addEventListener('focus', handleFocus);
        wrapperRef.current?.addEventListener('click', handleFocus);
        handleFocus();
      } catch (e) {
        console.error("Socket Setup Failed:", e);
      }
    };

    setupSocket();

    return () => {
      mounted = false;
      window.removeEventListener('focus', handleFocus);
      wrapperRef.current?.removeEventListener('click', handleFocus);
      
      if (currentSocket) {
        // Detach all listeners to prevent memory leaks and duplicate handling
        currentSocket.off("chat:message");
        currentSocket.off("chat:typing");
        currentSocket.off("chat:status");
        currentSocket.off("chat:seen");
        currentSocket.off("chat:delivered");
        currentSocket.off("chat:reaction");
        currentSocket.off("chat:edit");
        currentSocket.off("chat:delete");
        
        currentSocket.emit("chat:leave", { room, userId: currentUser.id });
        if (!(window as any).SOCKET) {
            currentSocket.disconnect();
        }
      }
    };
  }, [room, currentUser.id, user.id, isMinimized, onUnreadChange]);

  /* ---------------- Typing Debounce ---------------- */
  useEffect(() => {
    if (!socketRef.current) return;
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    
    socketRef.current.emit("chat:typing", { room, userId: currentUser.id, typing: !!inputText });
    
    typingTimerRef.current = window.setTimeout(() => {
      socketRef.current?.emit("chat:typing", { room, userId: currentUser.id, typing: false });
    }, 1000);

    return () => { if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current); };
  }, [inputText, currentUser.id, room]);

  /* ---------------- Actions ---------------- */
  const sendToSocket = useCallback((payload: Partial<Message>) => {
    const id = uid();
    
    // Security: Sanitize outgoing text
    const cleanText = payload.text ? sanitizeText(payload.text) : undefined;
    
    const msg: Message = {
      id,
      sender: "me",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: payload.type || "text",
      text: cleanText,
      mediaUrl: sanitizeUrl(payload.mediaUrl), // Validate URL before sending
      duration: payload.duration,
      replyTo: payload.replyTo || null,
      reactions: {},
      delivered: false,
      seen: false,
      pinned: false
    };

    setMessages(prev => [...prev, msg]);
    socketRef.current?.emit("chat:message", { ...msg, room, from: currentUser.id });
  }, [currentUser.id, room]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    const txt = inputText.trim();

    if (!txt && !imagePreview && !audioBlob && !editingId) return;

    // Security: Limit Text Length
    if (txt.length > MAX_TEXT_LENGTH) {
      setErrorMessage(`النص طويل جداً (الحد الأقصى ${MAX_TEXT_LENGTH} حرف)`);
      return;
    }

    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      sendToSocket({ type: "voice", mediaUrl: url });
      setAudioBlob(null);
    } else if (imagePreview) {
      sendToSocket({ type: "image", mediaUrl: imagePreview });
      setImagePreview(null);
    } else {
      if (editingId) {
        // Sanitize edited text
        const safeTxt = sanitizeText(txt);
        setMessages(prev => prev.map(m => m.id === editingId ? { ...m, text: safeTxt, edited: true } : m));
        socketRef.current?.emit("chat:edit", { messageId: editingId, text: safeTxt, room });
        setEditingId(null);
      } else {
        sendToSocket({ type: "text", text: txt, replyTo: replyTo || undefined });
      } copii
    }
    setInputText("");
    setReplyTo(null);
    setShowEmojiPicker(false);
    setErrorMessage(null);
  };

  /* ---------------- File & Drag/Drop ---------------- */
  const handleFile = (file?: File | null) => {
    if (!file) return;
    setErrorMessage(null);
    
    // Security: Validate File Type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setErrorMessage("نوع الملف غير مدعوم. يرجى اختيار صورة صالحة.");
      return;
    }

    // Security: Validate File Size (DoS Prevention)
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setErrorMessage(`حجم الملف كبير جداً. الحد الأقصى هو ${MAX_FILE_SIZE_MB} ميجابايت.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        // In a real app, upload 'file' to server here, get URL, then setPreview(url)
        // For this demo, we use Base64 but validated for size/type.
        setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const onDrop = (ev: DragEvent) => {
      ev.preventDefault();
      if (ev.dataTransfer?.files?.[0]) handleFile(ev.dataTransfer.files[0]);
    };
    const onOver = (ev: DragEvent) => ev.preventDefault();

    el.addEventListener("drop", onDrop);
    el.addEventListener("dragover", onOver);
    return () => {
      el.removeEventListener("drop", onDrop);
      el.removeEventListener("dragover", onOver);
    };
  }, []);

  /* ---------------- Voice Recorder ---------------- */
  const startRecording = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      const chunks: BlobPart[] = [];

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        // Security: Check blob size
        if (blob.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            setErrorMessage("التسجيل الصوتي طويل جداً.");
            return;
        }
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      mr.start();
      setRecording(true);
    } catch (e) {
      console.error("Mic Error:", e);
      setErrorMessage("لا يمكن الوصول للميكروفون.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  /* ---------------- Context Menu Handlers ---------------- */
  const handleContextMenu = (e: React.MouseEvent, msgId: string) => {
    e.preventDefault();
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;

    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    // Improved boundary checks
    if (x + 150 > rect.width) x = rect.width - 160;
    if (y + 200 > rect.height) y = rect.height - 210;

    setContextMenu({ x, y, msgId });
  };

  const handleReaction = (msgId: string, emoji: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      const reactions = { ...(m.reactions || {}) };
      const userIds = reactions[emoji] ? new Set(reactions[emoji]) : new Set();
      if (userIds.has(currentUser.id)) userIds.delete(currentUser.id);
      else userIds.add(currentUser.id);
      reactions[emoji] = Array.from(userIds);
      return { ...m, reactions };
    }));
    socketRef.current?.emit("chat:reaction", { messageId: msgId, emoji, userId: currentUser.id, room });
    setContextMenu(null);
  };

  /* ---------------- Render ---------------- */
  return (
    <div
      ref={wrapperRef}
      className={`fixed bottom-0 w-80 bg-white dark:bg-gray-900 shadow-2xl rounded-t-lg border border-gray-200 dark:border-gray-700 z-50 flex flex-col transition-all duration-300 ease-in-out ${isMinimized ? "h-12" : "h-[500px]"}`}
      style={stylePos}
      onClick={() => setContextMenu(null)}
      dir="rtl"
    >
      <audio ref={audioRef} src="/sounds/receive.mp3" preload="auto" />

      {/* HEADER */}
      <div 
        className={`flex items-center justify-between px-3 py-2 ${MAIN_BG} text-white rounded-t-lg cursor-pointer select-none`}
        onClick={() => isMinimized && setIsMinimized(false)}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            {/* Security: Fallback for broken avatar images */}
            <img 
              src={user.avatar || "https://via.placeholder.com/150"} 
              alt={user.name} 
              className="w-9 h-9 rounded-full border-2 border-white/30 object-cover" 
              onError={(e) => e.currentTarget.src = "https://via.placeholder.com/150"}
            />
            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${online ? "bg-green-400" : "bg-gray-400"}`}></div>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm leading-tight">{user.name}</span>
            <span className="text-[10px] opacity-90">{theyTyping ? "يكتب الآن..." : (online ? "متصل" : "غير متصل")}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="p-1.5 hover:bg-white/20 rounded-full transition"><Minus size={18} /></button>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="p-1.5 hover:bg-red-500/80 rounded-full transition"><X size={18} /></button>
        </div>
      </div>

      {/* BODY */}
      {!isMinimized && (
        <>
          {/* Error Message Display */}
          {errorMessage && (
            <div className="bg-red-100 text-red-700 p-2 text-xs flex justify-between items-center">
              <span className="flex items-center gap-1"><AlertCircle size={12}/> {errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="text-red-900 font-bold"><X size={12}/></button>
            </div>
          )}

          {/* Pinned Message */}
          {pinnedId && findMsg(pinnedId) && (
            <div className="bg-yellow-50 dark:bg-yellow-900/30 p-2 text-xs border-b border-yellow-100 dark:border-yellow-800 flex justify-between items-center">
              <div className="flex items-center gap-2 truncate">
                <Pin size={12} className="text-yellow-600" />
                <span className="text-gray-700 dark:text-gray-200 truncate max-w-[200px]">{findMsg(pinnedId)?.text}</span>
              </div>
              <button onClick={() => setPinnedId(null)} className="text-gray-400 hover:text-gray-600"><X size={12}/></button>
            </div>
          )}

          {/* Messages Area */}
          <div 
            className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 bg-gray-50 dark:bg-gray-900 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
            onScroll={() => setShowEmojiPicker(false)}
          >
            {messages.map(m => {
              const isMe = m.sender === "me";
              const isSystem = m.sender === "system";
              const replyMsg = findMsg(m.replyTo);
              
              // Security: Sanitize URL before render
              const safeMediaUrl = sanitizeUrl(m.mediaUrl);

              if (isSystem) {
                return (
                  <div key={m.id} className="flex justify-center my-2">
                    <span className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[10px] px-2 py-1 rounded-full">{m.text}</span>
                  </div>
                );
              }

              return (
                <div 
                  key={m.id} 
                  className={`flex flex-col max-w-[85%] ${isMe ? "self-end items-end" : "self-start items-start"}`}
                  onContextMenu={(e) => handleContextMenu(e, m.id)}
                >
                  {/* Reply Context */}
                  {replyMsg && (
                    <div className={`mb-1 text-[10px] px-2 py-1 rounded opacity-70 border-l-2 ${isMe ? "bg-green-100 border-green-500 text-green-800" : "bg-gray-200 border-gray-500 text-gray-700"}`}>
                      <span className="font-bold block">{replyMsg.sender === 'me' ? 'أنت' : user.name}</span>
                      <span className="truncate block max-w-[150px]">{replyMsg.text || "مرفق"}</span>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div 
                    className={`relative px-3 py-2 text-sm shadow-sm ${
                      isMe 
                        ? `${MAIN_BG} text-white rounded-2xl rounded-tr-none` 
                        : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl rounded-tl-none border dark:border-gray-700"
                    }`}
                  >
                    {m.type === "text" && <p className="whitespace-pre-wrap break-words leading-relaxed">{m.text}</p>}
                    
                    {m.type === "image" && safeMediaUrl && (
                      <img 
                        src={safeMediaUrl} 
                        alt="attachment" 
                        className="rounded-lg max-w-full h-auto max-h-48 object-cover cursor-pointer hover:opacity-95" 
                        // Security: Prevent Reverse Tabnabbing
                        onClick={() => window.open(safeMediaUrl, '_blank', 'noopener,noreferrer')} 
                      />
                    )}
                    
                    {m.type === "voice" && safeMediaUrl && (
                      <div className="flex items-center gap-2 min-w-[150px]">
                        <audio controls src={safeMediaUrl} className="h-8 w-full" />
                      </div>
                    )}

                    {/* Meta Info */}
                    <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${isMe ? "text-green-100" : "text-gray-400"}`}>
                      {m.edited && <span>(معدل)</span>}
                      <span>{m.timestamp}</span>
                      {isMe && (
                        <span className="flex">
                          {m.seen ? <span className="tracking-tighter text-blue-200 font-bold">✓✓</span> : m.delivered ? <span>✓✓</span> : <span>✓</span>}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Reactions */}
                  {m.reactions && Object.keys(m.reactions).length > 0 && (
                    <div className="flex gap-1 mt-1 px-1">
                      {Object.entries(m.reactions).map(([emoji, users]) => (
                        users.length > 0 && (
                          <span key={emoji} className="bg-white dark:bg-gray-700 border dark:border-gray-600 text-[10px] px-1.5 py-0.5 rounded-full shadow-sm cursor-pointer hover:scale-110 transition" onClick={() => handleReaction(m.id, emoji)}>
                            {emoji} {users.length}
                          </span>
                        )
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer / Input Area */}
          <div className="p-2 bg-white dark:bg-gray-900 border-t dark:border-gray-700">
            {/* Previews */}
            {(imagePreview || audioBlob || replyTo || editingId) && (
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-2 rounded-lg mb-2 border dark:border-gray-700">
                <div className="flex items-center gap-2 overflow-hidden">
                  {replyTo && <div className="flex items-center gap-1 text-xs text-gray-500"><Reply size={14}/> <span>الرد على رسالة...</span></div>}
                  {editingId && <div className="flex items-center gap-1 text-xs text-blue-500"><Edit2 size={14}/> <span>جاري التعديل...</span></div>}
                  {imagePreview && <img src={imagePreview} className="w-10 h-10 rounded object-cover" alt="preview" />}
                  {audioBlob && <div className="flex items-center gap-1 text-xs text-red-500"><Mic size={14}/> <span>تم تسجيل مقطع صوتي</span></div>}
                </div>
                <button 
                  onClick={() => { setImagePreview(null); setAudioBlob(null); setReplyTo(null); setEditingId(null); setInputText(""); }}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <form onSubmit={handleSend} className="flex items-end gap-2">
              {recording ? (
                <div className="flex-1 flex items-center justify-between bg-red-50 dark:bg-red-900/20 text-red-600 px-3 py-2 rounded-full animate-pulse">
                  <span className="text-sm font-medium">جاري التسجيل...</span>
                  <button type="button" onClick={stopRecording} className="bg-red-500 text-white p-1 rounded-full hover:bg-red-600"><X size={16}/></button>
                </div>
              ) : (
                <>
                  <div className="flex gap-1 pb-2">
                    <button type="button" onClick={() => fileRef.current?.click()} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"><Paperclip size={20} /></button>
                    <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-gray-400 hover:text-yellow-500 transition"><Smile size={20} /></button>
                  </div>
                  
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      placeholder="اكتب رسالة..."
                      className="w-full bg-gray-100 dark:bg-gray-800 border-0 rounded-2xl px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 dark:text-white"
                      maxLength={MAX_TEXT_LENGTH} // Limit input
                    />
                    {/* Emoji Picker */}
                    {showEmojiPicker && (
                      <div className="absolute bottom-12 left-0 bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-xl rounded-lg p-2 w-64 flex flex-wrap gap-1 z-50">
                        {EMOJIS.map(e => (
                          <button key={e} type="button" className="text-xl p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" onClick={() => setInputText(prev => prev + e)}>{e}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {inputText.trim() || imagePreview || audioBlob ? (
                <button type="submit" className={`${MAIN_BG} ${HOVER_BG} text-white p-2 rounded-full shadow-lg transition transform hover:scale-105`}>
                  <Send size={18} className="ml-0.5" />
                </button>
              ) : (
                !recording && (
                  <button type="button" onClick={startRecording} className="bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-red-500 p-2 rounded-full transition">
                    <Mic size={20} />
                  </button>
                )
              )}
            </form>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
          </div>
        </>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="absolute bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-xl rounded-lg py-1 z-[60] w-36 text-sm overflow-hidden animate-in fade-in zoom-in duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseDown={e => e.stopPropagation()}
        >
          <button onClick={() => { setReplyTo(contextMenu.msgId); setContextMenu(null); }} className="w-full text-right px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 dark:text-gray-200"><Reply size={14}/> رد</button>
          <button onClick={() => { handleReaction(contextMenu.msgId, "❤️"); }} className="w-full text-right px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 dark:text-gray-200"><Smile size={14}/> تفاعل</button>
          <button onClick={() => { navigator.clipboard.writeText(findMsg(contextMenu.msgId)?.text || ""); setContextMenu(null); }} className="w-full text-right px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 dark:text-gray-200"><Copy size={14}/> نسخ</button>
          <button onClick={() => { setPinnedId(contextMenu.msgId); setContextMenu(null); }} className="w-full text-right px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 dark:text-gray-200"><Pin size={14}/> تثبيت</button>
          
          {findMsg(contextMenu.msgId)?.sender === 'me' && (
            <>
              <div className="border-t dark:border-gray-700 my-1"></div>
              <button onClick={() => { setEditingId(contextMenu.msgId); setInputText(findMsg(contextMenu.msgId)?.text || ""); setContextMenu(null); }} className="w-full text-right px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-blue-600"><Edit2 size={14}/> تعديل</button>
              <button onClick={() => { setMessages(p => p.filter(m => m.id !== contextMenu.msgId)); socketRef.current?.emit("chat:delete", { messageId: contextMenu.msgId, room }); setContextMenu(null); }} className="w-full text-right px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-2 text-red-600"><Trash2 size={14}/> حذف</button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatWindow;