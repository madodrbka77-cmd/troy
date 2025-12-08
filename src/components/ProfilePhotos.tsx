import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Plus, MoreHorizontal, Image as ImageIcon, Pen, X, ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Upload, ThumbsUp, MessageCircle, Share2, Send, Smile, Globe, Download, UserCircle, Trash2, Bell, Bookmark, Lock, Users, UserPlus, BellOff, BookmarkMinus, AtSign, ChevronDown, AlertCircle, Loader2 } from 'lucide-react';
import DOMPurify from 'dompurify';
import type { User, Photo, Album } from '../types';
import { useLanguage } from '../context/LanguageContext';

// --- Constants for Security & Validation ---
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Extended Interface for Privacy
interface PhotoWithPrivacy extends Photo {
  privacy?: PrivacyLevel;
}

// --- Security Utilities ---

/**
 * Validates image file using Magic Numbers to prevent extension spoofing.
 */
const validateImageFile = async (file: File): Promise<boolean> => {
  if (file.size > MAX_FILE_SIZE) return false;
  if (!ALLOWED_MIME_TYPES.includes(file.type)) return false;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = (e) => {
      if (!e.target || !e.target.result) return resolve(false);
      const arr = (new Uint8Array(e.target.result as ArrayBuffer)).subarray(0, 4);
      let header = "";
      for (let i = 0; i < arr.length; i++) {
        header += arr[i].toString(16);
      }
      
      // Signatures: 89504e47 (PNG), ffd8ff (JPG), 47494638 (GIF), 52494646 (WEBP)
      let isValid = false;
      if (header.startsWith("89504e47")) isValid = true;
      else if (header.startsWith("ffd8ff")) isValid = true;
      else if (header.startsWith("47494638")) isValid = true;
      else if (header.startsWith("52494646")) isValid = true;
      
      resolve(isValid);
    };
    reader.readAsArrayBuffer(file.slice(0, 4));
  });
};

/**
 * Sanitizes text input to prevent XSS.
 */
const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
};

// --- Translations Data ---
// Keeping specific translations here to ensure no text is lost, 
// while linking the active selection to the global LanguageContext.
const localTranslations = {
  ar: {
    public: 'عام',
    friends: 'الأصدقاء',
    friendsOfFriends: 'أصدقاء الأصدقاء',
    onlyMe: 'أنا فقط',
    generalAudience: 'العامة',
    friendsAudience: 'الأصدقاء',
    friendsOfFriendsAudience: 'أصدقاء الأصدقاء',
    onlyMeAudience: 'أنت فقط',
    audienceDescPublic: 'أي شخص على فيسبوك أو خارجه',
    audienceDescFriends: 'أصدقاؤك على فيسبوك',
    audienceDescFriendsOfFriends: 'أصدقاء أصدقائك',
    audienceDescOnlyMe: 'أنت فقط',
    photos: 'الصور',
    addPhoto: 'إضافة صورة',
    yourPhotos: 'الصور الخاصة بك',
    taggedPhotos: 'صور تمت الإشارة إليك فيها',
    albums: 'الألبومات',
    noYourPhotos: 'لا توجد صور خاصة بك بعد.',
    noTaggedPhotos: 'لا توجد صور تمت الإشارة إليك فيها.',
    emptyAlbum: 'هذا الألبوم فارغ.',
    createAlbum: 'إنشاء ألبوم',
    albumEmptyPrompt: 'هذا الألبوم فارغ.',
    albumItems: 'عنصر',
    addToAlbum: 'إضافة إلى الألبوم',
    profile: 'الملف الشخصي',
    cover: 'الغلاف',
    now: 'الآن',
    whoCanComment: 'من الذي يمكنه التعليق؟',
    editAudience: 'تعديل الجمهور',
    turnOffNotifications: 'إيقاف تشغيل الإشعارات لهذا المنشور',
    turnOnNotifications: 'تشغيل الإشعارات لهذا المنشور',
    download: 'تنزيل',
    setAsProfilePicture: 'تعيين كصورة ملف شخصي',
    deletePhoto: 'حذف الصورة',
    deletePhotoConfirm: 'هل أنت متأكد من حذف هذه الصورة نهائياً؟',
    savePost: 'حفظ المنشور في العناصر المحفوظة',
    unsavePost: 'إلغاء حفظ المنشور',
    chooseWhoCanComment: 'اختر من يُسمح له بالتعليق على منشورك.',
    mentions: 'الملفات الشخصية والصفحات التي ذكرتها',
    like: 'أعجبني',
    comment: 'تعليق',
    share: 'مشاركة',
    beFirstToComment: 'كن أول من يعلق على هذه الصورة.',
    writeComment: 'اكتب تعليقاً...',
    createAlbumModalTitle: 'إنشاء ألبوم',
    albumName: 'اسم الألبوم',
    enterAlbumName: 'أدخل اسم الألبوم...',
    addPhotosFromDevice: 'اضغط لإضافة صور من جهازك',
    chooseMultiplePhotos: 'يمكنك اختيار صور متعددة',
    cancel: 'إلغاء',
    createAndUploadPhotos: 'إنشاء ورفع {{count}} صورة',
    createEmptyAlbum: 'إنشاء ألبوم فارغ',
    reply: 'رد',
    errorFileSize: 'حجم الملف كبير جداً. الحد الأقصى هو 5 ميجابايت.',
    errorFileType: 'نوع الملف غير مدعوم أو تالف.',
    processing: 'جاري المعالجة...',
  },
  en: {
    public: 'Public',
    friends: 'Friends',
    friendsOfFriends: 'Friends of friends',
    onlyMe: 'Only Me',
    generalAudience: 'Public',
    friendsAudience: 'Friends',
    friendsOfFriendsAudience: 'Friends of Friends',
    onlyMeAudience: 'Only Me',
    audienceDescPublic: 'Anyone on or off Facebook',
    audienceDescFriends: 'Your friends on Facebook',
    audienceDescFriendsOfFriends: 'Friends of your friends',
    audienceDescOnlyMe: 'Only you',
    photos: 'Photos',
    addPhoto: 'Add Photo',
    yourPhotos: 'Your Photos',
    taggedPhotos: 'Tagged Photos',
    albums: 'Albums',
    noYourPhotos: 'No photos of your own yet.',
    noTaggedPhotos: 'No tagged photos yet.',
    emptyAlbum: 'This album is empty.',
    createAlbum: 'Create Album',
    albumEmptyPrompt: 'This album is empty.',
    albumItems: 'items',
    addToAlbum: 'Add to Album',
    profile: 'Profile',
    cover: 'Cover',
    now: 'Now',
    whoCanComment: 'Who can comment?',
    editAudience: 'Edit Audience',
    turnOffNotifications: 'Turn off notifications for this post',
    turnOnNotifications: 'Turn on notifications for this post',
    download: 'Download',
    setAsProfilePicture: 'Set as profile picture',
    deletePhoto: 'Delete Photo',
    deletePhotoConfirm: 'Are you sure you want to permanently delete this photo?',
    savePost: 'Save post to your saved items',
    unsavePost: 'Unsave post',
    chooseWhoCanComment: 'Choose who is allowed to comment on your post.',
    mentions: 'Profiles and Pages you\'ve mentioned',
    like: 'Like',
    comment: 'Comment',
    share: 'Share',
    beFirstToComment: 'Be the first to comment on this photo.',
    writeComment: 'Write a comment...',
    createAlbumModalTitle: 'Create Album',
    albumName: 'Album Name',
    enterAlbumName: 'Enter album name...',
    addPhotosFromDevice: 'Click to add photos from your device',
    chooseMultiplePhotos: 'You can select multiple photos',
    cancel: 'Cancel',
    createAndUploadPhotos: 'Create & Upload {{count}} Photos',
    createEmptyAlbum: 'Create Empty Album',
    reply: 'Reply',
    errorFileSize: 'File size too large. Max is 5MB.',
    errorFileType: 'File type not supported or corrupted.',
    processing: 'Processing...',
  }
};

// --- Types ---
interface ProfilePhotosProps {
  currentUser: User;
  isOwnProfile: boolean;
  photos: PhotoWithPrivacy[];
  albums: Album[];
  onAddPhoto?: (photo: PhotoWithPrivacy) => void;
  onCreateAlbum?: (album: Album) => void;
  onAddPhotoToAlbum?: (albumId: string, photo: PhotoWithPrivacy) => void;
  onUpdateAvatar?: (url: string) => void;
  onDeletePhoto?: (photoId: string) => void;
  savedPhotos?: PhotoWithPrivacy[];
  onToggleSave?: (photo: PhotoWithPrivacy) => void;
}

type PhotoTab = 'your_photos' | 'tagged_photos' | 'albums';
type AudienceType = 'public' | 'friends' | 'friends_of_friends' | 'only_me';
type CommentAudienceType = 'public' | 'friends' | 'mentions';
type MenuView = 'main' | 'audience' | 'comments';
type PrivacyLevel = 'public' | 'friends' | 'friends_of_friends' | 'only_me';

interface LocalComment {
    id: string;
    user: string;
    avatar: string;
    text: string;
    timestamp: string;
}

// --- Components ---

// 1. Privacy Select Component (Extracted)
const PrivacySelect: React.FC<{ value: PrivacyLevel; onChange: (val: PrivacyLevel) => void; small?: boolean; t: any }> = ({ value, onChange, small, t }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const options: { val: PrivacyLevel; label: string; icon: React.ElementType }[] = [
    { val: 'public', label: t('public'), icon: Globe },
    { val: 'friends', label: t('friends'), icon: Users },
    { val: 'friends_of_friends', label: t('friendsOfFriends'), icon: Users },
    { val: 'only_me', label: t('onlyMe'), icon: Lock },
  ];
  const selected = options.find((o) => o.val === value) || options[0];
  const Icon = selected.icon;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button type="button" onClick={() => setIsOpen(!isOpen)} className={`flex items-center gap-2 bg-gray-100 hover:bg-gray-200 rounded-md transition font-medium text-gray-700 border border-gray-200 ${small ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'}`}>
        <Icon className={small ? "w-3 h-3" : "w-4 h-4"} /> <span>{selected.label}</span> <ChevronDown className={small ? "w-3 h-3" : "w-3 h-3"} />
      </button>
      {isOpen && (
        <div className="absolute right-0 rtl:left-0 rtl:right-auto z-20 mt-1 w-36 bg-white shadow-xl rounded-lg border border-gray-100 overflow-hidden animate-fadeIn">
          {options.map((opt) => (
            <div key={opt.val} onClick={() => { onChange(opt.val); setIsOpen(false); }} className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm ${value === opt.val ? 'bg-blue-50 text-fb-blue' : 'text-gray-700'}`}>
              <opt.icon className="w-4 h-4" /> <span>{opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 2. Main ProfilePhotos Component
const ProfilePhotos: React.FC<ProfilePhotosProps> = ({
  currentUser,
  isOwnProfile,
  photos,
  albums,
  onAddPhoto,
  onCreateAlbum,
  onAddPhotoToAlbum,
  onUpdateAvatar,
  onDeletePhoto,
  savedPhotos = [],
  onToggleSave
}) => {
  const { language, dir } = useLanguage();
  
  // Translator Helper for Local Strings
  const t = useCallback((key: keyof typeof localTranslations['ar'], params?: Record<string, string | number>) => {
    const currentLang = language === 'ar' || language === 'en' ? language : 'en';
    let text = localTranslations[currentLang][key] || key;
    if (params) {
        for (const paramKey in params) {
            text = text.replace(`{{${paramKey}}}`, String(params[paramKey]));
        }
    }
    return text;
  }, [language]);

  // --- State ---
  const [activeTab, setActiveTab] = useState<PhotoTab>('your_photos');
  const [taggedPhotos] = useState<PhotoWithPrivacy[]>([]);

  // UI State
  const [viewingAlbum, setViewingAlbum] = useState<Album | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lightbox State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [currentLightboxSource, setCurrentLightboxSource] = useState<PhotoWithPrivacy[]>([]);

  // Dropdown Menu State
  const [showMenu, setShowMenu] = useState(false);
  const [menuView, setMenuView] = useState<MenuView>('main');

  // Interaction State
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsList, setCommentsList] = useState<LocalComment[]>([]);
  const [commentInput, setCommentInput] = useState('');

  // Menu Item States
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [audience, setAudience] = useState<AudienceType>('public');
  const [commentAudience, setCommentAudience] = useState<CommentAudienceType>('public');

  // Create Album Modal State
  const [showCreateAlbumModal, setShowCreateAlbumModal] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  // Use string because we convert to Base64/Blob URL before saving
  const [newAlbumFiles, setNewAlbumFiles] = useState<string[]>([]);

  // Upload Privacy State
  const [uploadPrivacy, setUploadPrivacy] = useState<PrivacyLevel>('public');

  // Refs
  const mainInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);
  const addToAlbumInputRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // --- Effects ---
  useEffect(() => {
    if (viewingAlbum) {
      const updatedAlbum = albums.find(a => a.id === viewingAlbum.id);
      if (updatedAlbum) {
        setViewingAlbum(updatedAlbum);
      }
    }
  }, [albums, viewingAlbum?.id]);

  useEffect(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [commentsList, lightboxOpen]);

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

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (lightboxOpen || showCreateAlbumModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [lightboxOpen, showCreateAlbumModal]);

  // Keyboard Navigation for Lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowRight') dir === 'rtl' ? prevPhoto() : nextPhoto();
      if (e.key === 'ArrowLeft') dir === 'rtl' ? nextPhoto() : prevPhoto();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, lightboxIndex, currentLightboxSource, dir]);


  // --- Helpers & Security ---
  
  // PERFORMANCE: Read file as Blob URL for immediate preview
  const readFileAsBlobUrl = async (file: File): Promise<string> => {
      const isValid = await validateImageFile(file);
      if (!isValid) {
          throw new Error(t('errorFileType'));
      }
      return URL.createObjectURL(file);
  };

  // LEGACY SUPPORT: Convert Blob URL or File to Base64 if backend requires it
  // Ideally backend should accept FormData
  const convertBlobUrlToBase64 = async (blobUrl: string): Promise<string> => {
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
      });
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

  const getAudienceLabel = (type: AudienceType) => {
      switch(type) {
          case 'public': return t('generalAudience');
          case 'friends': return t('friendsAudience');
          case 'friends_of_friends': return t('friendsOfFriendsAudience');
          case 'only_me': return t('onlyMeAudience');
          default: return t('generalAudience');
      }
  };

  const getAudienceDescription = (type: AudienceType) => {
      switch(type) {
          case 'public': return t('audienceDescPublic');
          case 'friends': return t('audienceDescFriends');
          case 'friends_of_friends': return t('audienceDescFriendsOfFriends');
          case 'only_me': return t('audienceDescOnlyMe');
          default: return '';
      }
  };

  // --- Handlers ---

  const handleMainUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (e.target.files && e.target.files.length > 0 && onAddPhoto) {
      setIsLoading(true);
      try {
        for (let i = 0; i < e.target.files.length; i++) {
          const file = e.target.files[i];
          // Validate and get Blob URL for performance
          const blobUrl = await readFileAsBlobUrl(file);
          // Convert to Base64 for current app architecture (Mock Backend)
          const base64 = await convertBlobUrlToBase64(blobUrl);
          
          const newPhoto: PhotoWithPrivacy = {
            id: `new_${Date.now()}_${i}`,
            url: base64,
            likes: 0,
            comments: 0,
            privacy: uploadPrivacy,
          };
          onAddPhoto(newPhoto);
          // Revoke blob URL to free memory
          URL.revokeObjectURL(blobUrl);
        }
        setActiveTab('your_photos');
      } catch (err: any) {
         setErrorMessage(typeof err === 'string' ? err : 'Error uploading file');
         setTimeout(() => setErrorMessage(null), 3000);
      } finally {
         setIsLoading(false);
      }
    }
    e.target.value = '';
  };

  const handleAddToAlbumFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      setErrorMessage(null);
      if (e.target.files && e.target.files.length > 0 && viewingAlbum && onAddPhotoToAlbum) {
          setIsLoading(true);
          try {
            for (let i = 0; i < e.target.files.length; i++) {
                const file = e.target.files[i];
                const blobUrl = await readFileAsBlobUrl(file);
                const base64 = await convertBlobUrlToBase64(blobUrl);
                const newPhoto: PhotoWithPrivacy = {
                    id: `album_add_${Date.now()}_${i}`,
                    url: base64,
                    likes: 0,
                    comments: 0,
                    privacy: uploadPrivacy,
                };
                onAddPhotoToAlbum(viewingAlbum.id, newPhoto);
                URL.revokeObjectURL(blobUrl);
            }
          } catch (err: any) {
             setErrorMessage(typeof err === 'string' ? err : 'Error adding to album');
             setTimeout(() => setErrorMessage(null), 3000);
          } finally {
             setIsLoading(false);
          }
      }
      e.target.value = '';
  };

  const openLightbox = (index: number, source: PhotoWithPrivacy[]) => {
    setCurrentLightboxSource(source);
    setLightboxIndex(index);
    setLightboxOpen(true);

    setLikesCount(source[index].likes);
    setIsLiked(false);
    setCommentsList([]);
    setCommentInput('');
    setShowMenu(false);
    setMenuView('main');
    setAudience(source[index].privacy || 'public');
    setCommentAudience('public');
    setNotificationsOn(true);
  };

  const nextPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newIndex = (lightboxIndex + 1) % currentLightboxSource.length;
    setLightboxIndex(newIndex);
    resetLightboxStateForNewPhoto(newIndex);
  };

  const prevPhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newIndex = (lightboxIndex - 1 + currentLightboxSource.length) % currentLightboxSource.length;
    setLightboxIndex(newIndex);
    resetLightboxStateForNewPhoto(newIndex);
  };

  const resetLightboxStateForNewPhoto = (index: number) => {
    setLikesCount(currentLightboxSource[index].likes);
    setIsLiked(false);
    setCommentsList([]);
    setShowMenu(false);
    setMenuView('main');
    setAudience(currentLightboxSource[index].privacy || 'public');
  };

  const handleLike = () => {
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  const handleSendComment = (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmedInput = sanitizeInput(commentInput);
      if (!trimmedInput) return;

      const newComment: LocalComment = {
          id: Date.now().toString(),
          user: currentUser.name,
          avatar: currentUser.avatar,
          text: trimmedInput,
          timestamp: t('now')
      };

      setCommentsList([...commentsList, newComment]);
      setCommentInput('');
  };

  // --- Menu Handlers ---
  const handleDownload = () => {
      const currentPhoto = currentLightboxSource[lightboxIndex];
      if (currentPhoto) {
          const link = document.createElement('a');
          link.href = currentPhoto.url;
          link.download = `photo_${currentPhoto.id}.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      }
      setShowMenu(false);
  };

  const handleSetProfilePicture = () => {
      if (onUpdateAvatar && currentLightboxSource[lightboxIndex]) {
          onUpdateAvatar(currentLightboxSource[lightboxIndex].url);
          setShowMenu(false);
          setLightboxOpen(false);
      }
  };

  const handleDeleteCurrentPhoto = () => {
      const currentPhoto = currentLightboxSource[lightboxIndex];
      if (onDeletePhoto && currentPhoto) {
        if (window.confirm(t('deletePhotoConfirm'))) {
            setLightboxOpen(false);
            onDeletePhoto(currentPhoto.id);
        }
      } 
      setShowMenu(false);
  };

  const handleToggleNotifications = () => {
      setNotificationsOn(!notificationsOn);
      setShowMenu(false);
  };

  const handleSavePost = () => {
      if (onToggleSave && currentLightboxSource[lightboxIndex]) {
          onToggleSave(currentLightboxSource[lightboxIndex]);
      }
      setShowMenu(false);
  };

  const isCurrentPhotoSaved = currentLightboxSource[lightboxIndex]
      ? savedPhotos.some(p => p.id === currentLightboxSource[lightboxIndex].id)
      : false;

  // --- Create Album Handlers ---
  const handleAlbumFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (e.target.files) {
      setIsLoading(true);
      try {
          const promises = Array.from(e.target.files).map(async (file) => {
              const blobUrl = await readFileAsBlobUrl(file);
              return await convertBlobUrlToBase64(blobUrl);
          });
          const results = await Promise.all(promises);
          setNewAlbumFiles(prev => [...prev, ...results]);
      } catch (err: any) {
          setErrorMessage(typeof err === 'string' ? err : 'Error reading album files');
          setTimeout(() => setErrorMessage(null), 3000);
      } finally {
          setIsLoading(false);
      }
    }
    e.target.value = '';
  };

  const handleCreateAlbum = () => {
    const safeTitle = sanitizeInput(newAlbumTitle);
    if (!safeTitle || !onCreateAlbum) return;

    const albumPhotos: PhotoWithPrivacy[] = newAlbumFiles.map((url, i) => ({
      id: `album_new_${Date.now()}_${i}`,
      url: url,
      likes: 0,
      comments: 0,
      privacy: uploadPrivacy,
    }));

    const newAlbum: Album = {
      id: Date.now().toString(),
      title: safeTitle,
      coverUrl: albumPhotos.length > 0 ? albumPhotos[0].url : '',
      type: 'user',
      photos: albumPhotos
    };

    onCreateAlbum(newAlbum);
    setNewAlbumTitle('');
    setNewAlbumFiles([]);
    setShowCreateAlbumModal(false);
  };

  const handleAlbumClick = (album: Album) => {
    setViewingAlbum(album);
  };

  // --- Renderers ---

  const renderPhotoGrid = (photosToRender: PhotoWithPrivacy[], emptyMessage: string) => {
    if (photosToRender.length === 0) {
      return (
        <div className="text-center py-20 bg-gray-50 rounded-lg">
          <ImageIcon className="w-16 h-16 mx-auto text-gray-300 mb-2" />
          <h3 className="text-xl font-bold text-gray-700">{emptyMessage}</h3>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {photosToRender.map((photo, idx) => (
          <div
            key={photo.id}
            onClick={() => openLightbox(idx, photosToRender)}
            className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer border border-gray-200"
            role="button"
            aria-label={`View photo ${idx + 1}`}
          >
            <img src={photo.url} alt="User content" className="w-full h-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition duration-200 flex items-start justify-end p-2">
              <button type="button" className="p-1.5 bg-white/90 hover:bg-white rounded-full text-gray-700 shadow-sm" onClick={(e) => e.stopPropagation()}>
                 <Pen className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTabs = () => (
    <div className="flex items-center gap-1 md:gap-4 overflow-x-auto no-scrollbar mb-4 border-b border-gray-200 pb-2">
      <button
        type="button"
        onClick={() => setActiveTab('your_photos')}
        className={`px-4 py-2 font-semibold rounded-md transition whitespace-nowrap ${ activeTab === 'your_photos' ? 'text-fb-blue bg-blue-50' : 'text-gray-600 hover:bg-gray-100'}`}
      >
        {t('yourPhotos')}
      </button>
      <button
        type="button"
        onClick={() => setActiveTab('tagged_photos')}
        className={`px-4 py-2 font-semibold rounded-md transition whitespace-nowrap ${ activeTab === 'tagged_photos' ? 'text-fb-blue bg-blue-50' : 'text-gray-600 hover:bg-gray-100'}`}
      >
        {t('taggedPhotos')}
      </button>
      <button
        type="button"
        onClick={() => setActiveTab('albums')}
        className={`px-4 py-2 font-semibold rounded-md transition whitespace-nowrap ${ activeTab === 'albums' ? 'text-fb-blue bg-blue-50' : 'text-gray-600 hover:bg-gray-100'}`}
      >
        {t('albums')}
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 min-h-[500px] animate-fadeIn relative" dir={dir}>
      <input type="file" multiple accept={ALLOWED_MIME_TYPES.join(',')} className="hidden" ref={mainInputRef} onChange={handleMainUpload} />
      <input type="file" multiple accept={ALLOWED_MIME_TYPES.join(',')} className="hidden" ref={addToAlbumInputRef} onChange={handleAddToAlbumFileSelect} />

      {/* Global Error/Loading Status */}
      {(isLoading || errorMessage) && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
             {isLoading && <div className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-md flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin"/> {t('processing')}</div>}
             {errorMessage && <div className="bg-red-500 text-white px-4 py-2 rounded-full shadow-md flex items-center gap-2 text-sm"><AlertCircle className="w-4 h-4"/> {errorMessage}</div>}
          </div>
      )}

      {!viewingAlbum && (
        <div className="flex items-center justify-between mb-2">
           <h2 className="text-xl font-bold text-gray-900">{t('photos')}</h2>
           {isOwnProfile && (
              <div className="flex gap-3 items-center">
                 <PrivacySelect value={uploadPrivacy} onChange={setUploadPrivacy} small t={t} />

                 <button
                  type="button"
                  onClick={() => mainInputRef.current?.click()}
                  className="text-fb-blue font-medium text-sm hover:bg-blue-50 px-3 py-1.5 rounded-md transition flex items-center gap-2"
                  disabled={isLoading}
                 >
                    <Plus className="w-4 h-4" />
                    {t('addPhoto')}
                 </button>
              </div>
           )}
        </div>
      )}

      {viewingAlbum ? (
        <div className="animate-fadeIn">
          <div className="flex items-center gap-3 mb-4 pb-2 border-b border-gray-200">
             <button type="button" onClick={() => setViewingAlbum(null)} className="p-2 hover:bg-gray-100 rounded-full transition">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
             </button>
             <div>
               <h3 className="font-bold text-lg">{viewingAlbum.title}</h3>
               <span className="text-sm text-gray-500">{viewingAlbum.photos.length} {t('albumItems')}</span>
             </div>
             {isOwnProfile && (
                <button
                  type="button"
                  onClick={() => addToAlbumInputRef.current?.click()}
                  className="mr-auto text-fb-blue font-medium text-sm hover:bg-blue-50 px-3 py-1.5 rounded-md transition flex items-center gap-1"
                  disabled={isLoading}
                >
                   <Plus className="w-4 h-4" />
                   {t('addToAlbum')}
                </button>
             )}
          </div>
          {renderPhotoGrid(viewingAlbum.photos, t('emptyAlbum'))}
        </div>
      ) : (
        <>
          {renderTabs()}
          <div className="mt-4">
            {activeTab === 'your_photos' && renderPhotoGrid(photos, t('noYourPhotos'))}
            {activeTab === 'tagged_photos' && renderPhotoGrid(taggedPhotos, t('noTaggedPhotos'))}
            {activeTab === 'albums' && (
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {isOwnProfile && (
                   <div
                     onClick={() => setShowCreateAlbumModal(true)}
                     className="aspect-square bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition group"
                   >
                     <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition">
                       <Plus className="w-6 h-6 text-fb-blue" />
                     </div>
                     <span className="font-semibold text-fb-blue">{t('createAlbum')}</span>
                   </div>
                 )}

                 {albums.map((album) => (
                   <div key={album.id} className="cursor-pointer group" onClick={() => handleAlbumClick(album)}>
                     <div className="aspect-square relative rounded-lg overflow-hidden border border-gray-200 mb-2 bg-gray-100">
                        {album.coverUrl ? (
                             <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover group-hover:opacity-90 transition" />
                        ) : (
                             <div className="w-full h-full flex items-center justify-center text-gray-400">
                                 <ImageIcon className="w-10 h-10" />
                             </div>
                        )}
                        {album.type && album.type !== 'user' && (
                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
                               {album.type === 'profile' ? t('profile') : t('cover')}
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition duration-200"></div>
                     </div>
                     <div className="px-1">
                        <h4 className="font-bold text-[15px] text-gray-900 group-hover:underline truncate">{album.title}</h4>
                        <span className="text-gray-500 text-xs">{album.photos.length} {t('albumItems')}</span>
                     </div>
                   </div>
                 ))}
               </div>
            )}
          </div>
        </>
      )}

      {/* --- Lightbox Modal --- */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[100] bg-black bg-opacity-95 flex items-center justify-center animate-fadeIn" role="dialog" aria-modal="true">
           <div className="w-full h-full flex flex-col md:flex-row overflow-hidden">

               {/* Image Section */}
               <div className="flex-1 bg-black flex items-center justify-center relative group" onClick={(e) => e.stopPropagation()}>
                    <button type="button" aria-label="Close" className="absolute top-4 left-4 p-2 bg-black/50 hover:bg-white/20 rounded-full text-white z-[102]" onClick={() => setLightboxOpen(false)}>
                        <X className="w-6 h-6" />
                    </button>
                    
                    <button type="button" aria-label="Previous" className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-white/20 rounded-full text-white disabled:opacity-30 z-10 hidden md:block" onClick={prevPhoto}>
                        <ChevronRight className="w-8 h-8" />
                    </button>
                    
                    <img src={currentLightboxSource[lightboxIndex].url} className="max-w-full max-h-[85vh] object-contain" alt="Full screen" />
                    
                    <button type="button" aria-label="Next" className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-white/20 rounded-full text-white disabled:opacity-30 z-10 hidden md:block" onClick={nextPhoto}>
                        <ChevronLeft className="w-8 h-8" />
                    </button>
                    
                    {/* Mobile Navigation controls */}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-8 md:hidden">
                         <button onClick={nextPhoto} className="p-2 bg-black/50 rounded-full text-white"><ChevronLeft className="w-6 h-6"/></button>
                         <button onClick={prevPhoto} className="p-2 bg-black/50 rounded-full text-white"><ChevronRight className="w-6 h-6"/></button>
                    </div>
               </div>

               {/* Sidebar */}
               <div className="w-full md:w-[360px] bg-white flex flex-col h-[40vh] md:h-full border-l border-gray-800 shadow-xl" onClick={(e) => e.stopPropagation()}>
                    <div className="p-4 border-b border-gray-200 flex items-center gap-3 relative">
                        <img src={currentUser.avatar} alt="User" className="w-10 h-10 rounded-full border border-gray-200" />
                        <div>
                            <h4 className="font-bold text-sm text-gray-900">{currentUser.name}</h4>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                <span>{t('now')}</span>
                                <span>·</span>
                                {getAudienceIcon(audience)}
                            </div>
                        </div>

                        {/* Nested Dropdown Menu */}
                        <div className="mr-auto relative" ref={menuRef}>
                            <button type="button" onClick={() => { setShowMenu(!showMenu); setMenuView('main'); }} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition">
                                <MoreHorizontal className="w-5 h-5" />
                            </button>

                            {showMenu && (
                                <div className="absolute left-0 top-full mt-1 w-80 bg-white shadow-xl rounded-lg border border-gray-100 z-50 overflow-hidden animate-fadeIn origin-top-left">

                                    {/* MAIN VIEW */}
                                    {menuView === 'main' && (
                                        <>
                                            <button type="button" onClick={handleSavePost} className="w-full text-right px-4 py-3 hover:bg-gray-100 flex items-center gap-3 text-sm text-gray-700">
                                                {isCurrentPhotoSaved ? <BookmarkMinus className="w-5 h-5 text-fb-blue" /> : <Bookmark className="w-5 h-5" />}
                                                {isCurrentPhotoSaved ? t('unsavePost') : t('savePost')}
                                            </button>
                                            <div className="border-t border-gray-100 my-1"></div>

                                            <button type="button" onClick={() => setMenuView('comments')} className="w-full text-right px-4 py-3 hover:bg-gray-100 flex items-center justify-between text-sm text-gray-700 group">
                                                <div className="flex items-center gap-3"><MessageCircle className="w-5 h-5" /> {t('whoCanComment')}</div>
                                                <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                            </button>

                                            <button type="button" onClick={() => setMenuView('audience')} className="w-full text-right px-4 py-3 hover:bg-gray-100 flex items-center justify-between text-sm text-gray-700 group">
                                                <div className="flex items-center gap-3"><Globe className="w-5 h-5" /> {t('editAudience')}</div>
                                                <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                            </button>

                                            <button type="button" onClick={handleToggleNotifications} className="w-full text-right px-4 py-3 hover:bg-gray-100 flex items-center gap-3 text-sm text-gray-700">
                                                {notificationsOn ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                                                {notificationsOn ? t('turnOffNotifications') : t('turnOnNotifications')}
                                            </button>
                                            <div className="border-t border-gray-100 my-1"></div>

                                            <button type="button" onClick={handleDownload} className="w-full text-right px-4 py-3 hover:bg-gray-100 flex items-center gap-3 text-sm text-gray-700">
                                                <Download className="w-5 h-5" /> {t('download')}
                                            </button>

                                            {isOwnProfile && (
                                                <>
                                                    <button type="button" onClick={handleSetProfilePicture} className="w-full text-right px-4 py-3 hover:bg-gray-100 flex items-center gap-3 text-sm text-gray-700">
                                                        <UserCircle className="w-5 h-5" /> {t('setAsProfilePicture')}
                                                    </button>
                                                    <button type="button" onClick={handleDeleteCurrentPhoto} className="w-full text-right px-4 py-3 hover:bg-gray-100 flex items-center gap-3 text-sm text-red-600 font-medium">
                                                        <Trash2 className="w-5 h-5" /> {t('deletePhoto')}
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    )}

                                    {/* AUDIENCE VIEW */}
                                    {menuView === 'audience' && (
                                        <div className="animate-slideLeft">
                                            <div className="flex items-center gap-2 px-2 py-3 border-b border-gray-100">
                                                <button type="button" onClick={() => setMenuView('main')} className="p-1 hover:bg-gray-200 rounded-full"><ArrowRight className="w-5 h-5 text-gray-600" /></button>
                                                <span className="font-bold text-sm text-gray-800">{t('editAudience')}</span>
                                            </div>
                                            <div className="py-2">
                                                {(['public', 'friends', 'friends_of_friends', 'only_me'] as AudienceType[]).map((type) => (
                                                    <button
                                                        type="button"
                                                        key={type}
                                                        onClick={() => { setAudience(type); setShowMenu(false); }}
                                                        className="w-full text-right px-4 py-3 hover:bg-gray-100 flex items-center justify-between text-sm text-gray-700"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-gray-100 p-2 rounded-full">{getAudienceIcon(type)}</div>
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold">{getAudienceLabel(type)}</span>
                                                                <span className="text-xs text-gray-500">{getAudienceDescription(type)}</span>
                                                            </div>
                                                        </div>
                                                        {audience === type && <div className="w-2 h-2 bg-fb-blue rounded-full"></div>}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* COMMENTS VIEW */}
                                    {menuView === 'comments' && (
                                        <div className="animate-slideLeft">
                                             <div className="flex items-center gap-2 px-2 py-3 border-b border-gray-100">
                                                <button type="button" onClick={() => setMenuView('main')} className="p-1 hover:bg-gray-200 rounded-full"><ArrowRight className="w-5 h-5 text-gray-600" /></button>
                                                <span className="font-bold text-sm text-gray-800">{t('whoCanComment')}</span>
                                            </div>
                                            <div className="py-2">
                                                <div className="px-4 text-xs text-gray-500 mb-2">{t('chooseWhoCanComment')}</div>

                                                <button type="button" onClick={() => { setCommentAudience('public'); setShowMenu(false); }} className="w-full text-right px-4 py-3 hover:bg-gray-100 flex items-center justify-between text-sm text-gray-700">
                                                     <div className="flex items-center gap-3">
                                                         <div className="bg-gray-100 p-2 rounded-full"><Globe className="w-4 h-4" /></div>
                                                         <span className="font-semibold">{t('generalAudience')}</span>
                                                     </div>
                                                     {commentAudience === 'public' && <div className="w-2 h-2 bg-fb-blue rounded-full"></div>}
                                                </button>

                                                <button type="button" onClick={() => { setCommentAudience('friends'); setShowMenu(false); }} className="w-full text-right px-4 py-3 hover:bg-gray-100 flex items-center justify-between text-sm text-gray-700">
                                                     <div className="flex items-center gap-3">
                                                         <div className="bg-gray-100 p-2 rounded-full"><Users className="w-4 h-4" /></div>
                                                         <span className="font-semibold">{t('friendsAudience')}</span>
                                                     </div>
                                                     {commentAudience === 'friends' && <div className="w-2 h-2 bg-fb-blue rounded-full"></div>}
                                                </button>

                                                <button type="button" onClick={() => { setCommentAudience('mentions'); setShowMenu(false); }} className="w-full text-right px-4 py-3 hover:bg-gray-100 flex items-center justify-between text-sm text-gray-700">
                                                     <div className="flex items-center gap-3">
                                                         <div className="bg-gray-100 p-2 rounded-full"><AtSign className="w-4 h-4" /></div>
                                                         <div className="flex flex-col">
                                                             <span className="font-semibold">{t('mentions')}</span>
                                                         </div>
                                                     </div>
                                                     {commentAudience === 'mentions' && <div className="w-2 h-2 bg-fb-blue rounded-full"></div>}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className="px-4 py-3 flex justify-between items-center text-sm text-gray-500 border-b border-gray-100">
                        <div className="flex items-center gap-1">
                            <div className="bg-fb-blue p-1 rounded-full"><ThumbsUp className="w-3 h-3 text-white fill-current" /></div>
                            <span>{likesCount > 0 ? likesCount : ''}</span>
                        </div>
                        <div className="flex gap-3">
                            <span>{commentsList.length} {t('comment')}</span>
                        </div>
                    </div>
                    <div className="px-2 py-1 flex items-center justify-between border-b border-gray-200">
                         <button type="button" onClick={handleLike} className={`flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 rounded-md transition font-medium text-sm ${isLiked ? 'text-fb-blue' : 'text-gray-600'}`}>
                            <ThumbsUp className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} /> {t('like')}
                         </button>
                         <button type="button" className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 rounded-md transition font-medium text-gray-600 text-sm">
                            <MessageCircle className="w-5 h-5" /> {t('comment')}
                         </button>
                         <button type="button" className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 rounded-md transition font-medium text-gray-600 text-sm">
                            <Share2 className="w-5 h-5" /> {t('share')}
                         </button>
                    </div>

                    {/* Comments List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {commentsList.length === 0 ? (
                            <div className="text-center text-gray-400 py-10 text-sm">{t('beFirstToComment')}</div>
                        ) : (
                            commentsList.map(comment => (
                                <div key={comment.id} className="flex gap-2 items-start">
                                    <img src={comment.avatar} className="w-8 h-8 rounded-full" alt="commenter avatar" />
                                    <div className="flex flex-col">
                                        <div className="bg-gray-200 px-3 py-2 rounded-2xl rounded-tr-none">
                                            <span className="font-bold text-xs block text-gray-900">{comment.user}</span>
                                            <span className="text-sm text-gray-800 break-words">{comment.text}</span>
                                        </div>
                                        <div className="flex gap-3 text-[11px] text-gray-500 pr-2 mt-1">
                                            <span className="font-semibold cursor-pointer hover:underline">{t('like')}</span>
                                            <span className="font-semibold cursor-pointer hover:underline">{t('reply')}</span>
                                            <span>{comment.timestamp}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={commentsEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t border-gray-200 bg-white">
                        <form onSubmit={handleSendComment} className="flex items-center gap-2">
                             <img src={currentUser.avatar} className="w-8 h-8 rounded-full" alt="my avatar" />
                             <div className="flex-1 relative">
                                 <input type="text" className="w-full bg-gray-100 border-none rounded-full py-2 px-3 pr-10 text-sm outline-none focus:ring-1 focus:ring-gray-300 transition" placeholder={t('writeComment')} value={commentInput} onChange={(e) => setCommentInput(e.target.value)} />
                                 <Smile className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer hover:text-gray-700" />
                             </div>
                             <button type="button" onClick={handleSendComment} disabled={!commentInput.trim()} className="text-fb-blue disabled:opacity-50 hover:bg-blue-50 p-2 rounded-full transition"><Send className="w-5 h-5 rotate-180" /></button>
                        </form>
                    </div>
               </div>
           </div>
        </div>
      )}

      {/* --- Create Album Modal --- */}
      {showCreateAlbumModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-fadeIn" role="dialog" aria-modal="true">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-scaleIn">
             <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg">{t('createAlbumModalTitle')}</h3>
                <button type="button" onClick={() => setShowCreateAlbumModal(false)} className="text-gray-500 hover:text-gray-700 bg-gray-200 rounded-full p-1"><X className="w-5 h-5" /></button>
             </div>
             <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                   <label htmlFor="album-name" className="block text-sm font-medium text-gray-700 mb-1">{t('albumName')}</label>
                   <input id="album-name" type="text" placeholder={t('enterAlbumName')} className="w-full border p-2 rounded-md focus:ring-2 focus:ring-fb-blue focus:border-transparent outline-none" value={newAlbumTitle} onChange={(e) => setNewAlbumTitle(e.target.value)} />
                </div>
                <div>
                    <input type="file" multiple accept={ALLOWED_MIME_TYPES.join(',')} className="hidden" ref={albumInputRef} onChange={handleAlbumFilesSelect} />
                    <div onClick={() => !isLoading && albumInputRef.current?.click()} className={`border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                         <Upload className="w-10 h-10 text-gray-400 mb-2" />
                         <span className="text-sm font-medium text-gray-600">{t('addPhotosFromDevice')}</span>
                         <span className="text-xs text-gray-400 mt-1">{t('chooseMultiplePhotos')}</span>
                    </div>
                </div>
                {newAlbumFiles.length > 0 && (
                   <div className="grid grid-cols-4 gap-2 mt-4">
                      {newAlbumFiles.map((url, i) => (
                         <div key={i} className="aspect-square relative rounded-md overflow-hidden group">
                            <img src={url} className="w-full h-full object-cover" alt="preview" />
                            <button type="button" onClick={() => setNewAlbumFiles(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-red-500 transition"><X className="w-3 h-3" /></button>
                         </div>
                      ))}
                   </div>
                )}
             </div>
             <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
                <button type="button" onClick={() => setShowCreateAlbumModal(false)} className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-md">{t('cancel')}</button>
                <button type="button" onClick={handleCreateAlbum} disabled={!newAlbumTitle.trim() || isLoading} className="px-6 py-2 bg-fb-blue text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition">
                   {newAlbumFiles.length > 0 ? t('createAndUploadPhotos', { count: newAlbumFiles.length }) : t('createEmptyAlbum')}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePhotos;