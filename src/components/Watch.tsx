import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Eye, MoreHorizontal, ThumbsUp, MessageCircle, Share2, Loader2, AlertCircle, User, Video as VideoIcon, X, PictureInPicture, Volume2, VolumeX, Maximize, Minimize, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// --- Types ---

interface Author {
  name: string;
  avatarUrl: string;
}

interface Video {
  id: string;
  title: string;
  views: number;
  uploadedTime: string;
  duration: string;
  thumbnailUrl: string;
  videoUrl?: string; // Added for functional player
  author: Author;
}

interface ActionButtonProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}

interface VideoCardProps {
  video: Video;
  onMoreOptionsClick?: (videoId: string) => void;
  onPlayClick?: (video: Video) => void;
  onLikeClick?: (videoId: string) => void;
  onCommentClick?: (videoId: string) => void;
  onShareClick?: (videoId: string) => void;
  isLiked?: boolean;
}

interface VideoPlayerModalProps {
  video: Video;
  onClose: () => void;
}

// --- Helpers ---

const formatViews = (num: number): string => {
  if (typeof num !== 'number' || isNaN(num)) {
    return 'N/A';
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
};

const sanitizeUrl = (url?: string): string => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (['http:', 'https:', 'data:'].includes(parsed.protocol)) {
      return url;
    }
    return '';
  } catch (e) {
    return '';
  }
};

// --- Components ---

const ActionButton: React.FC<ActionButtonProps> = ({ icon: Icon, label, onClick, isActive }) => (
  <button
    type="button"
    className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-fb-blue/20 ${
      isActive 
        ? 'text-fb-blue bg-fb-blue/10' 
        : 'text-fb-textGray hover:bg-fb-hover'
    }`}
    aria-label={label}
    aria-pressed={isActive}
    onClick={onClick}
  >
    <Icon className={`h-5 w-5 ${isActive ? 'fill-current' : ''}`} /> 
    <span>{label}</span>
  </button>
);

const VideoCard: React.FC<VideoCardProps> = ({
  video,
  onMoreOptionsClick,
  onPlayClick,
  onLikeClick,
  onCommentClick,
  onShareClick,
  isLiked = false
}) => {
  const formattedViews = formatViews(video.views);
  const [avatarError, setAvatarError] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const safeAvatar = sanitizeUrl(video.author.avatarUrl);
  const safeThumbnail = sanitizeUrl(video.thumbnailUrl);

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="bg-fb-white rounded-xl shadow-card overflow-hidden border border-gray-100 hover:shadow-md transition-shadow duration-200" role="article" aria-labelledby={`video-title-${video.id}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          {avatarError || !safeAvatar ? (
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0">
              <User className="h-6 w-6" aria-label="صورة مؤلف مفقودة" />
            </div>
          ) : (
            <img
              src={safeAvatar}
              className="h-10 w-10 rounded-full bg-gray-200 flex-shrink-0 object-cover border border-gray-100"
              alt={`صورة قناة ${video.author.name}`}
              loading="lazy"
              onError={() => setAvatarError(true)}
            />
          )}
          <div>
            <h4 className="text-sm font-bold text-fb-text leading-tight hover:underline cursor-pointer">{video.author.name}</h4>
            <span className="text-xs text-fb-textGray">{video.uploadedTime}</span>
          </div>
        </div>
        <button
          type="button"
          className="rounded-full p-2 text-fb-textGray hover:bg-fb-hover focus:outline-none focus:ring-2 focus:ring-fb-blue/20 transition-colors"
          aria-label="المزيد من الخيارات للفيديو"
          onClick={() => onMoreOptionsClick?.(video.id)}
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* Video Thumbnail (Clickable) */}
      <div
        role="button"
        tabIndex={0}
        className="group relative aspect-video cursor-pointer bg-black focus:outline-none focus:ring-2 focus:ring-fb-blue/50 overflow-hidden"
        onClick={() => onPlayClick?.(video)}
        onKeyDown={(e) => handleKeyDown(e, () => onPlayClick?.(video))}
        aria-label={`تشغيل الفيديو: ${video.title}`}
      >
        {thumbnailError || !safeThumbnail ? (
          <div className="h-full w-full flex items-center justify-center bg-gray-800 text-gray-400">
            <VideoIcon className="h-16 w-16" aria-label="صورة مصغرة للفيديو مفقودة" />
          </div>
        ) : (
          <img 
            src={safeThumbnail} 
            className="h-full w-full object-cover opacity-90 transition-all duration-300 group-hover:opacity-100 group-hover:scale-105"
            alt={video.title} 
            loading="lazy"
            onError={() => setThumbnailError(true)}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="rounded-full bg-black/40 p-4 transition-transform duration-300 group-hover:scale-110 group-hover:bg-black/60 backdrop-blur-sm border border-white/20">
            <Play className="h-8 w-8 fill-current text-white ml-1" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 text-xs text-white font-medium backdrop-blur-md">
          {video.duration}
        </div>
      </div>

      {/* Content Info */}
      <div className="p-3">
        <h3 id={`video-title-${video.id}`} className="mb-2 text-lg font-bold text-fb-text leading-snug hover:text-fb-blue transition-colors cursor-pointer" onClick={() => onPlayClick?.(video)}>
          {video.title}
        </h3>
        <div className="mb-4 flex items-center gap-4 text-sm text-fb-textGray">
          <span className="flex items-center gap-1 bg-fb-gray px-2 py-0.5 rounded-full">
            <Eye className="h-3.5 w-3.5" /> {formattedViews}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-2 gap-1">
          <ActionButton icon={ThumbsUp} label="أعجبني" onClick={() => onLikeClick?.(video.id)} isActive={isLiked} />
          <ActionButton icon={MessageCircle} label="تعليق" onClick={() => onCommentClick?.(video.id)} />
          <ActionButton icon={Share2} label="مشاركة" onClick={() => onShareClick?.(video.id)} />
        </div>
      </div>
    </div>
  );
};

