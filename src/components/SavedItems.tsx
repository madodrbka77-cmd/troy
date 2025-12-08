import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Bookmark, Trash2, Play, X, ChevronRight, ChevronLeft, MoreHorizontal, MessageCircle, ThumbsUp, Share2, Send, Smile, Globe, BookmarkMinus, Image as ImageIcon } from 'lucide-react';
import DOMPurify from 'dompurify';
import type { Photo, VideoItem, User } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface SavedItemsProps {
  currentUser: User;
  savedPhotos: Photo[];
  savedVideos?: VideoItem[];
  onUnsave: (item: Photo | VideoItem) => void;
}

interface LocalComment {
  id: string;
  user: string;
  avatar: string;
  text: string;
  timestamp: string;
}

// Union type for easier handling in the lightbox
type SavedItem = Photo | VideoItem;

interface ItemLightboxProps {
  item: SavedItem;
  itemType: 'photos' | 'videos';
  onClose: () => void;
  onUnsave: (item: SavedItem) => void;
  onNext: () => void;
  onPrev: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  currentUser: User;
  currentIndex: number;
  totalItems: number;
}

// --- Helper to safely get title/description ---
const getItemTitle = (item: SavedItem, type: 'photos' | 'videos'): string => {
  if (type === 'videos') {
    return (item as VideoItem).title || '';
  }
  // Fallback to description for photos if available, else empty
  return (item as Photo).description || '';
};

