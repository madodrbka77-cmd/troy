import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Camera, Pen, Plus, MessageCircle, UserCheck, ChevronDown, UserMinus, Ban, UserPlus, Clock, LayoutGrid, Flag, Calendar, X, AlertCircle, Lock, CheckCircle, ThumbsUp, Share2, Send, Smile, Globe, Bookmark, BookmarkMinus, Bell, BellOff, Download, Trash2, MoreHorizontal, ChevronRight, ChevronLeft, PlayCircle, Image as ImageIcon, Play, Pause, Heart, Loader2 } from 'lucide-react';
import type { User, Post, TabType, Photo, Album, VideoItem, Story } from '../types';
import CreatePost from './CreatePost';
import PostCard from './PostCard';
import ProfileAbout from './ProfileAbout';
import ProfileFriends from './ProfileFriends';
import ProfilePhotos from './ProfilePhotos';
import ProfileVideos from './ProfileVideos';
import ProfileIntro from './ProfileIntro';
import ProfileGroups from './ProfileGroups';
import ProfilePages from './ProfilePages';
import ProfileEvents from './ProfileEvents';
import { useLanguage } from '../context/LanguageContext';

// --- Security & Config ---
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// --- Interfaces ---
interface ProfileProps {
  currentUser: User;
  viewingUser?: User;
  onFriendClick?: (user: User) => void;
  onMessageClick?: (user: User) => void;
  onFriendAction?: (action: 'unfriend' | 'block', user: User) => void;
  defaultTab?: TabType;
  initialFriendshipStatus?: 'friends' | 'not_friends' | 'request_sent' | 'none';

  // Posts & Stories
  posts: Post[];
  stories?: Story[];
  onPostCreate: (content: string, image?: string) => void;
  onTogglePin?: (postId: string) => void;
  onDeletePost?: (postId: string) => void;

  // Update Handlers
  onUpdateAvatar?: (url: string) => void;
  onUpdateCover?: (url: string) => void;
  onUpdateName?: (newName: string) => void;
  onAddStory?: (url: string) => void;
  onViewStory?: (userId: string) => void;

  // Photos Data
  photos?: Photo[];
  albums?: Album[];
  onAddPhoto?: (photo: Photo) => void;
  onCreateAlbum?: (album: Album) => void;
  onAddPhotoToAlbum?: (albumId: string, photo: Photo) => void;
  onDeletePhoto?: (photoId: string) => void;

  // Videos Data
  userVideos?: VideoItem[];
  onAddVideo?: (video: VideoItem) => void;
  onDeleteVideo?: (videoId: string) => void;

  // Saved Items
  savedPhotos?: Photo[];
  onToggleSave?: (photo: Photo) => void;
  savedVideos?: VideoItem[];
  onToggleSaveVideo?: (video: VideoItem) => void;
}

interface LocalComment {
  id: string;
  user: string;
  avatar: string;
  text: string;
  timestamp: string;
}

interface FloatingEmoji {
  id: number;
  char: string;
  left: number;
}

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🔥", "👏", "🎉", "😍", "🤔", "🙌", "💯", "✨"];
type FriendshipStatus = 'friends' | 'not_friends' | 'request_sent' | 'own_profile';

// --- Utilities ---

// Input Sanitization for Security
const sanitizeInput = (input: string) => input.replace(/[<>]/g, '');

// Custom Hook: Click Outside
const useClickOutside = (ref: React.RefObject<HTMLElement>, handler: () => void) => {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};

// --- Sub-components ---

// 1. Name Change Modal
interface ProfileNameChangeModalProps {
  show: boolean;
  onClose: () => void;
  currentUserName: string;
  onUpdateName: (newName: string) => void;
  isUpdatingName: boolean;
  setIsUpdatingName: (isUpdating: boolean) => void;
}