const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ video, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const togglePiP = async () => {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (videoRef.current) {
      await videoRef.current.requestPictureInPicture();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && videoRef.current) {
      videoRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const safeVideoUrl = sanitizeUrl(video.videoUrl || 'https://www.w3schools.com/html/mov_bbb.mp4'); // Fallback safe demo video

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center backdrop-blur-md animate-fadeIn" onClick={onClose}>
      <div className="w-full max-w-5xl mx-4 relative" onClick={e => e.stopPropagation()}>
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 md:-right-12 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition"
        >
          <X className="w-8 h-8" />
        </button>

        <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl group">
          <video 
            ref={videoRef} 
            src={safeVideoUrl} 
            className="w-full h-full object-contain"
            autoPlay
            playsInline
            onClick={togglePlay}
            onEnded={() => setIsPlaying(false)}
          />
          
          {/* Custom Controls Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
             <div className="flex items-center gap-4">
               <button onClick={togglePlay} className="text-white hover:text-fb-blue transition">
                 {isPlaying ? <span className="font-bold">II</span> : <Play className="w-6 h-6 fill-current" />}
               </button>
               <button onClick={toggleMute} className="text-white hover:text-gray-300 transition">
                 {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
               </button>
               <div className="text-white text-sm font-medium">{video.title}</div>
             </div>

             <div className="flex items-center gap-3">
                <button onClick={togglePiP} className="text-white hover:text-gray-300" title="Picture in Picture">
                   <PictureInPicture className="w-5 h-5" />
                </button>
                <button onClick={toggleFullscreen} className="text-white hover:text-gray-300">
                   {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
             </div>
          </div>

          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <div className="bg-black/50 p-5 rounded-full border-2 border-white/20">
                  <Play className="w-12 h-12 text-white fill-current ml-1" />
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Mock Data Service ---

const MOCK_VIDEOS: Video[] = [
  {
    id: 'w1',
    title: 'جولة في الطبيعة الخلابة',
    views: 1200000,
    uploadedTime: 'منذ ساعتين',
    duration: '5:30',
    thumbnailUrl: 'https://picsum.photos/800/450?random=50',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    author: { name: 'صانع محتوى A', avatarUrl: 'https://picsum.photos/40/40?random=100' },
  },
  {
    id: 'w2',
    title: 'أفضل لحظات كرة القدم 2024',
    views: 500000,
    uploadedTime: 'منذ 5 ساعات',
    duration: '10:15',
    thumbnailUrl: 'https://picsum.photos/800/450?random=51',
    videoUrl: 'https://www.w3schools.com/html/movie.mp4',
    author: { name: 'صانع محتوى B', avatarUrl: 'https://picsum.photos/40/40?random=101' },
  },
  {
    id: 'w3',
    title: 'طريقة تحضير القهوة المختصة',
    views: 200000,
    uploadedTime: 'منذ يوم',
    duration: '3:45',
    thumbnailUrl: 'https://picsum.photos/800/450?random=52',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    author: { name: 'صانع محتوى C', avatarUrl: 'https://picsum.photos/40/40?random=102' },
  },
  {
    id: 'w4',
    title: 'مراجعة أحدث الهواتف الذكية',
    views: 800000,
    uploadedTime: 'منذ يومين',
    duration: '12:20',
    thumbnailUrl: 'https://picsum.photos/800/450?random=53',
    videoUrl: 'https://www.w3schools.com/html/movie.mp4',
    author: { name: 'صانع محتوى D', avatarUrl: 'https://picsum.photos/40/40?random=103' },
  },
];

// --- Main Container ---

const Watch = () => {
  const { t, dir } = useLanguage();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [likedVideos, setLikedVideos] = useState<Set<string>>(new Set());
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'info'} | null>(null);

  // Simulate data fetching
  useEffect(() => {
    let isMounted = true;

    const fetchVideos = async () => {
      try {
        setLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        if (isMounted) {
          setVideos(MOCK_VIDEOS);
          setError(null);
        }
      } catch (err) {
        console.error("Failed to fetch videos:", err);
        if (isMounted) {
          setError('حدث خطأ أثناء تحميل الفيديوهات. يرجى المحاولة مرة أخرى.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchVideos();

    return () => {
      isMounted = false;
    };
  }, []);

  const showNotification = (msg: string, type: 'success' | 'info' = 'success') => {
      setNotification({ msg, type });
      setTimeout(() => setNotification(null), 3000);
  };

  // Interactive handlers
  const handleMoreOptions = useCallback((videoId: string) => {
    showNotification('خيارات إضافية غير متاحة حالياً', 'info');
  }, []);

  const handlePlay = useCallback((video: Video) => {
    setPlayingVideo(video);
  }, []);

  const handleLike = useCallback((videoId: string) => {
    setLikedVideos(prev => {
        const newSet = new Set(prev);
        if (newSet.has(videoId)) {
            newSet.delete(videoId);
            showNotification('تم إلغاء الإعجاب', 'info');
        } else {
            newSet.add(videoId);
            showNotification('تم الإعجاب بالفيديو', 'success');
        }
        return newSet;
    });
  }, []);

  const handleComment = useCallback((videoId: string) => {
    showNotification('قسم التعليقات قيد التطوير', 'info');
  }, []);

  const handleShare = useCallback(async (videoId: string) => {
    const video = videos.find(v => v.id === videoId);
    const url = `${window.location.origin}/watch/${videoId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: video?.title || 'Video',
          text: `شاهد هذا الفيديو المذهل: ${video?.title}`,
          url: url,
        });
      } catch (error) {
        console.log('Share canceled or failed', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        showNotification('تم نسخ رابط الفيديو إلى الحافظة!', 'success');
      } catch (err) {
        showNotification('فشل نسخ الرابط', 'info');
      }
    }
  }, [videos]);

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center flex-col gap-4" role="status" aria-live="polite" aria-label="جاري تحميل الفيديوهات">
        <Loader2 className="h-10 w-10 animate-spin text-fb-blue" />
        <span className="text-fb-textGray font-medium">{t('loading', { defaultValue: 'جاري التحميل...' })}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center" role="alert" aria-live="assertive" aria-label="خطأ في التحميل">
        <div className="flex flex-col items-center gap-2 text-fb-error bg-red-50 p-6 rounded-xl border border-red-100">
          <AlertCircle className="h-12 w-12 opacity-80" />
          <span className="font-bold">{error}</span>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 rounded-lg bg-red-100 px-6 py-2 text-sm font-bold text-red-700 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-300 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[700px] px-0 md:px-4 py-6" dir={dir}>
      {/* Toast Notification */}
      {notification && (
          <div className="fixed bottom-6 right-6 z-50 animate-bounce-in">
              <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white ${notification.type === 'success' ? 'bg-gray-800' : 'bg-gray-700'}`}>
                  {notification.type === 'success' ? <Check className="w-5 h-5 text-green-400" /> : <AlertCircle className="w-5 h-5 text-blue-400" />}
                  <span className="font-medium text-sm">{notification.msg}</span>
              </div>
          </div>
      )}

      <div className="flex items-center justify-between mb-6 px-4 md:px-0">
         <h2 className="text-2xl font-bold text-fb-text">{t('nav_watch', { defaultValue: 'Watch' })}</h2>
         <div className="bg-fb-white px-3 py-1 rounded-full text-sm font-medium text-fb-textGray shadow-sm border border-gray-100">
            {videos.length} فيديوهات
         </div>
      </div>
      
      {videos.length === 0 ? (
        <div className="text-center text-fb-textGray py-10 flex flex-col items-center gap-3" role="status" aria-live="polite">
          <VideoIcon className="w-16 h-16 opacity-20" />
          <span>لا توجد فيديوهات متاحة حالياً</span>
        </div>
      ) : (
        <div className="space-y-4" role="region" aria-label="قائمة الفيديوهات">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onMoreOptionsClick={handleMoreOptions}
              onPlayClick={handlePlay}
              onLikeClick={handleLike}
              onCommentClick={handleComment}
              onShareClick={handleShare}
              isLiked={likedVideos.has(video.id)}
            />
          ))}
        </div>
      )}

      {playingVideo && (
          <VideoPlayerModal 
             video={playingVideo} 
             onClose={() => setPlayingVideo(null)} 
          />
      )}
    </div>
  );
};

export default Watch;