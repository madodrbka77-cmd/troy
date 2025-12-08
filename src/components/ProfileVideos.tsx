import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Video, Film, Plus, Play, MoreHorizontal, Clock, Eye, Trash2, X, 
  ChevronRight, ChevronLeft, PictureInPicture, ThumbsUp, MessageCircle, 
  Share2, Send, Smile, Bookmark, BookmarkMinus, Globe, Users, AtSign, 
  UserPlus, Lock, Bell, BellOff, Download, ArrowRight, ArrowLeft, ChevronDown, Loader2, AlertCircle 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { User, VideoItem as BaseVideoItem } from '../types';

// --- Extended Types to handle context inconsistencies ---
export type PrivacyLevel = 'public' | 'friends' | 'friends_of_friends' | 'only_me';
export type CommentAudienceType = 'public' | 'friends' | 'mentions';

// Extend the base type to include UI-specific fields and handle duration type mismatch
export interface ExtendedVideoItem extends Omit<BaseVideoItem, 'duration' | 'commentCount'> {
  duration: string | number; // Handle mismatch between App.tsx (string) and types.ts (number)
  comments?: number; // Handle mismatch with commentCount
  commentCount?: number;
  privacy?: PrivacyLevel;
  commentAudience?: CommentAudienceType;
  isLocal?: boolean;
}

interface ProfileVideosProps {
  currentUser: User;
  isOwnProfile: boolean;
  savedVideos?: ExtendedVideoItem[];
  onToggleSaveVideo?: (video: ExtendedVideoItem) => void;
  userVideos?: ExtendedVideoItem[];
  onAddVideo?: (video: ExtendedVideoItem) => void;
  onDeleteVideo?: (videoId: string) => void;
  onUpdateVideo?: (videoId: string, updates: Partial<ExtendedVideoItem>) => void;
}

interface LocalComment {
    id: string;
    user: string;
    avatar: string;
    text: string;
    timestamp: string;
}

type MenuView = 'main' | 'audience' | 'comments';

// --- Security & Config Constants ---
const MAX_FILE_SIZE_MB = 100; // Limit upload to 100MB
const ALLOWED_MIME_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];

// --- Utility: Secure ID Generator ---
const generateSecureId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `vid_${Date.now()}_${Math.random().toString(36).substring(2)}`;
};

// --- Utility: Format Duration ---
const formatDurationStr = (duration: string | number): string => {
  if (typeof duration === 'string') return duration;
  if (isNaN(duration)) return "0:00";
  const min = Math.floor(duration / 60);
  const sec = Math.floor(duration % 60);
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
};

// --- Helper Components ---
interface PrivacySelectProps { value: PrivacyLevel; onChange: (val: PrivacyLevel) => void; small?: boolean; }

