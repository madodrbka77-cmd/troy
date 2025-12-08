import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ar';
import { 
  X, Share2, MoreHorizontal, Image as ImageIcon, Send, Plus, Heart, 
  MessageCircle, Loader2, AlertCircle, Eye, Flag, Bookmark, BookmarkMinus, Pin
} from 'lucide-react';
import DOMPurify from 'dompurify';
import type { User, Post, Story } from '../types';
import CreatePost from './CreatePost';
import { useLanguage } from '../context/LanguageContext';

dayjs.extend(relativeTime);
dayjs.locale('ar');

// --- Constants ---
const LS_KEY = 'tourloop_feed_state_v2';
const PAGE_SIZE = 6;
const MAX_COMMENT_LENGTH = 500;

// --- Types Extension ---
interface Comment {
  id: string;
  author: User;
  content: string;
  timestamp: string;
  replies?: Comment[];
}

interface Notification {
  id: string;
  type: string;
  text: string;
  postId?: string;
  reason?: string;
  timestamp: number;
}

// Extended Post type for local state management
type LocalPost = Omit<Post, 'comments' | 'shares'> & {
  comments: Comment[];
  saved: boolean;
  reactionsMap: Record<string, string[]>;
  commentsExpanded: boolean;
  pinned: boolean;
  sharesCount: number;
  reported: boolean;
  seenBy: string[];
};

interface FeedProps {
  currentUser: User;
  stories: Story[];
  posts: Post[];
  onAddStory?: (mediaUrl: string) => void;
  onPostCreate?: (content: string, image?: string) => void;
  onTogglePin?: (postId: string) => void;
  onDeletePost?: (postId: string) => void;
  onToggleSave?: (post: Post) => void;
}

// --- Security & Utilities ---
const generateSecureId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const sanitizeText = (text: string) => DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });

// --- Components ---

// 1. Stories Rail
const StoriesRail: React.FC<{ 
  stories: Story[]; 
  currentUser: User; 
  onAddStory?: () => void; 
  onViewStory: (s: Story) => void 
}> = ({ stories, currentUser, onAddStory, onViewStory }) => {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-1 select-none">
      {/* Add Story Button */}
      <div 
        className="flex flex-col items-center gap-1 min-w-[70px] cursor-pointer group" 
        onClick={onAddStory}
        role="button"
        tabIndex={0}
        aria-label="إضافة قصة"
      >
        <div className="relative w-16 h-16 rounded-full border-2 border-dashed border-blue-500 p-0.5 group-hover:bg-blue-50 transition-colors">
          <img 
            src={currentUser.avatar || 'https://via.placeholder.com/150'}
            alt={currentUser.name}
            className="w-full h-full rounded-full object-cover opacity-80"
            loading="lazy"
          />
          <div className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1 border-2 border-white">
            <Plus className="w-3 h-3" />
          </div>
        </div>
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">قصتك</span>
      </div>

      {/* Stories List */}
      {stories.map(story => (
        <div 
          key={story.id} 
          className="flex flex-col items-center gap-1 min-w-[70px] cursor-pointer group"
          onClick={() => onViewStory(story)}
          role="button"
          tabIndex={0}
        >
          <div className={`w-16 h-16 rounded-full p-0.5 border-2 transition-all group-hover:scale-105 ${story.viewed ? 'border-gray-300' : 'border-blue-600'}`}>
            <img 
              src={story.author?.avatar || 'https://via.placeholder.com/150'} // Fallback for safety
              alt={story.author?.name}
              className="w-full h-full rounded-full object-cover border-2 border-white dark:border-gray-800"
              loading="lazy"
            />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400 truncate w-16 text-center">{story.author?.name}</span>
        </div>
      ))}
    </div>
  );
};

// 2. Feed Post Card (Inline implementation to preserve custom features like 'seenBy' & 'reporting')
interface FeedPostCardProps {
  post: LocalPost;
  currentUser: User;
  handlers: {
    toggleReaction: (id: string, emoji: string) => void;
    toggleSave: (id: string) => void;
    togglePin: (id: string) => void;
    deletePost: (id: string) => void;
    openShareModal: (id: string) => void;
    reportPost: (id: string) => void;
    openSeenModal: (id: string) => void;
    openLightbox: (url: string, type: 'image' | 'video') => void;
    addComment: (id: string, parentId: string | null, text: string) => void;
  };
  observeImage: (node: HTMLImageElement | null) => void;
}

const FeedPostCard: React.FC<FeedPostCardProps> = ({ post, currentUser, handlers, observeImage }) => {
  const [commentText, setCommentText] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const isOwner = post.author.id === currentUser.id;

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    handlers.addComment(post.id, null, commentText);
    setCommentText('');
  };

  return (
    <div className="p-4 relative">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-3">
          <img 
            src={post.author.avatar || 'https://via.placeholder.com/150'} 
            alt={post.author.name} 
            className="w-10 h-10 rounded-full object-cover border border-gray-200"
            loading="lazy"
          />
          <div>
            <div className="flex items-center gap-1">
              <h4 className="font-bold text-sm text-gray-900 dark:text-white">{post.author.name}</h4>
              {post.pinned && <Pin className="w-3 h-3 text-blue-600 fill-current" />}
            </div>
            <span className="text-xs text-gray-500">{dayjs(post.timestamp).fromNow()}</span>
          </div>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setShowOptions(!showOptions)} 
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            aria-label="خيارات"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          
          {showOptions && (
            <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-10 overflow-hidden animate-in fade-in zoom-in duration-100">
              <button onClick={() => { handlers.toggleSave(post.id); setShowOptions(false); }} className="w-full text-right px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                {post.saved ? <BookmarkMinus className="w-4 h-4"/> : <Bookmark className="w-4 h-4"/>} {post.saved ? 'إلغاء الحفظ' : 'حفظ المنشور'}
              </button>
              <button onClick={() => { handlers.openShareModal(post.id); setShowOptions(false); }} className="w-full text-right px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <Share2 className="w-4 h-4"/> مشاركة
              </button>
              <button onClick={() => { handlers.reportPost(post.id); setShowOptions(false); }} className="w-full text-right px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-red-600">
                <Flag className="w-4 h-4"/> إبلاغ
              </button>
              {isOwner && (
                <>
                  <div className="border-t dark:border-gray-700 my-1"></div>
                  <button onClick={() => { handlers.togglePin(post.id); setShowOptions(false); }} className="w-full text-right px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                    <Pin className="w-4 h-4"/> {post.pinned ? 'إلغاء التثبيت' : 'تثبيت'}
                  </button>
                  <button onClick={() => { handlers.deletePost(post.id); setShowOptions(false); }} className="w-full text-right px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-sm text-red-600">
                    <X className="w-4 h-4"/> حذف
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="text-gray-800 dark:text-gray-200 text-sm mb-3 whitespace-pre-wrap leading-relaxed" dir="auto">
        {post.content}
      </p>

      {/* Media */}
      {post.image && (
        <div 
          className="mb-3 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 cursor-pointer relative min-h-[200px]"
          onClick={() => handlers.openLightbox(post.image!, 'image')}
        >
          <img 
            ref={observeImage} 
            data-src={post.image} 
            alt="محتوى المنشور" 
            className="w-full h-auto object-cover max-h-[500px]"
            loading="lazy"
          />
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2 px-1">
        <div className="flex items-center gap-2">
           {post.likes > 0 && (
             <span className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
               <Heart className="w-3 h-3 fill-current" /> {post.likes}
             </span>
           )}
        </div>
        <div className="flex gap-3">
           <span className="cursor-pointer hover:underline">{post.comments?.length || 0} تعليق</span>
           <span className="cursor-pointer hover:underline">{post.sharesCount || 0} مشاركة</span>
           {isOwner && (
             <span 
               className="cursor-pointer hover:underline flex items-center gap-1" 
               onClick={() => handlers.openSeenModal(post.id)}
             >
               <Eye className="w-3 h-3" /> {post.seenBy.length}
             </span>
           )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t dark:border-gray-700">
        <button 
          onClick={() => handlers.toggleReaction(post.id, '❤️')} 
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm ${post.reactionsMap['❤️']?.includes(currentUser.id) ? 'text-red-500 font-bold' : 'text-gray-500'}`}
        >
          <Heart className={`w-5 h-5 ${post.reactionsMap['❤️']?.includes(currentUser.id) ? 'fill-current' : ''}`} />
          أعجبني
        </button>
        <button 
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm text-gray-500"
          onClick={() => {}}
        >
          <MessageCircle className="w-5 h-5" />
          تعليق
        </button>
        <button 
          onClick={() => handlers.openShareModal(post.id)} 
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm text-gray-500"
        >
          <Share2 className="w-5 h-5" />
          مشاركة
        </button>
      </div>

      {/* Comments Section */}
      <div className="mt-3">
        {post.comments && post.comments.slice(0, 3).map((comment) => (
          <div key={comment.id} className="flex gap-2 mb-3 last:mb-0">
             <img src={comment.author.avatar} alt={comment.author.name} className="w-8 h-8 rounded-full object-cover mt-1" />
             <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-3 py-2 text-sm flex-1">
                <span className="font-bold block text-gray-900 dark:text-white text-xs">{comment.author.name}</span>
                <p className="text-gray-800 dark:text-gray-200">{comment.content}</p>
             </div>
          </div>
        ))}
        
        {/* Add Comment Input */}
        <form onSubmit={handleCommentSubmit} className="flex items-center gap-2 mt-3">
           <img src={currentUser.avatar} alt="Me" className="w-8 h-8 rounded-full object-cover" />
           <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder="اكتب تعليقاً..."
                className="w-full bg-gray-100 dark:bg-gray-700 border-none rounded-full py-2 px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                maxLength={MAX_COMMENT_LENGTH}
              />
              <button 
                type="submit" 
                disabled={!commentText.trim()}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-600 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4 rotate-180" />
              </button>
           </div>
        </form>
      </div>
    </div>
  );
};

// 3. Modals
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden transform transition-all scale-100">
      <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
        <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
        <button onClick={onClose} className="text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-full transition">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  </div>
);

const ShareComposer: React.FC<{ onConfirm: (text?: string) => void; onCancel: () => void }> = ({ onConfirm, onCancel }) => {
  const [text, setText] = useState('');
  return (
    <div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="أضف تعليقاً على المشاركة..."
        className="w-full p-3 border rounded-lg mb-4 min-h-[100px] bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
        maxLength={300}
      />
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition">إلغاء</button>
        <button onClick={() => onConfirm(text)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">مشاركة الآن</button>
      </div>
    </div>
  );
};

const ReportComposer: React.FC<{ postId: string; onSubmit: (reason: string) => void; onCancel: () => void }> = ({ onSubmit, onCancel }) => {
  const reasons = ['محتوى مسيء', 'سبام/إعلانات', 'معلومات خاطئة', 'خطاب كراهية', 'آخر'];
  const [sel, setSel] = useState(reasons[0]);
  const [other, setOther] = useState('');
  return (
    <div>
      <div className="flex flex-col gap-3 mb-4">
        {reasons.map(r => (
          <label key={r} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            <input type="radio" name="reason" checked={sel === r} onChange={() => setSel(r)} className="w-4 h-4 text-red-600 focus:ring-red-500" />
            <span className="text-gray-800 dark:text-gray-200 text-sm">{r}</span>
          </label>
        ))}
      </div>
      {sel === 'آخر' && (
        <input
          placeholder="اكتب السبب هنا..."
          value={other}
          onChange={e => setOther(e.target.value)}
          className="w-full p-2 border rounded mb-4 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-red-500 outline-none"
          maxLength={100}
        />
      )}
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition">إلغاء</button>
        <button 
          onClick={() => onSubmit(sel === 'آخر' ? other.trim() : sel)} 
          disabled={sel === 'آخر' && !other.trim()} 
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition"
        >
          إرسال البلاغ
        </button>
      </div>
    </div>
  );
};

// --- Main Feed Component ---

const Feed: React.FC<FeedProps> = ({
  currentUser,
  stories,
  posts,
  onAddStory,
  onPostCreate,
  onTogglePin,
  onDeletePost,
  onToggleSave
}) => {
  const { t } = useLanguage();

  // State Persistence Initialization
  const persisted = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as { posts: LocalPost[]; notifications: Notification[] };
    } catch (e) {
      console.error("LocalStorage Parse Error:", e);
      return null;
    }
  }, []);

  // Local State
  const [localPosts, setLocalPosts] = useState<LocalPost[]>(() => {
    const base = (posts || []).map(p => ({
      ...p,
      // Safety: Ensure comments are initialized properly
      comments: p.comments || [],
      reactionsMap: p.reactions ? transformReactionsArrayToMap(p.reactions) : {},
      commentsExpanded: false,
      saved: false,
      pinned: p.isPinned || false,
      sharesCount: p.shares ?? 0,
      reported: false,
      seenBy: []
    })) as LocalPost[];

    if (persisted?.posts) {
      // Merge persisted state with prop data (priority to props for content, local for interactions)
      const map = new Map<string, LocalPost>();
      base.forEach(b => map.set(b.id, b));
      persisted.posts.forEach(pp => {
        if (map.has(pp.id)) {
          map.set(pp.id, { ...map.get(pp.id)!, ...pp });
        } else {
          map.set(pp.id, pp);
        }
      });
      return Array.from(map.values()).sort(sortPinnedFirst);
    }
    return base.sort(sortPinnedFirst);
  });

  const [loadedCount, setLoadedCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lightbox, setLightbox] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>(persisted?.notifications || []);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Modal States
  const [shareModal, setShareModal] = useState<{ postId: string } | null>(null);
  const [reportModal, setReportModal] = useState<{ postId: string } | null>(null);
  const [seenModal, setSeenModal] = useState<{ postId: string } | null>(null);
  
  const feedRef = useRef<HTMLDivElement | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);

  // Persist State Effect
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ 
        posts: localPosts.slice(0, 50), // Limit persistence size
        notifications: notifications.slice(0, 20) 
      }));
    } catch (e) {
      console.warn("LocalStorage Save Error:", e);
    }
  }, [localPosts, notifications]);

  // Sync Props Effect
  useEffect(() => {
    setLocalPosts(prev => {
      const map = new Map<string, LocalPost>();
      prev.forEach(p => map.set(p.id, p));

      (posts || []).forEach(p => {
        const existing = map.get(p.id);
        const merged: LocalPost = {
          ...p,
          comments: p.comments || [],
          reactionsMap: p.reactions ? transformReactionsArrayToMap(p.reactions) : (existing?.reactionsMap || {}),
          commentsExpanded: existing?.commentsExpanded ?? false,
          saved: existing?.saved ?? false,
          pinned: existing?.pinned ?? p.isPinned ?? false,
          sharesCount: existing?.sharesCount ?? p.shares ?? 0,
          reported: existing?.reported ?? false,
          seenBy: existing?.seenBy ?? []
        };
        map.set(p.id, merged);
      });
      return Array.from(map.values()).sort(sortPinnedFirst);
    });
  }, [posts]);

  // Infinite Scroll
  useEffect(() => {
    const currentLoaderRef = loaderRef.current;
    if (!currentLoaderRef) return;

    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting && !loadingMore && loadedCount < localPosts.length) {
          setLoadingMore(true);
          setTimeout(() => {
             setLoadedCount(prev => Math.min(localPosts.length, prev + PAGE_SIZE));
             setLoadingMore(false);
          }, 500);
        }
      });
    }, { root: null, rootMargin: '300px', threshold: 0.1 });

    obs.observe(currentLoaderRef);
    return () => obs.disconnect();
  }, [loadedCount, loadingMore, localPosts.length]);

  // Helpers
  function transformReactionsArrayToMap(arr?: { emoji: string; users: string[] }[]): Record<string, string[]> {
    if (!arr) return {};
    return arr.reduce((acc: Record<string,string[]>, cur) => { acc[cur.emoji] = cur.users || []; return acc; }, {});
  }

  function sortPinnedFirst(a: LocalPost, b: LocalPost): number {
    if ((a.pinned ? 1 : 0) !== (b.pinned ? 1 : 0)) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
    const ta = dayjs(a.timestamp).isValid() ? dayjs(a.timestamp).valueOf() : 0;
    const tb = dayjs(b.timestamp).isValid() ? dayjs(b.timestamp).valueOf() : 0;
    return tb - ta;
  }

  const addNotification = useCallback((payload: Omit<Notification, 'id' | 'timestamp'>) => {
    setNotifications(prev => [{ id: Date.now().toString(), timestamp: Date.now(), ...payload }, ...prev].slice(0, 30));
  }, []);

  // Handlers
  const handleCreatePost = useCallback((content: string, image?: string) => {
    const safeContent = sanitizeText(content);
    const newPost: LocalPost = {
      id: 'local_' + generateSecureId(),
      author: currentUser,
      content: safeContent,
      image,
      timestamp: new Date().toISOString(),
      likes: 0,
      comments: [],
      shares: 0,
      isPinned: false,
      saved: false,
      reactionsMap: {},
      commentsExpanded: false,
      pinned: false,
      sharesCount: 0,
      reported: false,
      seenBy: []
    };
    setLocalPosts(prev => [newPost, ...prev].sort(sortPinnedFirst));
    addNotification({ type: 'post_created', text: 'تم نشر المنشور بنجاح', postId: newPost.id });
    onPostCreate?.(safeContent, image);
  }, [currentUser, onPostCreate, addNotification]);

  const toggleSave = useCallback((postId: string) => {
    setLocalPosts(prev => {
      const updatedPosts = prev.map(p => p.id === postId ? { ...p, saved: !p.saved } : p);
      const post = updatedPosts.find(p => p.id === postId);
      addNotification({ type: 'save_toggle', text: post?.saved ? 'تم الحفظ' : 'أزيل من المحفوظات', postId });
      if (post && onToggleSave) onToggleSave(post as Post);
      return updatedPosts;
    });
  }, [onToggleSave, addNotification]);

  const togglePin = useCallback((postId: string) => {
    setLocalPosts(prev => {
      const updated = prev.map(p => p.id === postId ? ({ ...p, pinned: !p.pinned }) : { ...p, pinned: false });
      const post = updated.find(p => p.id === postId);
      addNotification({ type: 'pin_toggle', text: post?.pinned ? 'تم التثبيت' : 'تم إلغاء التثبيت', postId });
      onTogglePin?.(postId);
      return updated.sort(sortPinnedFirst);
    });
  }, [onTogglePin, addNotification]);

  const deletePost = useCallback((postId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المنشور؟')) {
        setLocalPosts(prev => prev.filter(p => p.id !== postId));
        addNotification({ type: 'post_deleted', text: 'تم حذف المنشور', postId });
        onDeletePost?.(postId);
    }
  }, [onDeletePost, addNotification]);

  const reportPost = useCallback((postId: string, reason?: string) => {
    setLocalPosts(prev => prev.map(p => p.id === postId ? { ...p, reported: true } : p));
    addNotification({ type: 'reported', text: 'تم الإبلاغ عن المنشور', postId, reason });
    setReportModal(null);
  }, [addNotification]);

  const toggleReaction = useCallback((postId: string, emoji: string) => {
    setLocalPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const map = { ...(p.reactionsMap || {}) };
      const arr = new Set(map[emoji] || []);
      if (arr.has(currentUser.id)) arr.delete(currentUser.id); else arr.add(currentUser.id);
      map[emoji] = Array.from(arr);
      const likesCount = Object.values(map).reduce((s, userIds) => s + userIds.length, 0);
      return { ...p, reactionsMap: map, likes: likesCount };
    }));
  }, [currentUser.id]);

  const addComment = useCallback((postId: string, parentId: string | null, text: string) => {
    const safeText = sanitizeText(text);
    if (!safeText.trim()) return;
    const comment: Comment = { id: 'c_' + generateSecureId(), author: currentUser, content: safeText, timestamp: new Date().toISOString(), replies: [] };
    setLocalPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return { ...p, comments: [...(p.comments || []), comment] };
    }));
    addNotification({ type: 'comment', text: 'تم إضافة تعليق', postId });
  }, [currentUser, addNotification]);

  const openLightbox = useCallback((url: string, type: 'image' | 'video' = 'image') => setLightbox({ url, type }), []);
  
  const observeImage = useCallback((img: HTMLImageElement | null) => {
    if (!img) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          const el = en.target as HTMLImageElement;
          const src = el.dataset.src;
          if (src) {
            el.src = src;
            io.unobserve(el);
          }
        }
      });
    }, { rootMargin: '200px' });
    io.observe(img);
  }, []);

  // Handlers Bundle
  const postHandlers = useMemo(() => ({
    toggleReaction, toggleSave, togglePin, deletePost, 
    openShareModal: (id: string) => setShareModal({ postId: id }), 
    reportPost: (id: string) => setReportModal({ postId: id }), 
    openSeenModal: (id: string) => setSeenModal({ postId: id }), 
    openLightbox, addComment
  }), [toggleReaction, toggleSave, togglePin, deletePost, openLightbox, addComment]);

  const visiblePosts = localPosts.slice(0, loadedCount);

  return (
    <div className="flex-1 max-w-[590px] mx-auto py-6 px-0 md:px-4 min-h-screen bg-gray-50 dark:bg-gray-900" ref={feedRef}>
      {/* Header & Notifications */}
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="font-bold text-2xl text-gray-800 dark:text-white">{t('nav.home') || 'الرئيسية'}</h2>
        <div className="relative">
          <button onClick={() => setShowNotifications(s => !s)} className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <MoreHorizontal className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            {notifications.length > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white dark:border-gray-900">
                {notifications.length}
              </span>
            )}
          </button>
          {showNotifications && (
            <div className="absolute left-0 rtl:right-auto rtl:left-0 mt-2 w-80 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-2xl p-0 z-50 overflow-hidden animate-in fade-in zoom-in duration-100">
              <div className="p-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">الإشعارات</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 && <div className="text-sm text-gray-500 p-4 text-center">لا توجد إشعارات</div>}
                {notifications.map(n => (
                  <div key={n.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b dark:border-gray-700 last:border-0 cursor-pointer transition-colors">
                    <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">{n.text}</p>
                    <span className="text-xs text-gray-400 mt-1 block">{dayjs(n.timestamp).fromNow()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stories Section */}
      <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <StoriesRail 
          stories={stories} 
          currentUser={currentUser} 
          onAddStory={() => onAddStory && onAddStory('')} 
          onViewStory={(s) => openLightbox(s.mediaUrl, 'image')} 
        />
      </div>

      {/* Create Post Section */}
      <div className="mb-6">
        <CreatePost currentUser={currentUser} onPostCreate={handleCreatePost} />
      </div>

      {/* Posts Feed */}
      <div className="space-y-6">
        {visiblePosts.map(post => (
          <div key={post.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300">
            <FeedPostCard
              post={post}
              currentUser={currentUser}
              handlers={postHandlers}
              observeImage={observeImage}
            />
          </div>
        ))}

        {/* Loader */}
        <div ref={loaderRef} className="w-full flex justify-center py-8">
          {loadingMore ? (
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          ) : loadedCount < localPosts.length ? (
            <div className="h-10"></div>
          ) : (
            <div className="text-sm text-gray-400 dark:text-gray-600 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> وصلت للنهاية
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-w-5xl w-full h-full flex items-center justify-center">
            {lightbox.type === 'image' ? (
              <img src={lightbox.url} alt="Full view" className="max-w-full max-h-full object-contain rounded-md shadow-2xl" />
            ) : (
              <video src={lightbox.url} controls autoPlay className="max-w-full max-h-full object-contain rounded-md" />
            )}
            <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
              <X className="w-8 h-8" />
            </button>
          </div>
        </div>
      )}

      {shareModal && (
        <Modal title="مشاركة المنشور" onClose={() => setShareModal(null)}>
           <ShareComposer 
             onConfirm={(text) => { 
                setLocalPosts(prev => prev.map(p => p.id === shareModal.postId ? { ...p, sharesCount: (p.sharesCount || 0) + 1 } : p));
                addNotification({ type: 'shared', text: 'تمت المشاركة', postId: shareModal.postId });
                setShareModal(null);
             }} 
             onCancel={() => setShareModal(null)} 
           />
        </Modal>
      )}

      {reportModal && (
        <Modal title="الإبلاغ عن محتوى" onClose={() => setReportModal(null)}>
          <ReportComposer 
            postId={reportModal.postId} 
            onSubmit={(reason) => reportPost(reportModal.postId, reason)} 
            onCancel={() => setReportModal(null)} 
          />
        </Modal>
      )}

      {seenModal && (
        <Modal title="المشاهدات" onClose={() => setSeenModal(null)}>
           <div className="max-h-60 overflow-y-auto p-2">
              {(localPosts.find(p => p.id === seenModal.postId)?.seenBy || []).length === 0 && <div className="text-center text-gray-500 py-4">لا توجد مشاهدات</div>}
              {(localPosts.find(p => p.id === seenModal.postId)?.seenBy || []).map((uid, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 border-b dark:border-gray-700 last:border-0">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-700">
                    {uid.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium dark:text-gray-200">{uid === currentUser.id ? 'أنت' : `مستخدم ${uid.substring(0, 5)}`}</span>
                </div>
              ))}
            </div>
        </Modal>
      )}
    </div>
  );
};

// CheckCircle Icon needed for loader end state
function CheckCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export default Feed;