const ItemLightbox: React.FC<ItemLightboxProps> = ({
  item,
  itemType,
  onClose,
  onUnsave,
  onNext,
  onPrev,
  hasPrev,
  hasNext,
  currentUser,
  currentIndex,
  totalItems,
}) => {
  const { t, dir } = useLanguage();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(item.likes || 0);
  const [commentsList, setCommentsList] = useState<LocalComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Reset state when item changes
  useEffect(() => {
    setIsLiked(false);
    setCommentsList([]);
    setCommentInput('');
    setLikesCount(item.likes || 0);
  }, [item]);

  // Scroll to bottom of comments
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [commentsList]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      // Support RTL direction logic for arrows
      if (e.key === 'ArrowLeft') {
        dir === 'rtl' ? (hasNext && onNext()) : (hasPrev && onPrev());
      }
      if (e.key === 'ArrowRight') {
        dir === 'rtl' ? (hasPrev && onPrev()) : (hasNext && onNext());
      }
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, onPrev, onNext, hasPrev, hasNext, dir]);

  const handleSendComment = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanInput = commentInput.trim();
    if (!cleanInput) return;

    // Security: Sanitize input before state update (Double defense)
    const sanitizedText = DOMPurify.sanitize(cleanInput);

    const newComment: LocalComment = {
      id: crypto.randomUUID(),
      user: currentUser.name || 'User',
      avatar: currentUser.avatar,
      text: sanitizedText,
      timestamp: 'Now' // Should ideally use a localized time function
    };

    setCommentsList(prev => [...prev, newComment]);
    setCommentInput('');
  }, [commentInput, currentUser]);

  const handleLike = useCallback(() => {
    setIsLiked(prevIsLiked => {
      setLikesCount(prevCount => prevCount + (prevIsLiked ? -1 : 1));
      return !prevIsLiked;
    });
  }, []);

  const handleUnsaveCurrent = useCallback(() => {
    onUnsave(item);
    // Optional: Close lightbox if unsaved, or just update UI state
    // onClose(); 
  }, [item, onUnsave]);

  // Sanitized content for rendering
  const rawTitle = getItemTitle(item, itemType);
  const sanitizedTitle = DOMPurify.sanitize(rawTitle);
  const sanitizedUserName = DOMPurify.sanitize(currentUser.name || '');

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-fade-in backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full h-full flex flex-col md:flex-row overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* Media Viewer Area */}
        <div className="flex-1 bg-black flex items-center justify-center relative group select-none">
          <button 
            className="absolute top-4 left-4 p-2 bg-black/50 hover:bg-white/20 rounded-full text-white z-[102] transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          {totalItems > 0 && (
            <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-3 py-1 rounded-full z-[102] font-medium">
              {currentIndex + 1} / {totalItems}
            </div>
          )}

          {/* Navigation Buttons */}
          <button 
            className={`absolute ${dir === 'rtl' ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-white/20 rounded-full text-white z-10 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-white`}
            onClick={dir === 'rtl' ? onNext : onNext}
            disabled={!hasNext}
            aria-label="Next"
          >
            {dir === 'rtl' ? <ChevronLeft className="w-8 h-8" /> : <ChevronRight className="w-8 h-8" />}
          </button>
          
          <button 
            className={`absolute ${dir === 'rtl' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-white/20 rounded-full text-white z-10 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-white`}
            onClick={dir === 'rtl' ? onPrev : onPrev}
            disabled={!hasPrev}
            aria-label="Previous"
          >
            {dir === 'rtl' ? <ChevronRight className="w-8 h-8" /> : <ChevronLeft className="w-8 h-8" />}
          </button>

          {/* Media Content */}
          <div className="w-full h-full flex items-center justify-center p-4">
            {itemType === 'videos' ? (
              <video 
                src={item.url} 
                className="max-w-full max-h-full object-contain shadow-2xl"
                controls
                autoPlay
                playsInline
                title={sanitizedTitle}
              />
            ) : (
              <img 
                src={item.url} 
                className="max-w-full max-h-full object-contain shadow-2xl"
                alt={sanitizedTitle || 'Saved Item'}
                loading="lazy"
              />
            )}
          </div>
        </div>

        {/* Sidebar Info & Comments */}
        <div className="w-full md:w-[360px] bg-white flex flex-col h-[40vh] md:h-full border-l border-gray-200 shadow-2xl">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-white">
            <img src={currentUser.avatar} alt={sanitizedUserName} className="w-10 h-10 rounded-full border border-gray-200 object-cover" />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-gray-900 truncate">{sanitizedUserName}</h4>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span>{t('now')}</span>
                <span>·</span>
                <Globe className="w-3 h-3" />
              </div>
            </div>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          {sanitizedTitle && (
            <div className="px-4 py-3 text-sm text-gray-800 border-b border-gray-100 font-medium break-words dir-auto">
              {sanitizedTitle}
            </div>
          )}

          {/* Stats */}
          <div className="px-4 py-2 flex justify-between items-center text-sm text-gray-500 border-b border-gray-100">
            <div className="flex items-center gap-1">
              <div className="bg-fb-blue p-1 rounded-full"><ThumbsUp className="w-3 h-3 text-white fill-current" /></div>
              <span>{likesCount > 0 ? likesCount : ''}</span>
            </div>
            <div className="flex gap-3">
              <span>{commentsList.length} {t('btn_comment')}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="px-2 py-1 flex items-center justify-between border-b border-gray-100">
            <button onClick={handleLike} className={`flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-50 rounded-md transition font-medium text-sm ${isLiked ? 'text-fb-blue' : 'text-gray-600'}`}>
              <ThumbsUp className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} /> {t('btn_like')}
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-50 rounded-md transition font-medium text-gray-600 text-sm">
              <MessageCircle className="w-5 h-5" /> {t('btn_comment')}
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-50 rounded-md transition font-medium text-gray-600 text-sm">
              <Share2 className="w-5 h-5" /> {t('btn_share')}
            </button>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar">
            {commentsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
                <MessageCircle className="w-8 h-8 mb-2 opacity-50" />
                <p>{t('beFirstToComment') || 'كن أول من يعلق.'}</p>
              </div>
            ) : (
              commentsList.map(comment => (
                <div key={comment.id} className="flex gap-2 items-start animate-fade-in">
                  <img src={comment.avatar} className="w-8 h-8 rounded-full border border-gray-200" alt="avatar" />
                  <div className="flex flex-col max-w-[85%]">
                    <div className="bg-white border border-gray-200 px-3 py-2 rounded-2xl rounded-tr-none shadow-sm">
                      <span className="font-bold text-xs block text-gray-900 mb-0.5">{comment.user}</span>
                      <span className="text-sm text-gray-800 break-words leading-snug">{comment.text}</span>
                    </div>
                    <div className="flex gap-3 text-[10px] text-gray-500 pr-2 mt-1 font-medium">
                      <span className="cursor-pointer hover:underline">{t('btn_like')}</span>
                      <span className="cursor-pointer hover:underline">{t('reply')}</span>
                      <span>{comment.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={commentsEndRef} />
          </div>

          {/* Unsave Button */}
          <div className="px-4 py-2 bg-white border-t border-gray-100">
            <button 
              onClick={handleUnsaveCurrent}
              className="w-full flex items-center justify-center gap-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
            >
              <BookmarkMinus className="w-4 h-4" />
              {t('unsavePost') || 'إزالة من المحفوظات'}
            </button>
          </div>

          {/* Comment Input */}
          <div className="p-3 border-t border-gray-100 bg-white">
            <form onSubmit={handleSendComment} className="flex items-center gap-2">
              <img src={currentUser.avatar} className="w-8 h-8 rounded-full border border-gray-200" alt={sanitizedUserName} />
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  className="w-full bg-gray-100 border-transparent focus:bg-white focus:border-fb-blue/30 rounded-full py-2 px-4 pr-10 text-sm outline-none transition placeholder:text-gray-400" 
                  placeholder={t('write_comment')}
                  value={commentInput} 
                  onChange={(e) => setCommentInput(e.target.value)}
                  maxLength={500}
                />
                <button 
                  type="button" 
                  className={`absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-yellow-500 transition ${dir === 'rtl' ? 'left-3' : 'right-3'}`}
                >
                  <Smile className="w-5 h-5" />
                </button>
              </div>
              <button 
                type="submit" 
                disabled={!commentInput.trim()} 
                className="text-fb-blue hover:bg-blue-50 p-2 rounded-full transition disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <Send className={`w-5 h-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SavedItemCardProps {
  item: SavedItem;
  itemType: 'photos' | 'videos';
  idx: number;
  onOpenLightbox: (index: number, type: 'photos' | 'videos') => void;
  onUnsave: (item: SavedItem) => void;
  t: (key: string) => string;
}

const SavedItemCard: React.FC<SavedItemCardProps> = ({ item, itemType, idx, onOpenLightbox, onUnsave, t }) => {
  const isPhoto = itemType === 'photos';
  // Handle missing titles/descriptions safely
  const rawTitle = getItemTitle(item, itemType);
  const displayTitle = rawTitle || (isPhoto ? t('profile_photos') : t('profile_videos'));
  const sanitizedTitle = DOMPurify.sanitize(displayTitle);

  const description = isPhoto 
    ? (t('menu_saved') + ' - ' + t('profile_photos')) 
    : (t('menu_saved') + ' - ' + t('profile_videos'));

  const mediaUrl = item.url;
  // Fallback if thumbnailUrl is missing on video item
  const thumbnailUrl = isPhoto ? item.url : (item as VideoItem).thumbnailUrl || item.url;
  const duration = !isPhoto ? (item as VideoItem).duration : null;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 flex flex-col group hover:shadow-md transition-all duration-300">
      <div 
        className={`aspect-video relative cursor-pointer overflow-hidden bg-gray-100`}
        onClick={() => onOpenLightbox(idx, itemType)}
        role="button"
        tabIndex={0}
        aria-label={`View saved item ${idx + 1}`}
      >
        {isPhoto ? (
          <img 
            src={mediaUrl} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
            alt={sanitizedTitle} 
            loading="lazy" 
          />
        ) : (
          <>
            {/* Use thumbnail for video preview instead of loading heavy video */}
            <img 
              src={thumbnailUrl} 
              className="w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
              alt={sanitizedTitle}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full group-hover:scale-110 transition-transform shadow-lg">
                <Play className="w-6 h-6 text-white fill-current" />
              </div>
            </div>
            {duration && (
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm">
                {duration}
              </div>
            )}
          </>
        )}
      </div>
      
      <div className="p-4 flex justify-between items-start">
        <div className="flex-1 min-w-0 pr-2">
          <div className="font-bold text-gray-900 truncate text-[15px]" title={sanitizedTitle}>{sanitizedTitle}</div>
          <div className="text-xs text-gray-500 mt-0.5">{description}</div>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onUnsave(item); }}
          className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors"
          title={t('btn_delete')}
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

const SavedItems: React.FC<SavedItemsProps> = ({ currentUser, savedPhotos, savedVideos = [], onUnsave }) => {
  const { t } = useLanguage();
  const hasItems = savedPhotos.length > 0 || savedVideos.length > 0;

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [activeListType, setActiveListType] = useState<'photos' | 'videos'>('photos');
  
  const currentList = useMemo(() => {
    if (activeListType === 'photos') return savedPhotos;
    if (activeListType === 'videos') return savedVideos;
    return [];
  }, [activeListType, savedPhotos, savedVideos]);

  const currentItem = useMemo(() => {
    return lightboxOpen && currentList[activeItemIndex] ? currentList[activeItemIndex] : null;
  }, [lightboxOpen, currentList, activeItemIndex]);

  const openLightbox = useCallback((index: number, type: 'photos' | 'videos') => {
    setActiveItemIndex(index);
    setActiveListType(type);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  const hasPrev = activeItemIndex > 0;
  const hasNext = activeItemIndex < currentList.length - 1;

  const handleNextItem = useCallback(() => {
    if (hasNext) setActiveItemIndex(prev => prev + 1);
  }, [hasNext]);

  const handlePrevItem = useCallback(() => {
    if (hasPrev) setActiveItemIndex(prev => prev - 1);
  }, [hasPrev]);

  return (
    <div className="max-w-[960px] mx-auto py-6 px-4 w-full animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bookmark className="w-7 h-7 text-fb-blue fill-current" />
          {t('menu_saved')}
        </h2>
      </div>

      {!hasItems ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center flex flex-col items-center">
           <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Bookmark className="w-12 h-12 text-gray-300" />
           </div>
           <h3 className="text-xl font-bold text-gray-800 mb-2">{t('no_details') || 'لا توجد عناصر محفوظة'}</h3>
           <p className="text-gray-500 max-w-md mx-auto">عندما تقوم بحفظ صور أو فيديوهات، ستظهر هنا ليسهل عليك الوصول إليها لاحقاً.</p>
        </div>
      ) : (
        <div className="space-y-8">
           {savedPhotos.length > 0 && (
             <section>
               <h3 className="text-lg font-bold text-gray-700 mb-3 px-1 border-r-4 border-fb-blue mr-1">{t('profile_photos')}</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedPhotos.map((photo, idx) => (
                    <SavedItemCard
                       key={photo.id}
                       item={photo}
                       itemType="photos"
                       idx={idx}
                       onOpenLightbox={openLightbox}
                       onUnsave={onUnsave}
                       t={t}
                    />
                  ))}
               </div>
             </section>
           )}

           {savedVideos.length > 0 && (
             <section>
               <h3 className="text-lg font-bold text-gray-700 mb-3 px-1 border-r-4 border-fb-blue mr-1">{t('profile_videos')}</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedVideos.map((video, idx) => (
                    <SavedItemCard
                       key={video.id}
                       item={video}
                       itemType="videos"
                       idx={idx}
                       onOpenLightbox={openLightbox}
                       onUnsave={onUnsave}
                       t={t}
                    />
                  ))}
               </div>
             </section>
           )}
        </div>
      )}

      {lightboxOpen && currentItem && (
        <ItemLightbox
          item={currentItem}
          itemType={activeListType}
          onClose={closeLightbox}
          onUnsave={onUnsave}
          onNext={handleNextItem}
          onPrev={handlePrevItem}
          hasPrev={hasPrev}
          hasNext={hasNext}
          currentUser={currentUser}
          currentIndex={activeItemIndex}
          totalItems={currentList.length}
        />
      )}
    </div>
  );
};

export default SavedItems;