const PrivacySelect: React.FC<PrivacySelectProps> = ({ value, onChange, small }) => {
  const { t, dir } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const options: { val: PrivacyLevel; label: string; icon: React.ElementType }[] = [
    { val: 'public', label: t('privacy.public') || 'عام', icon: Globe },
    { val: 'friends', label: t('privacy.friends') || 'الأصدقاء', icon: Users },
    { val: 'friends_of_friends', label: t('privacy.friendsOfFriends') || 'أصدقاء الأصدقاء', icon: UserPlus },
    { val: 'only_me', label: t('privacy.onlyMe') || 'أنا فقط', icon: Lock },
  ];

  const selected = options.find((o) => o.val === value) || options[0];
  const Icon = selected.icon;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button 
        type="button" 
        onClick={() => setIsOpen(!isOpen)} 
        className={`flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 ${small ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'}`}
      >
        <Icon className={small ? "w-3 h-3" : "w-4 h-4"} /> 
        <span>{selected.label}</span> 
        <ChevronDown className={small ? "w-3 h-3" : "w-3 h-3"} />
      </button>
      {isOpen && (
        <div className={`absolute ${dir === 'rtl' ? 'right-0' : 'left-0'} z-20 mt-1 w-44 bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden animate-fadeIn`}>
          {options.map((opt) => (
            <div 
                key={opt.val} 
                onClick={() => { onChange(opt.val); setIsOpen(false); }} 
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm ${value === opt.val ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'}`}
            >
              <opt.icon className="w-4 h-4" /> <span>{opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ProfileVideos: React.FC<ProfileVideosProps> = ({
    currentUser,
    isOwnProfile,
    savedVideos = [],
    onToggleSaveVideo,
    userVideos = [],
    onAddVideo,
    onDeleteVideo,
    onUpdateVideo
}) => {
  const { t, dir } = useLanguage();
  const [activeTab, setActiveTab] = useState<'videos' | 'reels'>('videos');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);

  // Derived state
  const videos = useMemo(() => userVideos.filter(v => v.type === 'video'), [userVideos]);
  const reels = useMemo(() => userVideos.filter(v => v.type === 'reel'), [userVideos]);

  // Lightbox State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [activePlaylist, setActivePlaylist] = useState<ExtendedVideoItem[]>([]);

  // Interaction State
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsList, setCommentsList] = useState<LocalComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  
  // Menu & Settings State
  const [showMenu, setShowMenu] = useState(false);
  const [menuView, setMenuView] = useState<MenuView>('main');
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [currentVideoAudience, setCurrentVideoAudience] = useState<PrivacyLevel>('public');
  const [currentVideoCommentAudience, setCurrentVideoCommentAudience] = useState<CommentAudienceType>('public');

  // Upload State
  const [uploadPrivacy, setUploadPrivacy] = useState<PrivacyLevel>('public');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // --- Cleanup Effect for Blob URLs ---
  useEffect(() => {
    // Cleanup function to revoke object URLs when component unmounts or videos change
    return () => {
        userVideos.forEach(video => {
            if (video.isLocal && video.url.startsWith('blob:')) {
                URL.revokeObjectURL(video.url);
            }
        });
    };
  }, [userVideos]);

  // --- Event Listeners ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setShowMenu(false);
            setMenuView('main');
        }
    };
    if (showMenu) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  useEffect(() => {
      if (lightboxOpen) {
          commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [commentsList, lightboxOpen]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (!lightboxOpen) return;
          
          switch(e.key) {
              case 'Escape':
                  closeLightbox();
                  break;
              case 'ArrowRight':
                  if (dir === 'rtl') prevVideo(); else nextVideo();
                  break;
              case 'ArrowLeft':
                  if (dir === 'rtl') nextVideo(); else prevVideo();
                  break;
              case ' ': 
                  e.preventDefault();
                  if (videoPlayerRef.current) {
                      if (videoPlayerRef.current.paused) videoPlayerRef.current.play();
                      else videoPlayerRef.current.pause();
                  }
                  break;
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, activeVideoIndex, activePlaylist, dir]);

  // --- Helpers ---

  const getVideoMetadata = (url: string): Promise<{ duration: number, width: number, height: number }> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
            resolve({
                duration: video.duration,
                width: video.videoWidth,
                height: video.videoHeight
            });
        };
        video.onerror = () => reject("Error loading video metadata");
        video.src = url;
    });
  };

  const getAudienceIcon = useCallback((type: PrivacyLevel) => {
      switch(type) {
          case 'public': return <Globe className="w-3 h-3" />;
          case 'friends': return <Users className="w-3 h-3" />;
          case 'friends_of_friends': return <UserPlus className="w-3 h-3" />;
          case 'only_me': return <Lock className="w-3 h-3" />;
          default: return <Globe className="w-3 h-3" />;
      }
  }, []);

  const getAudienceLabel = useCallback((type: PrivacyLevel) => {
    const labels: Record<string, string> = {
        public: t('privacy.public') || 'عام',
        friends: t('privacy.friends') || 'الأصدقاء',
        friends_of_friends: t('privacy.friendsOfFriends') || 'أصدقاء الأصدقاء',
        only_me: t('privacy.onlyMe') || 'أنا فقط'
    };
    return labels[type] || labels['public'];
  }, [t]);

  const getCommentAudienceLabel = useCallback((type: CommentAudienceType) => {
    const labels: Record<string, string> = {
        public: t('commentAudience.public') || 'عام',
        friends: t('commentAudience.friends') || 'الأصدقاء',
        mentions: t('commentAudience.mentions') || 'الملفات الشخصية التي تذكرها'
    };
    return labels[type] || labels['public'];
  }, [t]);

  // --- Security: File Validation ---
  const validateVideoFile = (file: File): string | null => {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          return t('errors.invalidFileType') || 'نوع الملف غير صالح. يُسمح فقط بـ MP4 و WebM و OGG.';
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          return (t('errors.fileTooLarge') || 'حجم الملف كبير جدًا.') + ` الحد الأقصى: ${MAX_FILE_SIZE_MB} ميجابايت`;
      }
      return null;
  };

  // --- Handlers ---

  const handleFileClick = () => {
      setUploadError(null);
      fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // 1. Security Check
      const error = validateVideoFile(file);
      if (error) {
          setUploadError(error);
          e.target.value = ''; // Reset input
          return;
      }

      if (onAddVideo) {
          setIsUploading(true);
          try {
              // 2. Performance Fix: Use Blob URL instead of Base64
              const objectUrl = URL.createObjectURL(file);
              
              const meta = await getVideoMetadata(objectUrl);
              const isReel = meta.height > meta.width;
              const detectedType = isReel ? 'reel' : 'video';

              const newItem: ExtendedVideoItem = {
                  id: generateSecureId(), // 3. Security Fix: Stronger ID
                  url: objectUrl,
                  title: isReel ? (t('upload.newReelTitle') || 'ريلز جديد') : (t('upload.newVideoTitle') || 'فيديو جديد'),
                  views: 0,
                  timestamp: new Date().toLocaleDateString(),
                  duration: formatDurationStr(meta.duration),
                  type: detectedType,
                  likes: 0,
                  comments: 0,
                  commentCount: 0,
                  privacy: uploadPrivacy,
                  commentAudience: 'public',
                  isLocal: true // Mark for cleanup
              };

              onAddVideo(newItem);
              
              if (detectedType === 'video') setActiveTab('videos');
              else setActiveTab('reels');
              
          } catch (error) {
              console.error("Upload failed", error);
              setUploadError(t('errors.uploadFailed') || 'فشل في معالجة الفيديو.');
          } finally {
              setIsUploading(false);
          }
      }
      e.target.value = '';
  };

  const handleDelete = (id: string) => {
     if (onDeleteVideo) {
         // Cleanup Blob URL if it exists in the current video
         const videoToDelete = userVideos.find(v => v.id === id);
         if (videoToDelete?.isLocal && videoToDelete.url.startsWith('blob:')) {
             URL.revokeObjectURL(videoToDelete.url);
         }

         setLightboxOpen(false);
         onDeleteVideo(id);
     }
     setShowMenu(false);
  };

  const resetLightboxState = useCallback((video: ExtendedVideoItem) => {
      setLikesCount(video.likes);
      setIsLiked(false);
      setCommentsList([]); 
      setShowMenu(false);
      setMenuView('main');
      setCurrentVideoAudience(video.privacy || 'public');
      setCurrentVideoCommentAudience(video.commentAudience || 'public');
  }, []);

  const openLightbox = (index: number, playlist: ExtendedVideoItem[]) => {
      setActivePlaylist(playlist);
      setActiveVideoIndex(index);
      setLightboxOpen(true);
      resetLightboxState(playlist[index]);
      setNotificationsOn(true);
  };

  const closeLightbox = () => {
      setLightboxOpen(false);
      setActivePlaylist([]);
      setActiveVideoIndex(0);
      if (document.pictureInPictureElement) {
          document.exitPictureInPicture().catch(console.error);
      }
  };

  const nextVideo = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      const newIndex = (activeVideoIndex + 1) % activePlaylist.length;
      setActiveVideoIndex(newIndex);
      resetLightboxState(activePlaylist[newIndex]);
  };

  const prevVideo = (e?: React.MouseEvent) => {
      e?.stopPropagation();
      const newIndex = (activeVideoIndex - 1 + activePlaylist.length) % activePlaylist.length;
      setActiveVideoIndex(newIndex);
      resetLightboxState(activePlaylist[newIndex]);
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  const handleSendComment = (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanText = commentInput.trim(); // Basic sanitization
    if (!cleanText) return;

    const newComment: LocalComment = {
        id: generateSecureId(), // Stronger ID
        user: currentUser.name,
        avatar: currentUser.avatar,
        text: cleanText,
        timestamp: t('time.justNow') || 'الآن'
    };

    setCommentsList([...commentsList, newComment]);
    setCommentInput('');
  };

  const handleTogglePiP = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (videoPlayerRef.current) {
          try {
              if (document.pictureInPictureElement) {
                  await document.exitPictureInPicture();
              } else {
                  await videoPlayerRef.current.requestPictureInPicture();
              }ধন} catch (error) {
              console.error("PiP failed", error);
          }
      }
  };

  const handleDownload = () => {
      const current = activePlaylist[activeVideoIndex];
      const link = document.createElement('a');
      link.href = current.url;
      // Security: Ensure filename is safe or generic
      link.download = `video_${current.id}.mp4`; 
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowMenu(false);
  };

  const handleSaveVideo = () => {
      if (onToggleSaveVideo && currentVideo) {
          onToggleSaveVideo(currentVideo);
      }
      setShowMenu(false);
  };

  const handleUpdateVideoPrivacy = (privacy: PrivacyLevel) => {
    if (onUpdateVideo && currentVideo) {
        setCurrentVideoAudience(privacy);
        onUpdateVideo(currentVideo.id, { privacy });
    }
    setShowMenu(false); 
  };

  const handleUpdateVideoCommentAudience = (commentAudience: CommentAudienceType) => {
    if (onUpdateVideo && currentVideo) {
        setCurrentVideoCommentAudience(commentAudience);
        onUpdateVideo(currentVideo.id, { commentAudience });
    }
    setShowMenu(false);
  };

  const currentVideo = activePlaylist[activeVideoIndex];
  const isCurrentVideoSaved = currentVideo ? savedVideos.some(v => v.id === currentVideo.id) : false;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm min-h-[500px] animate-fadeIn p-4 relative border border-gray-100 dark:border-gray-700">
       <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="video/mp4,video/webm,video/ogg" // Restrict accept attribute
          onChange={handleFileChange} 
       />

       {/* Header */}
       <div className="flex items-center justify-between mb-2">
           <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('profileVideos.header') || 'مقاطع الفيديو'}</h2>
           {isOwnProfile && (
                <div className="flex gap-3 items-center">
                    <PrivacySelect value={uploadPrivacy} onChange={setUploadPrivacy} small />

                    <button 
                        onClick={handleFileClick}
                        disabled={isUploading}
                        className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-md font-semibold text-sm hover:bg-blue-700 transition disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        <span>{isUploading ? (t('common.uploading') || 'جاري الرفع...') : (t('profileVideos.addVideo') || 'إضافة فيديو')}</span>
                    </button>
                </div>
           )}
       </div>

       {/* Error Message */}
       {uploadError && (
           <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md flex items-center gap-2 text-sm border border-red-100 dark:border-red-800">
               <AlertCircle className="w-4 h-4" />
               {uploadError}
               <button onClick={() => setUploadError(null)} className="ml-auto hover:text-red-900 dark:hover:text-red-200"><X className="w-4 h-4" /></button>
           </div>
       )}

       {/* Tabs */}
       <div className="flex items-center gap-1 md:gap-4 overflow-x-auto no-scrollbar mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            <button 
                onClick={() => setActiveTab('videos')}
                className={`px-4 py-2 font-semibold rounded-md transition whitespace-nowrap flex items-center gap-2 ${activeTab === 'videos' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
                <Video className="w-4 h-4" />
                <span>{t('profileVideos.videosTab') || 'فيديوهات'}</span>
            </button>
            <button 
                onClick={() => setActiveTab('reels')}
                className={`px-4 py-2 font-semibold rounded-md transition whitespace-nowrap flex items-center gap-2 ${activeTab === 'reels' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
                <Film className="w-4 h-4" />
                <span>{t('profileVideos.reelsTab') || 'ريلز'}</span>
            </button>
       </div>

       {/* Content Grid */}
       <div className="mt-4 min-h-[300px]">
           {activeTab === 'videos' && (
               videos.length > 0 ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {videos.map((video, idx) => (
                           <div 
                                key={video.id} 
                                className="group relative bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition"
                                onClick={() => openLightbox(idx, videos)}
                            >
                               <div className="aspect-video bg-black relative">
                                   <video src={video.url} className="w-full h-full object-contain pointer-events-none" />
                                   <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition flex items-center justify-center">
                                       <div className="bg-black/50 p-3 rounded-full backdrop-blur-sm group-hover:scale-110 transition">
                                            <Play className="w-8 h-8 text-white fill-white ml-1" />
                                       </div>
                                   </div>
                                   <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                                       {formatDurationStr(video.duration)}
                                   </div>
                               </div>
                               <div className="p-3">
                                   <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1 line-clamp-1">{video.title}</h3>
                                   <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-3">
                                       <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {video.views}</span>
                                       <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {video.timestamp}</span>
                                   </div>
                               </div>
                           </div>
                       ))}
                   </div>
               ) : (
                   <div className="text-center py-20 bg-gray-50 dark:bg-gray-700/20 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                       <Video className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-500 mb-3" />
                       <h3 className="text-lg font-bold text-gray-600 dark:text-gray-400">{t('profileVideos.noVideos') || 'لا توجد فيديوهات بعد'}</h3>
                   </div>
               )
           )}

           {activeTab === 'reels' && (
               reels.length > 0 ? (
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       {reels.map((reel, idx) => (
                           <div 
                                key={reel.id} 
                                className="group relative bg-black rounded-lg overflow-hidden aspect-[9/16] shadow-md cursor-pointer"
                                onClick={() => openLightbox(idx, reels)}
                           >
                               <video src={reel.url} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition pointer-events-none" />
                               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/20 p-3 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition">
                                   <Play className="w-6 h-6 text-white fill-current ml-0.5" />
                               </div>
                               <div className="absolute bottom-2 left-2 text-white text-xs font-medium drop-shadow-md flex items-center gap-1">
                                   <Play className="w-3 h-3 fill-current" /> {reel.views}
                               </div>
                           </div>
                       ))}
                   </div>
               ) : (
                   <div className="text-center py-20 bg-gray-50 dark:bg-gray-700/20 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                       <Film className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-500 mb-3" />
                       <h3 className="text-lg font-bold text-gray-600 dark:text-gray-400">{t('profileVideos.noReels') || 'لا توجد ريلز بعد'}</h3>
                   </div>
               )
           )}
       </div>

       {/* Lightbox Overlay */}
       {lightboxOpen && currentVideo && (
        <div className="fixed inset-0 z-[100] bg-black bg-opacity-95 flex items-center justify-center animate-fadeIn backdrop-blur-sm">
           <div className="w-full h-full flex flex-col md:flex-row overflow-hidden">
               
               {/* Video Player Section */}
               <div className="flex-1 bg-black flex items-center justify-center relative group" onClick={(e) => e.stopPropagation()}>
                    
                    {/* Controls */}
                    <button aria-label="Close" className="absolute top-4 left-4 p-2 bg-black/50 hover:bg-white/20 rounded-full text-white z-[102] transition" onClick={closeLightbox}>
                        <X className="w-6 h-6" />
                    </button>

                    <button 
                        aria-label="Picture in Picture" 
                        onClick={handleTogglePiP}
                        className="absolute top-4 left-16 p-2 bg-black/50 hover:bg-white/20 rounded-full text-white z-[102] transition"
                        title="Picture in Picture"
                    >
                        <PictureInPicture className="w-6 h-6" />
                    </button>
                    
                    {/* Navigation Arrows */}
                    {activePlaylist.length > 1 && (
                        <>
                            <button 
                                aria-label="Previous Video" 
                                className={`absolute ${dir === 'rtl' ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-white/20 rounded-full text-white z-10 transition opacity-0 group-hover:opacity-100`} 
                                onClick={prevVideo}
                            >
                                {dir === 'rtl' ? <ChevronLeft className="w-8 h-8" /> : <ChevronRight className="w-8 h-8" />}
                            </button>
                            <button 
                                aria-label="Next Video" 
                                className={`absolute ${dir === 'rtl' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-white/20 rounded-full text-white z-10 transition opacity-0 group-hover:opacity-100`} 
                                onClick={nextVideo}
                            >
                                {dir === 'rtl' ? <ChevronRight className="w-8 h-8" /> : <ChevronLeft className="w-8 h-8" />}
                            </button>
                        </>
                    )}

                    <video 
                        ref={videoPlayerRef}
                        src={currentVideo.url} 
                        className="max-w-full max-h-[100vh] w-full h-full object-contain outline-none" 
                        controls
                        autoPlay
                        playsInline
                        onEnded={nextVideo}
                    />
               </div>

               {/* Sidebar (Comments & Info) */}
               <div className="w-full md:w-[360px] bg-white dark:bg-gray-800 flex flex-col h-[40vh] md:h-full border-l border-gray-800 shadow-xl z-[101]" onClick={(e) => e.stopPropagation()}>
                    {/* Sidebar Header */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 relative bg-white dark:bg-gray-800">
                        <img src={currentUser.avatar} alt={currentUser.name} className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-600 object-cover" />
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">{currentUser.name}</h4>
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <span>{currentVideo.timestamp}</span>
                                <span>·</span>
                                {getAudienceIcon(currentVideoAudience)}
                            </div>
                        </div>
                        
                        {/* More Options Menu */}
                        <div className="relative" ref={menuRef}>
                            <button aria-label="More Options" onClick={() => { setShowMenu(!showMenu); setMenuView('main'); }} className="p-2 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition">
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                            
                            {showMenu && (
                                <div className={`absolute ${dir === 'rtl' ? 'left-0' : 'right-0'} top-full mt-1 w-80 bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-fadeIn origin-top-right`}>
                                    
                                    {menuView === 'main' && (
                                        <>
                                            <button onClick={handleSaveVideo} className="w-full text-start px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
                                                {isCurrentVideoSaved ? <BookmarkMinus className="w-5 h-5 text-blue-600" /> : <Bookmark className="w-5 h-5" />} 
                                                {isCurrentVideoSaved ? (t('lightbox.unsaveVideo') || 'إلغاء الحفظ') : (t('lightbox.saveVideo') || 'حفظ الفيديو')}
                                            </button>
                                            <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                                            
                                            <button onClick={() => setMenuView('comments')} className="w-full text-start px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between text-sm text-gray-700 dark:text-gray-200 group">
                                                <div className="flex items-center gap-3"><MessageCircle className="w-5 h-5" /> {t('lightbox.whoCanComment') || 'من يمكنه التعليق'}</div>
                                                {dir === 'rtl' ? <ChevronLeft className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                            </button>
                                            
                                            <button onClick={() => setMenuView('audience')} className="w-full text-start px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between text-sm text-gray-700 dark:text-gray-200 group">
                                                <div className="flex items-center gap-3"><Globe className="w-5 h-5" /> {t('lightbox.editAudience') || 'تعديل الجمهور'}</div>
                                                {dir === 'rtl' ? <ChevronLeft className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                            </button>
                                            
                                            <button onClick={() => { setNotificationsOn(!notificationsOn); setShowMenu(false); }} className="w-full text-start px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
                                                {notificationsOn ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />} 
                                                {notificationsOn ? (t('lightbox.turnOffNotifications') || 'إيقاف الإشعارات') : (t('lightbox.turnOnNotifications') || 'تشغيل الإشعارات')}
                                            </button>
                                            <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                                            
                                            <button onClick={handleDownload} className="w-full text-start px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
                                                <Download className="w-5 h-5" /> {t('lightbox.download') || 'تنزيل'}
                                            </button>
                                            
                                            {isOwnProfile && (
                                                <button onClick={() => handleDelete(currentVideo.id)} className="w-full text-start px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-sm text-red-600 font-medium">
                                                    <Trash2 className="w-5 h-5" /> {t('lightbox.deleteVideo') || 'حذف الفيديو'}
                                                </button>
                                            )}
                                        </>
                                    )}

                                    {menuView === 'audience' && (
                                        <div className="animate-slideLeft">
                                            <div className="flex items-center gap-2 px-2 py-3 border-b border-gray-100 dark:border-gray-700">
                                                <button aria-label="Back" onClick={() => setMenuView('main')} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                                                    {dir === 'rtl' ? <ArrowRight className="w-5 h-5 text-gray-600 dark:text-gray-300" /> : <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
                                                </button>
                                                <span className="font-bold text-sm text-gray-800 dark:text-white">{t('lightbox.editAudience') || 'تعديل الجمهور'}</span>
                                            </div>
                                            <div className="py-2">
                                                {(['public', 'friends', 'friends_of_friends', 'only_me'] as PrivacyLevel[]).map((type) => (
                                                    <button 
                                                        key={type}
                                                        onClick={() => handleUpdateVideoPrivacy(type)}
                                                        className="w-full text-start px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between text-sm text-gray-700 dark:text-gray-200"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full">{getAudienceIcon(type)}</div>
                                                            <div className="flex flex-col items-start">
                                                                <span className="font-semibold">{getAudienceLabel(type)}</span>
                                                            </div>
                                                        </div>
                                                        {currentVideoAudience === type && <div className="w-2 h-2 bg-blue-600 rounded-full"></div>}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {menuView === 'comments' && (
                                        <div className="animate-slideLeft">
                                             <div className="flex items-center gap-2 px-2 py-3 border-b border-gray-100 dark:border-gray-700">
                                                <button aria-label="Back" onClick={() => setMenuView('main')} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                                                    {dir === 'rtl' ? <ArrowRight className="w-5 h-5 text-gray-600 dark:text-gray-300" /> : <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />}
                                                </button>
                                                <span className="font-bold text-sm text-gray-800 dark:text-white">{t('lightbox.whoCanComment') || 'من يمكنه التعليق'}</span>
                                            </div>
                                            <div className="py-2">
                                                {(['public', 'friends', 'mentions'] as CommentAudienceType[]).map((type) => (
                                                    <button 
                                                        key={type}
                                                        onClick={() => handleUpdateVideoCommentAudience(type)}
                                                        className="w-full text-start px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between text-sm text-gray-700 dark:text-gray-200"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full">{type === 'public' ? <Globe className="w-4 h-4" /> : type === 'friends' ? <Users className="w-4 h-4" /> : <AtSign className="w-4 h-4" />}</div>
                                                            <div className="flex flex-col items-start">
                                                                <span className="font-semibold">{getCommentAudienceLabel(type)}</span>
                                                            </div>
                                                        </div>
                                                        {currentVideoCommentAudience === type && <div className="w-2 h-2 bg-blue-600 rounded-full"></div>}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats Bar */}
                    <div className="px-4 py-3 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-1">
                            <div className="bg-blue-600 p-1 rounded-full"><ThumbsUp className="w-3 h-3 text-white fill-current" /></div>
                            <span>{likesCount > 0 ? likesCount : ''}</span>
                        </div>
                        <div className="flex gap-3">
                            <span>{currentVideo.views} {t('profileVideos.views') || 'مشاهدة'}</span>
                            <span>{commentsList.length} {t('profileVideos.commentsCount') || 'تعليق'}</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="px-2 py-1 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                         <button onClick={handleLike} className={`flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition font-medium text-sm ${isLiked ? 'text-blue-600' : 'text-gray-600 dark:text-gray-300'}`}>
                            <ThumbsUp className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} /> {t('profileVideos.like') || 'أعجبني'}
                         </button>
                         <button onClick={() => commentsEndRef.current?.scrollIntoView()} className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition font-medium text-gray-600 dark:text-gray-300 text-sm">
                            <MessageCircle className="w-5 h-5" /> {t('profileVideos.comment') || 'تعليق'}
                         </button>
                         <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition font-medium text-gray-600 dark:text-gray-300 text-sm">
                            <Share2 className="w-5 h-5" /> {t('profileVideos.share') || 'مشاركة'}
                         </button>
                    </div>

                    {/* Comments List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                        {commentsList.length === 0 ? (
                            <div className="text-center text-gray-400 py-10 text-sm">{t('profileVideos.noCommentsYet') || 'كن أول من يعلق.'}</div>
                        ) : (
                            commentsList.map(comment => (
                                <div key={comment.id} className="flex gap-2 items-start animate-fadeIn">
                                    <img src={comment.avatar} className="w-8 h-8 rounded-full object-cover" alt={comment.user} />
                                    <div className="flex flex-col">
                                        <div className="bg-gray-200 dark:bg-gray-700 px-3 py-2 rounded-2xl rounded-tl-none">
                                            <span className="font-bold text-xs block text-gray-900 dark:text-white">{comment.user}</span>
                                            <span className="text-sm text-gray-800 dark:text-gray-200 break-words">{comment.text}</span>
                                        </div>
                                        <div className="flex gap-3 text-[11px] text-gray-500 dark:text-gray-400 pr-2 mt-1">
                                            <span className="font-semibold cursor-pointer hover:underline">{t('profileVideos.like') || 'أعجبني'}</span>
                                            <span className="font-semibold cursor-pointer hover:underline">{t('profileVideos.reply') || 'رد'}</span>
                                            <span>{comment.timestamp}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={commentsEndRef} />
                    </div>

                    {/* Comment Input */}
                    <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <form onSubmit={handleSendComment} className="flex items-center gap-2">
                             <img src={currentUser.avatar} className="w-8 h-8 rounded-full object-cover" alt={currentUser.name} />
                             <div className="flex-1 relative">
                                 <input 
                                    type="text" 
                                    className="w-full bg-gray-100 dark:bg-gray-700 border-none rounded-full py-2 px-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition dark:text-white" 
                                    placeholder={t('profileVideos.writeCommentPlaceholder') || 'اكتب تعليقاً...'} 
                                    value={commentInput} 
                                    onChange={(e) => setCommentInput(e.target.value)} 
                                 />
                                 <Smile className={`w-5 h-5 text-gray-500 absolute ${dir === 'rtl' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 cursor-pointer hover:text-gray-700`} />
                             </div>
                             <button 
                                type="submit" 
                                disabled={!commentInput.trim()} 
                                className="text-blue-600 disabled:opacity-50 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded-full transition"
                             >
                                <Send className={`w-5 h-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                             </button>
                        </form>
                    </div>
               </div>
           </div>
        </div>
       )}
    </div>
  );
};

export default ProfileVideos;