const ProfileNameChangeModal: React.FC<ProfileNameChangeModalProps> = ({
  show, onClose, currentUserName, onUpdateName, isUpdatingName, setIsUpdatingName
}) => {
  const [newName, setNewName] = useState(currentUserName);
  const [passwordConfirm, setPasswordConfirm] = useState('');

  useEffect(() => {
    setNewName(currentUserName);
  }, [currentUserName]);

  const handleNameSubmit = () => {
    const safeName = sanitizeInput(newName.trim());
    if (!safeName || !passwordConfirm.trim()) return;

    setIsUpdatingName(true);
    // Simulation of API call
    setTimeout(() => {
      onUpdateName(safeName);
      setIsUpdatingName(false);
      onClose();
      setNewName(currentUserName);
      setPasswordConfirm('');
    }, 1500);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn" role="dialog" aria-modal="true" aria-labelledby="name-change-title">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 id="name-change-title" className="font-bold text-lg text-gray-900">تغيير الاسم</h3>
          <button onClick={onClose} className="text-gray-500 hover:bg-gray-200 p-1.5 rounded-full transition" aria-label="إغلاق">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3" role="alert">
            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <span className="font-bold block mb-1">يرجى الانتباه:</span>
              في حال قمت بتغيير اسمك، لن تتمكن من تغييره مرة أخرى لمدة 60 يوماً.
            </div>
          </div>
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
            <input
              type="text"
              id="fullName"
              className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-fb-blue focus:border-transparent outline-none transition"
              placeholder="الاسم الأول واسم العائلة"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={50}
            />
          </div>
          <div className="border-t border-gray-100 my-2"></div>
          <div>
            <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <Lock className="w-4 h-4 text-fb-blue" />
              لأمانك، أدخل كلمة المرور
            </label>
            <input
              type="password"
              id="passwordConfirm"
              className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-fb-blue focus:border-transparent outline-none transition"
              placeholder="كلمة المرور"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
            />
          </div>
        </div>
        <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-md transition">
            إلغاء
          </button>
          <button
            onClick={handleNameSubmit}
            disabled={!newName.trim() || !passwordConfirm.trim() || isUpdatingName}
            className="px-6 py-2 bg-fb-blue text-white font-bold rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            {isUpdatingName ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</>
            ) : (
              'حفظ التغييرات'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// 2. Profile Image Lightbox
interface ProfileImageLightboxProps {
  viewingImage: string | null;
  onClose: () => void;
  profileImagesList: string[];
  currentUser: User;
  onNextImage: (e: React.MouseEvent) => void;
  onPrevImage: (e: React.MouseEvent) => void;
}

const ProfileImageLightbox: React.FC<ProfileImageLightboxProps> = ({
  viewingImage, onClose, profileImagesList, currentUser, onNextImage, onPrevImage
}) => {
  const { t } = useLanguage();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(120);
  const [commentsList, setCommentsList] = useState<LocalComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [commentsList, viewingImage]);

  const handleLike = useCallback(() => {
    setIsLiked(prev => !prev);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
  }, [isLiked]);

  const handleSendComment = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    const safeText = sanitizeInput(commentInput.trim());
    if (!safeText) return;

    const newComment: LocalComment = {
      id: crypto.randomUUID(),
      user: currentUser.name,
      avatar: currentUser.avatar,
      text: safeText,
      timestamp: 'الآن'
    };

    setCommentsList(prev => [...prev, newComment]);
    setCommentInput('');
  }, [commentInput, currentUser]);

  if (!viewingImage) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black bg-opacity-95 flex items-center justify-center animate-fadeIn" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full h-full flex flex-col md:flex-row overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex-1 bg-black flex items-center justify-center relative group">
          <button className="absolute top-4 left-4 p-2 bg-black/50 hover:bg-white/20 rounded-full text-white z-[102]" onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
          {profileImagesList.length > 1 && (
            <button className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-white/20 rounded-full text-white z-10 transition hover:scale-110 hidden md:block" onClick={onPrevImage}>
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
          <img
            src={viewingImage}
            className="max-w-full max-h-[100vh] w-full h-full object-contain"
            alt="Full screen"
          />
          {profileImagesList.length > 1 && (
            <button className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-white/20 rounded-full text-white z-10 transition hover:scale-110 hidden md:block" onClick={onNextImage}>
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
        </div>

        <div className="w-full md:w-[360px] bg-white flex flex-col h-[40vh] md:h-full border-l border-gray-800 shadow-xl">
          <div className="p-4 border-b border-gray-200 flex items-center gap-3 relative">
            <img src={currentUser.avatar} alt={currentUser.name} className="w-10 h-10 rounded-full border border-gray-200 object-cover" />
            <div>
              <h4 className="font-bold text-sm text-gray-900">{currentUser.name}</h4>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span>الآن</span><span>·</span><Globe className="w-3 h-3" />
              </div>
            </div>
            <div className="mr-auto relative">
              <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="px-4 py-3 flex justify-between items-center text-sm text-gray-500 border-b border-gray-100">
            <div className="flex items-center gap-1">
              <div className="bg-fb-blue p-1 rounded-full"><ThumbsUp className="w-3 h-3 text-white fill-current" /></div>
              <span>{likesCount}</span>
            </div>
            <span>{commentsList.length} تعليق</span>
          </div>
          <div className="px-2 py-1 flex items-center justify-between border-b border-gray-200">
            <button onClick={handleLike} className={`flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 rounded-md transition font-medium text-sm ${isLiked ? 'text-fb-blue' : 'text-gray-600'}`}>
              <ThumbsUp className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} /> {t('btn_like')}
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 rounded-md transition font-medium text-gray-600 text-sm">
              <MessageCircle className="w-5 h-5" /> {t('btn_comment')}
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 rounded-md transition font-medium text-gray-600 text-sm">
              <Share2 className="w-5 h-5" /> {t('btn_share')}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar">
            {commentsList.length === 0 ? (
              <div className="text-center text-gray-400 py-10 text-sm">كن أول من يعلق.</div>
            ) : (
              commentsList.map(comment => (
                <div key={comment.id} className="flex gap-2 items-start">
                  <img src={comment.avatar} className="w-8 h-8 rounded-full object-cover" alt={comment.user} />
                  <div className="flex flex-col">
                    <div className="bg-gray-200 px-3 py-2 rounded-2xl rounded-tr-none">
                      <span className="font-bold text-xs block text-gray-900">{comment.user}</span>
                      <span className="text-sm text-gray-800 break-words">{comment.text}</span>
                    </div>
                    <div className="flex gap-3 text-[11px] text-gray-500 pr-2 mt-1">
                      <span className="font-semibold cursor-pointer hover:underline">أعجبني</span>
                      <span className="font-semibold cursor-pointer hover:underline">رد</span>
                      <span>{comment.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={commentsEndRef} />
          </div>

          <div className="p-3 border-t border-gray-200 bg-white">
            <form onSubmit={handleSendComment} className="flex items-center gap-2">
              <img src={currentUser.avatar} className="w-8 h-8 rounded-full object-cover" alt={currentUser.name} />
              <div className="flex-1 relative">
                <input
                  type="text"
                  className="w-full bg-gray-100 border-none rounded-full py-2 px-3 pr-10 text-sm outline-none focus:ring-1 focus:ring-gray-300 transition"
                  placeholder="اكتب تعليقاً..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  maxLength={500}
                />
                <Smile className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer hover:text-gray-700" />
              </div>
              <button type="submit" disabled={!commentInput.trim()} className="text-fb-blue disabled:opacity-50 hover:bg-blue-50 p-2 rounded-full transition">
                <Send className="w-5 h-5 rotate-180" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

// 3. Story Viewer
interface ProfileStoryViewerProps {
  userStories: Story[];
  isViewingStory: boolean;
  setIsViewingStory: (isViewing: boolean) => void;
  onAddStory?: (url: string) => void;
  currentUser: User;
}

const ProfileStoryViewer: React.FC<ProfileStoryViewerProps> = ({
  userStories, isViewingStory, setIsViewingStory, onAddStory, currentUser
}) => {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isStoryPaused, setIsStoryPaused] = useState(false);
  const [isStoryLiked, setIsStoryLiked] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [storyCommentText, setStoryCommentText] = useState('');

  const currentStory = isViewingStory ? userStories[currentStoryIndex] : null;

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isViewingStory && !isStoryPaused) {
      interval = setInterval(() => {
        setStoryProgress(prev => {
          if (prev >= 100) {
            if (currentStoryIndex < userStories.length - 1) {
              setCurrentStoryIndex(p => p + 1);
              return 0;
            } else {
              setIsViewingStory(false);
              return 0;
            }
          }
          return prev + 1;
        });
      }, 50);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isViewingStory, isStoryPaused, currentStoryIndex, userStories.length, setIsViewingStory]);

  useEffect(() => {
    setStoryProgress(0);
    setFloatingEmojis([]);
    setIsStoryLiked(false);
  }, [currentStoryIndex]);

  const triggerEmoji = useCallback((char: string) => {
    const newEmoji: FloatingEmoji = { id: Date.now(), char, left: Math.random() * 60 + 20 };
    setFloatingEmojis(prev => [...prev, newEmoji]);
    setTimeout(() => setFloatingEmojis(prev => prev.filter(e => e.id !== newEmoji.id)), 2000);
    if (char === "❤️") setIsStoryLiked(true);
  }, []);

  const handleNextStory = useCallback(() => {
    if (currentStoryIndex < userStories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    } else {
      setIsViewingStory(false);
    }
  }, [currentStoryIndex, userStories.length, setIsViewingStory]);

  const handlePrevStory = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    }
  }, [currentStoryIndex]);

  if (!isViewingStory || !currentStory) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black text-white flex flex-col animate-fadeIn" role="dialog" aria-modal="true">
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        {floatingEmojis.map(emoji => (
          <div key={emoji.id} className="absolute bottom-24 text-4xl animate-float" style={{ left: `${emoji.left}%` }}>{emoji.char}</div>
        ))}
      </div>

      <div className="absolute top-0 left-0 w-full p-4 bg-gradient-to-b from-black/60 to-transparent z-20">
        <div className="flex gap-1 mb-3">
          {userStories.map((_, idx) => (
            <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <div className={`h-full bg-white transition-all duration-100 ease-linear ${idx === currentStoryIndex ? '' : idx < currentStoryIndex ? 'w-full' : 'w-0'}`} style={{ width: idx === currentStoryIndex ? `${storyProgress}%` : undefined }}></div>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={currentStory.userAvatar} className="w-10 h-10 rounded-full border border-white/50" alt={currentStory.userName} />
            <div className="flex flex-col">
              <span className="font-bold text-sm">{currentStory.userName}</span>
              <span className="text-xs text-white/80">{currentStory.timestamp}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsStoryPaused(!isStoryPaused)}>{isStoryPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}</button>
            <button onClick={() => setIsViewingStory(false)}><X className="w-8 h-8" /></button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative bg-gray-900 overflow-hidden">
        <img src={currentStory.mediaUrl} alt="Story" className="w-full h-full object-contain" />
        <div className="absolute inset-0 flex">
          <div className="w-1/4 h-full cursor-pointer z-10" onClick={handlePrevStory}></div>
          <div className="w-2/4 h-full cursor-pointer z-10" onClick={() => setIsStoryPaused(!isStoryPaused)}></div>
          <div className="w-1/4 h-full cursor-pointer z-10" onClick={handleNextStory}></div>
        </div>
      </div>

      <div className="w-full bg-gradient-to-t from-black via-black/80 to-transparent pt-10 pb-4 px-4 z-40 flex flex-col gap-3">
        <div className="flex justify-center gap-4 mb-1 overflow-x-auto no-scrollbar pb-2">
          {REACTION_EMOJIS.map(emoji => (
            <button key={emoji} onClick={() => triggerEmoji(emoji)} className="text-2xl hover:scale-125 transition active:scale-95 cursor-pointer bg-white/10 rounded-full w-10 h-10 flex-shrink-0 flex items-center justify-center hover:bg-white/20">{emoji}</button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="رد على القصة..."
              className="w-full bg-black/40 border border-white/30 rounded-full px-4 py-3 text-white placeholder-white/60 focus:border-white focus:bg-black/60 outline-none pr-10"
              value={storyCommentText}
              onChange={(e) => setStoryCommentText(e.target.value)}
              onFocus={() => setIsStoryPaused(true)}
              onBlur={() => !storyCommentText && setIsStoryPaused(false)}
            />
            <Smile className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70 cursor-pointer hover:text-white" />
          </div>
          {storyCommentText ? (
            <button onClick={() => { setStoryCommentText(''); setIsStoryPaused(false); }} className="text-fb-blue p-2 hover:bg-white/10 rounded-full transition">
              <Send className="w-6 h-6 rotate-180" />
            </button>
          ) : (
            <button onClick={() => { setIsStoryLiked(prev => !prev); if (!isStoryLiked) triggerEmoji("❤️"); }} className={`p-2 rounded-full transition ${isStoryLiked ? 'text-green-700' : 'text-white hover:bg-white/10'}`}>
              <Heart className={`w-7 h-7 ${isStoryLiked ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main Profile Component ---
const Profile: React.FC<ProfileProps> = ({
  currentUser,
  viewingUser,
  onFriendClick,
  onMessageClick,
  onFriendAction,
  defaultTab,
  initialFriendshipStatus,
  posts,
  stories = [],
  onPostCreate,
  onTogglePin,
  onDeletePost,
  onUpdateAvatar,
  onUpdateCover,
  onUpdateName,
  onAddStory,
  onViewStory,
  photos = [],
  albums = [],
  onAddPhoto,
  onCreateAlbum,
  onAddPhotoToAlbum,
  onDeletePhoto,
  userVideos = [],
  onAddVideo,
  onDeleteVideo,
  savedPhotos = [],
  onToggleSave,
  savedVideos = [],
  onToggleSaveVideo
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab || 'posts');

  // Local UI State
  const [showFriendMenu, setShowFriendMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // Lightbox & Story State
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [profileImagesList, setProfileImagesList] = useState<string[]>([]);
  const [isViewingStory, setIsViewingStory] = useState(false);

  const profileUser = viewingUser || currentUser;
  const isOwnProfile = profileUser.id === currentUser.id;

  // Friendship Status Calculation
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>(() => {
    if (isOwnProfile) return 'own_profile';
    return initialFriendshipStatus === 'friends' ? 'friends' :
           initialFriendshipStatus === 'request_sent' ? 'request_sent' : 'not_friends';
  });

  // Refs
  const friendMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const avatarMenuRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const storyInputRef = useRef<HTMLInputElement>(null);

  useClickOutside(friendMenuRef, () => setShowFriendMenu(false));
  useClickOutside(moreMenuRef, () => setShowMoreMenu(false));
  useClickOutside(avatarMenuRef, () => setShowAvatarMenu(false));

  const userPosts = useMemo(() => posts.filter(post => post.author.id === profileUser.id), [posts, profileUser.id]);
  const userStories = useMemo(() => stories.filter(s => s.userId === profileUser.id), [stories, profileUser.id]);
  const hasActiveStory = userStories.length > 0;

  useEffect(() => {
    setActiveTab(defaultTab || 'posts');
    setShowFriendMenu(false); // Reset menus on user change
    setFriendshipStatus(
      isOwnProfile ? 'own_profile' : (initialFriendshipStatus === 'friends' ? 'friends' : initialFriendshipStatus === 'request_sent' ? 'request_sent' : 'not_friends')
    );
  }, [profileUser.id, defaultTab, isOwnProfile, initialFriendshipStatus]);

  // --- Handlers ---

  // Security: File Validation
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, callback?: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert('حجم الملف كبير جداً. الحد الأقصى هو 5 ميجابايت.');
      e.target.value = '';
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      alert('يرجى اختيار ملف صورة صالح (JPEG, PNG, GIF, WebP).');
      e.target.value = '';
      return;
    }

    if (callback) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) callback(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  }, []);

  const handleOpenLightbox = useCallback((imgSrc: string) => {
    setViewingImage(imgSrc);
  }, []);

  const handleViewAvatar = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAvatarMenu(false);
    if (!profileUser.avatar) return;

    const profileAlbum = albums.find(a => a.type === 'profile' && (a.id === profileUser.id || true)); // Logic adjusted for demo
    let images: string[] = [profileUser.avatar];
    if (profileAlbum && profileAlbum.photos.length > 0) {
      images = [...new Set([profileUser.avatar, ...profileAlbum.photos.map(p => p.url)])];
    }
    setProfileImagesList(images);
    handleOpenLightbox(profileUser.avatar);
  }, [albums, profileUser.avatar, profileUser.id, handleOpenLightbox]);

  const handleViewCover = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profileUser.coverPhoto) return;
    const coverAlbum = albums.find(a => a.type === 'cover'); // Logic adjusted
    let images: string[] = [profileUser.coverPhoto];
    if (coverAlbum && coverAlbum.photos.length > 0) {
        images = [...new Set([profileUser.coverPhoto, ...coverAlbum.photos.map(p => p.url)])];
    }
    setProfileImagesList(images);
    handleOpenLightbox(profileUser.coverPhoto);
  }, [albums, profileUser.coverPhoto, handleOpenLightbox]);

  const handleNextImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!viewingImage || profileImagesList.length <= 1) return;
    const currentIndex = profileImagesList.indexOf(viewingImage);
    const nextIndex = (currentIndex + 1) % profileImagesList.length;
    setViewingImage(profileImagesList[nextIndex]);
  }, [viewingImage, profileImagesList]);

  const handlePrevImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!viewingImage || profileImagesList.length <= 1) return;
    const currentIndex = profileImagesList.indexOf(viewingImage);
    const prevIndex = (currentIndex - 1 + profileImagesList.length) % profileImagesList.length;
    setViewingImage(profileImagesList[prevIndex]);
  }, [viewingImage, profileImagesList]);

  const handleAvatarClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasActiveStory) setShowAvatarMenu(prev => !prev);
    else handleViewAvatar(e);
  }, [hasActiveStory, handleViewAvatar]);

  const handleViewStoryAction = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAvatarMenu(false);
    setIsViewingStory(true);
  }, []);

  const handleAction = useCallback((action: 'unfriend' | 'block') => {
    setShowFriendMenu(false);
    if (action === 'unfriend') setFriendshipStatus('not_friends');
    if (onFriendAction) onFriendAction(action, profileUser);
  }, [onFriendAction, profileUser]);

  const handleAddFriend = useCallback(() => setFriendshipStatus('request_sent'), []);
  const handleCancelRequest = useCallback(() => setFriendshipStatus('not_friends'), []);

  const getTabClass = useCallback((tabName: TabType) =>
    `px-4 py-3 font-semibold cursor-pointer whitespace-nowrap transition rounded-md ${activeTab === tabName ? 'text-fb-blue border-b-[3px] border-fb-blue rounded-none' : 'text-gray-500 hover:bg-gray-100'}`,
  [activeTab]);

  // --- Renderers ---
  const renderFriendButton = () => {
    if (friendshipStatus === 'own_profile') return null;
    if (friendshipStatus === 'friends') {
      return (
        <div className="relative" ref={friendMenuRef}>
          <button onClick={() => setShowFriendMenu(!showFriendMenu)} className="bg-gray-200 text-black px-4 py-2 rounded-md font-semibold flex items-center gap-2 hover:bg-gray-300 transition">
            <UserCheck className="w-5 h-5" /> <span>{t('profile_is_friend')}</span> <ChevronDown className="w-4 h-4" />
          </button>
          {showFriendMenu && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden animate-fadeIn" role="menu">
              <button onClick={() => handleAction('unfriend')} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 text-gray-700 transition text-sm font-medium"><UserMinus className="w-5 h-5 text-red-500" /> إلغاء الصداقة</button>
              <button onClick={() => handleAction('block')} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 text-gray-700 transition text-sm font-medium"><Ban className="w-5 h-5 text-gray-600" /> حظر</button>
            </div>
          )}
        </div>
      );
    } else if (friendshipStatus === 'request_sent') {
      return (
        <button onClick={handleCancelRequest} className="bg-gray-200 text-fb-blue px-4 py-2 rounded-md font-semibold flex items-center gap-2 hover:bg-gray-300 transition">
          <Clock className="w-5 h-5" /> <span>{t('profile_friend_request_sent')}</span>
        </button>
      );
    } else {
      return (
        <button onClick={handleAddFriend} className="bg-fb-blue text-white px-4 py-2 rounded-md font-semibold flex items-center gap-2 hover:bg-blue-700 transition">
          <UserPlus className="w-5 h-5" /> <span>{t('profile_add_friend')}</span>
        </button>
      );
    }
  };

  return (
    <div className="w-full max-w-[940px] mx-auto pb-10 relative">
      <style>{`
        @keyframes floatUp { 0% { transform: translateY(0) scale(0.5); opacity: 0; } 10% { opacity: 1; transform: translateY(-20px) scale(1.2); } 100% { transform: translateY(-300px) scale(1); opacity: 0; } }
        .animate-float { animation: floatUp 2s ease-out forwards; }
      `}</style>

      <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, onUpdateAvatar)} />
      <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, onUpdateCover)} />
      <input type="file" ref={storyInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, onAddStory)} />

      {/* Header */}
      <div className="bg-white shadow-sm rounded-b-xl mb-4 pb-0 relative z-10">
        <div className="relative h-[200px] md:h-[350px] w-full rounded-b-xl overflow-hidden bg-gray-300 group cursor-pointer" onClick={handleViewCover}>
          {profileUser.coverPhoto ? (
            <img src={profileUser.coverPhoto} alt="Cover" className="w-full h-full object-cover transition duration-300 group-hover:brightness-95" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">لا توجد صورة غلاف</div>
          )}
          {isOwnProfile && (
            <button onClick={(e) => { e.stopPropagation(); coverInputRef.current?.click(); }} className="absolute bottom-4 left-4 bg-white px-3 py-1.5 rounded-md flex items-center gap-2 font-semibold text-sm hover:bg-gray-100 transition shadow-sm z-10">
              <Camera className="w-5 h-5" /> <span className="hidden md:inline">{t('profile_edit_cover')}</span>
            </button>
          )}
        </div>

        <div className="px-4 md:px-8 relative pb-4">
          <div className="flex flex-col md:flex-row items-center md:items-end -mt-16 md:-mt-8 mb-4 gap-4">
            <div className="relative z-10" ref={avatarMenuRef}>
              <div onClick={handleAvatarClick} className={`h-32 w-32 md:h-40 md:w-40 rounded-full border-4 overflow-hidden bg-white shadow-md flex items-center justify-center cursor-pointer group ${hasActiveStory ? 'border-green-700' : 'border-white'}`}>
                <img src={profileUser.avatar} alt={profileUser.name} className="w-full h-full object-cover group-hover:brightness-95 transition" />
              </div>
              {showAvatarMenu && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden animate-fadeIn origin-top-left" role="menu">
                  <button onClick={handleViewAvatar} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 text-gray-700 transition text-sm font-medium"><ImageIcon className="w-5 h-5" /> عرض الصورة الشخصية</button>
                  {hasActiveStory && <button onClick={handleViewStoryAction} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 text-gray-700 transition text-sm font-medium border-t border-gray-50"><PlayCircle className="w-5 h-5" /> عرض القصة</button>}
                </div>
              )}
              {isOwnProfile && (
                <div onClick={(e) => { e.stopPropagation(); avatarInputRef.current?.click(); }} className="absolute bottom-2 left-2 bg-gray-200 p-2 rounded-full cursor-pointer hover:bg-gray-300 border-2 border-white z-20">
                  <Camera className="w-5 h-5 text-black" />
                </div>
              )}
            </div>

            <div className="flex-1 text-center md:text-right mb-2 md:mb-4 mt-2 md:mt-0">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                <h1 className="text-3xl font-bold text-black">{profileUser.name}</h1>
                {isOwnProfile && <button onClick={() => setShowNameModal(true)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 transition"><Pen className="w-5 h-5" /></button>}
              </div>
              {friendshipStatus === 'friends' && (
                <><span className="text-gray-500 font-semibold text-[15px]">1.2 ألف صديق</span></>
              )}
            </div>

            <div className="flex items-center gap-3 mb-4 mt-4 md:mt-0 relative">
              {isOwnProfile ? (
                <>
                  <button onClick={() => storyInputRef.current?.click()} className="bg-fb-blue text-white px-4 py-2 rounded-md font-semibold flex items-center gap-2 hover:bg-blue-700 transition"><Plus className="w-5 h-5" /> <span>{t('profile_add_story')}</span></button>
                  <button onClick={() => setActiveTab('about')} className="bg-gray-200 text-black px-4 py-2 rounded-md font-semibold flex items-center gap-2 hover:bg-gray-300 transition"><Pen className="w-4 h-4" /> <span>{t('profile_edit_profile')}</span></button>
                </>
              ) : (
                <>
                  {renderFriendButton()}
                  <button onClick={() => onMessageClick && onMessageClick(profileUser)} className="bg-gray-200 text-black px-4 py-2 rounded-md font-semibold flex items-center gap-2 hover:bg-gray-300 transition"><MessageCircle className="w-5 h-5" /> <span>{t('profile_message')}</span></button>
                </>
              )}
            </div>
          </div>

          <div className="h-[1px] bg-gray-300 w-full mb-1"></div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1 md:gap-4 overflow-x-auto no-scrollbar flex-1">
              {['posts', 'about', 'friends', 'photos', 'videos'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab as TabType)} className={getTabClass(tab as TabType)}>{t(`profile_${tab}`)}</button>
              ))}
            </div>
            <div className="relative flex-shrink-0" ref={moreMenuRef}>
              <button onClick={() => setShowMoreMenu(!showMoreMenu)} className={`flex items-center gap-1 px-4 py-3 font-semibold cursor-pointer whitespace-nowrap transition rounded-md ${['groups', 'pages', 'events'].includes(activeTab) ? 'text-fb-blue border-b-[3px] border-fb-blue rounded-none' : 'text-gray-500 hover:bg-gray-100'}`}>
                <span>{t('profile_more')}</span> <ChevronDown className="w-4 h-4" />
              </button>
              {showMoreMenu && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden animate-fadeIn origin-top-left" role="menu">
                  {['groups', 'pages', 'events'].map(item => (
                    <button key={item} onClick={() => { setActiveTab(item as TabType); setShowMoreMenu(false); }} className="w-full text-right px-4 py-3 hover:bg-gray-100 text-gray-700 transition text-sm font-medium">{t(`profile_${item}`)}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'posts' && (
        <div className="flex flex-col md:flex-row gap-4 px-4 md:px-0 animate-fadeIn relative z-20">
          <div className="w-full md:w-5/12">
            <ProfileIntro currentUser={profileUser} isOwnProfile={isOwnProfile} photos={photos || []} onTabChange={setActiveTab} />
          </div>
          <div className="w-full md:w-7/12">
            {isOwnProfile && <CreatePost currentUser={currentUser} onPostCreate={onPostCreate} />}
            {userPosts.length > 0 ? (
              userPosts.map(post => (
                <PostCard key={post.id} post={post} currentUser={currentUser} onTogglePin={onTogglePin} onDelete={onDeletePost} />
              ))
            ) : (
              <div className="bg-white p-8 rounded-lg shadow-sm text-center text-gray-500">
                <div className="mb-2 text-lg font-semibold">لا توجد منشورات بعد</div>
                <p>عندما يقوم {profileUser.name} بنشر تحديثات، ستظهر هنا.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'about' && <div className="px-4 md:px-0 animate-fadeIn"><ProfileAbout currentUser={profileUser} readonly={!isOwnProfile} /></div>}
      {activeTab === 'friends' && <div className="px-4 md:px-0"><ProfileFriends onFriendClick={onFriendClick} /></div>}
      {activeTab === 'photos' && <div className="px-4 md:px-0"><ProfilePhotos currentUser={profileUser} isOwnProfile={isOwnProfile} photos={photos || []} albums={albums || []} onAddPhoto={onAddPhoto} onCreateAlbum={onCreateAlbum} onAddPhotoToAlbum={onAddPhotoToAlbum} onDeletePhoto={onDeletePhoto} savedPhotos={savedPhotos} onToggleSave={onToggleSave} /></div>}
      {activeTab === 'videos' && <div className="px-4 md:px-0"><ProfileVideos currentUser={profileUser} isOwnProfile={isOwnProfile} userVideos={userVideos} onAddVideo={onAddVideo} onDeleteVideo={onDeleteVideo} savedVideos={savedVideos} onToggleSaveVideo={onToggleSaveVideo} /></div>}
      {activeTab === 'groups' && <div className="px-4 md:px-0 animate-fadeIn"><ProfileGroups /></div>}
      {activeTab === 'pages' && <div className="px-4 md:px-0 animate-fadeIn"><ProfilePages /></div>}
      {activeTab === 'events' && <div className="px-4 md:px-0 animate-fadeIn"><ProfileEvents /></div>}

      <ProfileNameChangeModal show={showNameModal} onClose={() => setShowNameModal(false)} currentUserName={currentUser.name} onUpdateName={onUpdateName || (() => {})} isUpdatingName={isUpdatingName} setIsUpdatingName={setIsUpdatingName} />
      <ProfileImageLightbox viewingImage={viewingImage} onClose={() => setViewingImage(null)} profileImagesList={profileImagesList} currentUser={currentUser} onNextImage={handleNextImage} onPrevImage={handlePrevImage} />
      <ProfileStoryViewer userStories={userStories} isViewingStory={isViewingStory} setIsViewingStory={setIsViewingStory} onAddStory={onAddStory} currentUser={currentUser} />
    </div>
  );
};

export default Profile;