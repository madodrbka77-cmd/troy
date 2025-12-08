import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ThumbsUp, MessageCircle, Share2, MoreHorizontal, Globe, Trash2, 
  Pin, Bookmark, Bell, BellOff, Users, UserPlus, Lock, ChevronLeft, 
  ArrowRight, AtSign, BookmarkMinus, Send, Loader2, Image as ImageIcon 
} from 'lucide-react';
import type { Post, User, Comment } from '../types';
import { useLanguage } from '../context/LanguageContext';

// --- 1. Extended Types ---
// Extending the global Post type to include component-specific state properties
// that might not be in the core API response yet.
export type AudienceType = 'public' | 'friends' | 'friends_of_friends' | 'only_me';
export type CommentAudienceType = 'public' | 'friends' | 'mentions';

export interface ExtendedPost extends Post {
  isSaved?: boolean;
  audienceType?: AudienceType;
  commentAudienceType?: CommentAudienceType;
}

interface PostCardProps {
  post: ExtendedPost;
  currentUser: User;
  onTogglePin?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onToggleSave?: (postId: string, isSaved: boolean) => void;
  onUpdateAudience?: (postId: string, newAudience: AudienceType) => void;
  onUpdateCommentAudience?: (postId: string, newCommentAudience: CommentAudienceType) => void;
  observeImage?: (img: HTMLImageElement | null) => void;
  handlers?: any; // Generic handlers passed from parent if needed
}

type MenuView = 'main' | 'audience' | 'comments';

// --- 2. Local Constants & Fallbacks ---
// Fallback text for items missing in the global translation context
const LOCAL_TEXT = {
  ar: {
    confirm_delete: 'هل أنت متأكد أنك تريد حذف هذا المنشور؟',
    menu_pin: 'تثبيت المنشور',
    menu_unpin: 'إلغاء تثبيت المنشور',
    menu_save: 'حفظ المنشور',
    menu_unsave: 'إلغاء الحفظ',
    menu_on_notif: 'تشغيل الإشعارات',
    menu_off_notif: 'إيقاف الإشعارات',
    menu_edit_audience: 'تعديل الجمهور',
    menu_who_comment: 'من يمكنه التعليق',
    menu_trash: 'نقل إلى سلة المهملات',
    aud_public: 'العامة',
    aud_friends: 'الأصدقاء',
    aud_fof: 'أصدقاء الأصدقاء',
    aud_only_me: 'أنا فقط',
    desc_comment: 'اختر من يُسمح له بالتعليق على منشورك.',
    desc_mentions: 'الملفات الشخصية والصفحات التي تذكرها',
    btn_reply: 'رد',
    sending: 'جاري الإرسال...',
    pinned: 'منشور مثبت'
  },
  en: {
    confirm_delete: 'Are you sure you want to delete this post?',
    menu_pin: 'Pin Post',
    menu_unpin: 'Unpin Post',
    menu_save: 'Save Post',
    menu_unsave: 'Unsave Post',
    menu_on_notif: 'Turn on notifications',
    menu_off_notif: 'Turn off notifications',
    menu_edit_audience: 'Edit Audience',
    menu_who_comment: 'Who can comment',
    menu_trash: 'Move to trash',
    aud_public: 'Public',
    aud_friends: 'Friends',
    aud_fof: 'Friends of Friends',
    aud_only_me: 'Only Me',
    desc_comment: 'Choose who is allowed to comment on your post.',
    desc_mentions: 'Profiles and Pages you mention',
    btn_reply: 'Reply',
    sending: 'Sending...',
    pinned: 'Pinned Post'
  }
};

// --- 3. Component ---
const PostCard: React.FC<PostCardProps> = ({ 
  post, 
  currentUser, 
  onTogglePin, 
  onDelete, 
  onToggleSave, 
  onUpdateAudience, 
  onUpdateCommentAudience,
  observeImage
}) => {
  const { t, dir, language } = useLanguage();
  const localT = LOCAL_TEXT[language] || LOCAL_TEXT['en'];

  // Local State
  const [isLiked, setIsLiked] = useState(!!post.isLiked);
  const [likesCount, setLikesCount] = useState(post.likes || 0);
  const [showComments, setShowComments] = useState(false);
  const [localComments, setLocalComments] = useState<Comment[]>(post.comments || []);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Menu States
  const [showMenu, setShowMenu] = useState(false);
  const [menuView, setMenuView] = useState<MenuView>('main');
  const menuRef = useRef<HTMLDivElement>(null);
  const [notificationsOn, setNotificationsOn] = useState(true);
  
  // Settings State
  const [audience, setAudience] = useState<AudienceType>(post.audienceType || 'public');
  const [commentAudience, setCommentAudience] = useState<CommentAudienceType>(post.commentAudienceType || 'public');
  const [isSaved, setIsSaved] = useState(post.isSaved || false);

  // Sync Effect
  useEffect(() => {
    setIsLiked(!!post.isLiked);
    setLikesCount(post.likes || 0);
    setLocalComments(post.comments || []);
    setIsSaved(!!post.isSaved);
    setAudience(post.audienceType || 'public');
    setCommentAudience(post.commentAudienceType || 'public');
  }, [post]);

  // Helpers
  const isVideo = (url?: string) => {
      if (!url) return false;
      return /\.(mp4|webm|ogg|mov)$/i.test(url) || url.startsWith('data:video/');
  };

  const getAudienceIcon = (type: AudienceType) => {
      switch(type) {
          case 'public': return <Globe className="w-3 h-3" />;
          case 'friends': return <Users className="w-3 h-3" />;
          case 'friends_of_friends': return <UserPlus className="w-3 h-3" />;
          case 'only_me': return <Lock className="w-3 h-3" />;
          default: return <Globe className="w-3 h-3" />;
      }
  };

  // Handlers
  const handleLike = useCallback(() => {
    setIsLiked(prev => {
        const newState = !prev;
        setLikesCount(c => newState ? c + 1 : c - 1);
        return newState;
    });
    // In a real app, emit socket or api call here
  }, []);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);

    // Simulate API Call
    setTimeout(() => {
        const comment: Comment = {
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          author: currentUser,
          content: newComment.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          likes: 0
        };

        setLocalComments(prev => [...prev, comment]);
        setNewComment('');
        setIsSubmittingComment(false);
    }, 600);
  };

  // Click Outside for Menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setShowMenu(false);
            setTimeout(() => setMenuView('main'), 200);
        }
    };
    if (showMenu) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const isOwner = post.author.id === currentUser.id;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-4 relative transition-all duration-300 hover:shadow-md" dir={dir}>
      
      {/* Pinned Indicator */}
      {post.isPinned && (
          <div className="px-4 pt-3 text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Pin className="w-3.5 h-3.5 fill-gray-500 text-gray-500" />
              <span>{localT.pinned}</span>
          </div>
      )}

      {/* Header */}
      <div className={`p-4 flex items-start justify-between ${post.isPinned ? 'pt-2' : ''}`}>
        <div className="flex items-center gap-3">
          <img 
            src={post.author.avatar || '/default-avatar.png'} 
            alt={post.author.name} 
            className="h-10 w-10 rounded-full border border-gray-100 object-cover cursor-pointer hover:opacity-90 transition-opacity" 
            onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/40'; }}
          />
          <div className="flex flex-col">
            <h4 className="font-bold text-[15px] hover:underline cursor-pointer text-gray-900 dark:text-white leading-tight">
              {post.author.name}
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              <span className="hover:underline cursor-pointer">{post.timestamp}</span>
              <span>·</span>
              <span title={localT[`aud_${audience}` as keyof typeof localT] || audience}>
                {getAudienceIcon(audience)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Options Menu */}
        <div className="relative" ref={menuRef}>
            <button 
                onClick={() => { setShowMenu(!showMenu); setMenuView('main'); }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full cursor-pointer transition-colors text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600"
                aria-haspopup="true" 
                aria-expanded={showMenu} 
                title={t('profile_more')}
            >
                <MoreHorizontal className="h-5 w-5" />
            </button>

            {showMenu && (
                <div 
                    className={`absolute top-full mt-1 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-20 overflow-hidden origin-top-end ${dir === 'rtl' ? 'left-0' : 'right-0'}`}
                    role="menu"
                >
                    {/* MAIN VIEW */}
                    {menuView === 'main' && (
                        <div className="py-1">
                            <button onClick={() => { onTogglePin?.(post.id); setShowMenu(false); }} className="w-full text-start px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 transition-colors">
                                <Pin className={`w-4.5 h-4.5 ${post.isPinned ? 'fill-current text-blue-600' : ''}`} />
                                {post.isPinned ? localT.menu_unpin : localT.menu_pin}
                            </button>
                            
                            <button onClick={() => { setIsSaved(!isSaved); onToggleSave?.(post.id, !isSaved); setShowMenu(false); }} className="w-full text-start px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 transition-colors">
                                {isSaved ? <BookmarkMinus className="w-4.5 h-4.5 text-blue-600" /> : <Bookmark className="w-4.5 h-4.5" />}
                                {isSaved ? localT.menu_unsave : localT.menu_save}
                            </button>

                            <button onClick={() => setNotificationsOn(!notificationsOn)} className="w-full text-start px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 transition-colors">
                                {notificationsOn ? <BellOff className="w-4.5 h-4.5" /> : <Bell className="w-4.5 h-4.5" />}
                                {notificationsOn ? localT.menu_off_notif : localT.menu_on_notif}
                            </button>

                            <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>

                            <button onClick={() => setMenuView('audience')} className="w-full text-start px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between text-sm text-gray-700 dark:text-gray-200 group transition-colors">
                                <div className="flex items-center gap-3"><Globe className="w-4.5 h-4.5" /> {localT.menu_edit_audience}</div>
                                {dir === 'rtl' ? <ChevronLeft className="w-4 h-4 text-gray-400" /> : <ArrowRight className="w-4 h-4 text-gray-400" />}
                            </button>

                            <button onClick={() => setMenuView('comments')} className="w-full text-start px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between text-sm text-gray-700 dark:text-gray-200 group transition-colors">
                                <div className="flex items-center gap-3"><MessageCircle className="w-4.5 h-4.5" /> {localT.menu_who_comment}</div>
                                {dir === 'rtl' ? <ChevronLeft className="w-4 h-4 text-gray-400" /> : <ArrowRight className="w-4 h-4 text-gray-400" />}
                            </button>

                            {isOwner && (
                                <>
                                    <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                                    <button onClick={() => { if(window.confirm(localT.confirm_delete)) onDelete?.(post.id); setShowMenu(false); }} className="w-full text-start px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 text-sm text-red-600 dark:text-red-400 transition-colors">
                                        <Trash2 className="w-4.5 h-4.5" /> {localT.menu_trash}
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* AUDIENCE VIEW */}
                    {menuView === 'audience' && (
                        <div className="animate-in slide-in-from-right-5 duration-200">
                            <div className="flex items-center gap-2 px-2 py-2 border-b border-gray-100 dark:border-gray-700">
                                <button onClick={() => setMenuView('main')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                                    {dir === 'rtl' ? <ArrowRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                                </button>
                                <span className="font-bold text-sm">{localT.menu_edit_audience}</span>
                            </div>
                            <div className="py-1">
                                {(['public', 'friends', 'friends_of_friends', 'only_me'] as AudienceType[]).map((type) => (
                                    <button 
                                        key={type}
                                        onClick={() => { 
                                            setAudience(type);
                                            onUpdateAudience?.(post.id, type);
                                            setShowMenu(false); 
                                        }}
                                        className={`w-full text-start px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between text-sm transition-colors ${audience === type ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="bg-gray-200 dark:bg-gray-600 p-1.5 rounded-full">{getAudienceIcon(type)}</div>
                                            <span className={`font-medium ${audience === type ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                                {localT[`aud_${type}` as keyof typeof localT] || type}
                                            </span>
                                        </div>
                                        {audience === type && <div className="w-2 h-2 bg-blue-600 rounded-full"></div>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* COMMENTS VIEW */}
                    {menuView === 'comments' && (
                        <div className="animate-in slide-in-from-right-5 duration-200">
                            <div className="flex items-center gap-2 px-2 py-2 border-b border-gray-100 dark:border-gray-700">
                                <button onClick={() => setMenuView('main')} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                                    {dir === 'rtl' ? <ArrowRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                                </button>
                                <span className="font-bold text-sm">{localT.menu_who_comment}</span>
                            </div>
                            <div className="py-1">
                                <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                    {localT.desc_comment}
                                </div>
                                {(['public', 'friends', 'mentions'] as CommentAudienceType[]).map((type) => (
                                     <button 
                                        key={type}
                                        onClick={() => { 
                                            setCommentAudience(type); 
                                            onUpdateCommentAudience?.(post.id, type);
                                            setShowMenu(false); 
                                        }} 
                                        className={`w-full text-start px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between text-sm transition-colors ${commentAudience === type ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="bg-gray-200 dark:bg-gray-600 p-1.5 rounded-full">
                                                {type === 'public' ? <Globe className="w-4 h-4" /> : type === 'friends' ? <Users className="w-4 h-4" /> : <AtSign className="w-4 h-4" />}
                                            </div>
                                            <span className={`font-medium ${commentAudience === type ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                                {type === 'mentions' ? localT.desc_mentions : (localT[`aud_${type}` as keyof typeof localT] || type)}
                                            </span>
                                        </div>
                                        {commentAudience === type && <div className="w-2 h-2 bg-blue-600 rounded-full"></div>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-2">
        <p className="text-[15px] text-gray-900 dark:text-gray-100 whitespace-pre-line leading-relaxed break-words" dir="auto">
            {post.content}
        </p>
      </div>

      {/* Media */}
      {post.image && !imageError && (
        <div className="mt-2 w-full bg-gray-100 dark:bg-black flex justify-center cursor-pointer overflow-hidden">
          {isVideo(post.image) ? (
              <video 
                src={post.image} 
                controls 
                className="w-full max-h-[600px] object-contain"
                preload="metadata"
              />
          ) : (
              <img 
                ref={observeImage} // Using Intersection Observer hook from parent if available
                src={post.image} 
                alt="Content" 
                className="w-full max-h-[600px] object-contain hover:scale-[1.01] transition-transform duration-500"
                onError={() => setImageError(true)}
                loading="lazy"
              />
          )}
        </div>
      )}

      {/* Stats Bar */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 cursor-pointer group">
          {likesCount > 0 && (
            <>
                <div className="bg-blue-500 rounded-full p-1 flex items-center justify-center h-4.5 w-4.5 shadow-sm">
                    <ThumbsUp className="h-2.5 w-2.5 text-white fill-white" />
                </div>
                <span className="text-[13px] text-gray-500 dark:text-gray-400 group-hover:underline">{likesCount}</span>
            </>
          )}
        </div>
        <div className="flex gap-4 text-[13px] text-gray-500 dark:text-gray-400">
          <button className="hover:underline focus:outline-none" onClick={() => setShowComments(!showComments)}>
              {localComments.length} {t('btn_comment')}
          </button>
          <button className="hover:underline focus:outline-none">
              {post.shares || 0} {t('btn_share')}
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-2 pb-2">
        <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-1">
          <button 
            onClick={handleLike}
            className={`flex-1 flex items-center justify-center gap-2 py-2 mx-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-md transition-all active:scale-95 ${isLiked ? 'text-blue-600 font-medium' : 'text-gray-600 dark:text-gray-400'}`}
          >
            <ThumbsUp className={`h-5 w-5 ${isLiked ? 'fill-current' : ''}`} />
            <span className="text-[15px]">{t('btn_like')}</span>
          </button>
          <button 
            onClick={() => setShowComments(prev => !prev)}
            className="flex-1 flex items-center justify-center gap-2 py-2 mx-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-md transition-all active:scale-95 text-gray-600 dark:text-gray-400"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-[15px]">{t('btn_comment')}</span>
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-2 mx-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-md transition-all active:scale-95 text-gray-600 dark:text-gray-400">
            <Share2 className="h-5 w-5" />
            <span className="text-[15px]">{t('btn_share')}</span>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-xl animate-in fade-in duration-300">
          {/* Comments List */}
          <div className="space-y-4 mb-4 max-h-96 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            {localComments.map((comment) => (
              <div key={comment.id} className="flex gap-2 group">
                 <img 
                    src={comment.author.avatar || '/default-avatar.png'} 
                    alt={comment.author.name} 
                    className="h-8 w-8 rounded-full object-cover mt-1" 
                    onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/32'; }}
                 />
                 <div className="flex flex-col max-w-[85%]">
                    <div className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-2xl inline-block relative">
                        <span className="font-bold text-[13px] block cursor-pointer hover:underline text-gray-900 dark:text-white">
                            {comment.author.name}
                        </span>
                        <span className="text-[14px] text-gray-800 dark:text-gray-200 break-words leading-snug" dir="auto">
                            {comment.content}
                        </span>
                    </div>
                    <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400 mx-3 mt-1">
                        <span className="font-semibold cursor-pointer hover:underline">{t('btn_like')}</span>
                        <span className="font-semibold cursor-pointer hover:underline">{localT.btn_reply}</span>
                        <span>{comment.timestamp}</span>
                    </div>
                 </div>
              </div>
            ))}
          </div>

          {/* Comment Input */}
          <div className="flex gap-2 items-start sticky bottom-0">
             <img 
                src={currentUser.avatar || '/default-avatar.png'} 
                alt="User" 
                className="h-8 w-8 rounded-full object-cover mt-1" 
                onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/32'; }}
             />
             <div className="flex-1 relative">
                <form onSubmit={handleCommentSubmit} className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center px-3 py-2 focus-within:ring-2 focus-within:ring-blue-200 dark:focus-within:ring-blue-900 transition-shadow">
                    <input
                        type="text"
                        placeholder={t('write_comment')}
                        className="bg-transparent w-full outline-none text-[15px] placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white disabled:opacity-50"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        disabled={isSubmittingComment}
                        dir="auto"
                        maxLength={500}
                    />
                    <button 
                        type="submit" 
                        disabled={!newComment.trim() || isSubmittingComment} 
                        className="text-blue-600 disabled:text-gray-400 disabled:cursor-not-allowed p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        aria-label={t('btn_comment')}
                    > 
                        {isSubmittingComment ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            dir === 'rtl' ? <Send className="w-5 h-5 rotate-180" /> : <Send className="w-5 h-5" />
                        )}
                    </button>
                </form>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostCard;