
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Video,
  Image,
  Smile,
  Sparkles,
  X,
  AlertTriangle,
  Settings,
  Mic,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Send
} from 'lucide-react';
import DOMPurify from 'dompurify';
import type { User } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { generatePostContent } from '../services/geminiService';

// ==========================================
// 1. Types & Interfaces
// ==========================================

export interface CreatePostProps {
  currentUser: User;
  /**
   * Callback when a post is created.
   * Content is sanitized text.
   * Media is the data URL (Base64) or null.
   */
  onPostCreate: (content: string, media?: string) => void;
}

// ==========================================
// 2. Constants & Utilities
// ==========================================

const MAX_FILE_SIZE_MB = 10;
const MAX_TEXT_LENGTH = 5000; // Security: Prevent large payload DoS
// Security: Magic Numbers for file validation
const MAGIC_NUMBERS: Record<string, string[]> = {
  'ffd8ffe0': ['image/jpeg'],
  'ffd8ffe1': ['image/jpeg'],
  'ffd8ffe2': ['image/jpeg'],
  '89504e47': ['image/png'],
  '47494638': ['image/gif'],
  '52494646': ['image/webp'],
  '00000018': ['video/mp4'],
  '00000020': ['video/mp4'],
  '1a45dfa3': ['video/webm']
};

const FEELINGS_LIST = [
  { label: 'سعيد', emoji: '😃' },
  { label: 'محبوب', emoji: '🥰' },
  { label: 'حزين', emoji: '😢' },
  { label: 'متحمس', emoji: '🤩' },
  { label: 'محبط', emoji: '😞' },
  { label: 'شاكر', emoji: '🙏' },
];

const ACTIVITIES_LIST = [
  { label: 'يحتفل', emoji: '🎉' },
  { label: 'يشاهد', emoji: '📺' },
  { label: 'يأكل', emoji: '🍔' },
  { label: 'يسافر', emoji: '✈️' },
];

// Security: Robust sanitization using DOMPurify
const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
};

/**
 * Validates file type using Magic Numbers (File Signatures)
 * This prevents extension spoofing (e.g. .exe renamed to .jpg)
 */
const validateFileSecurity = async (file: File): Promise<boolean> => {
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) return false;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = (e) => {
      if (!e.target || !e.target.result) return resolve(false);
      const arr = (new Uint8Array(e.target.result as ArrayBuffer)).subarray(0, 4);
      let header = "";
      for (let i = 0; i < arr.length; i++) {
        header += arr[i].toString(16);
      }
      
      // Check against known magic numbers
      const isValid = Object.keys(MAGIC_NUMBERS).some(magic => header.toLowerCase().startsWith(magic));
      resolve(isValid);
    };
    reader.readAsArrayBuffer(file.slice(0, 4));
  });
};

/**
 * Converts File to Base64 Data URL for secure transmission/display in parent
 */
const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// ==========================================
// 3. Custom Hooks
// ==========================================

const useCamera = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const startCamera = useCallback(async () => {
    if (stream) return;
    
    // SECURITY: Check for Secure Context (HTTPS)
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setError('INSECURE_CONTEXT');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('API_NOT_SUPPORTED');
      }
      const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(newStream);
    } catch (err: any) {
      console.error('Camera Error:', err);
      let msg = 'API_NOT_SUPPORTED';
      if (err.name === 'NotAllowedError') msg = 'PERMISSION_DENIED';
      else if (err.name === 'NotFoundError') msg = 'NOT_FOUND';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [stream]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    } माणूस
  }, [stream]);

  return { stream, error, isLoading, startCamera, stopCamera };
};

// ==========================================
// 4. Main Component
// ==========================================

const CreatePost: React.FC<CreatePostProps> = ({ currentUser, onPostCreate }) => {
  const { t, dir } = useLanguage();
  
  const [content, setContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showFeelingModal, setShowFeelingModal] = useState(false);
  const [selectedFeeling, setSelectedFeeling] = useState<{label: string, emoji: string} | null>(null);
  const [activityType, setActivityType] = useState<'feeling' | 'activity'>('feeling');

  const [showLiveModal, setShowLiveModal] = useState(false);
  const { stream, error: cameraError, isLoading: isCameraLoading, startCamera, stopCamera } = useCamera();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [notification, setNotification] = useState<{type: 'error' | 'success', msg: string} | null>(null);

  const showNotification = (type: 'error' | 'success', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4000);
  };

  // --- Effects ---

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (showLiveModal) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [showLiveModal, startCamera, stopCamera]);

  useEffect(() => {
    return () => {
      if (previewUrl && selectedFile) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl, selectedFile]);

  // --- Handlers ---

  const handleMagicPost = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const prompt = content.trim() || 'اكتب شيئاً ملهماً عن السفر أو التكنولوجيا';
      const aiContent = await generatePostContent(prompt);
      setContent(prev => prev ? `${prev}\n${aiContent}` : aiContent);
    } catch (err) {
      showNotification('error', 'فشل توليد المحتوى، تأكد من اتصالك.');
    } finally {
      setIsGenerating(false);
    }
  }, [content, isGenerating]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Validate Size
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      showNotification('error', `حجم الملف كبير جداً (الحد الأقصى ${MAX_FILE_SIZE_MB} ميجابايت).`);
      e.target.value = '';
      return;
    }

    // 2. Security Check: Magic Numbers
    const isValid = await validateFileSecurity(file);
    if (!isValid) {
      showNotification('error', 'نوع الملف غير مدعوم أو تالف.');
      e.target.value = '';
      return;
    }

    // 3. Determine Type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setSelectedFile(file);
    setMediaType(isVideo ? 'video' : 'image');
    
    e.target.value = '';
  }, [previewUrl]);

  const removeMedia = useCallback(() => {
    if (previewUrl && selectedFile) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    setMediaType(null);
  }, [previewUrl, selectedFile]);

  const handleGoLive = useCallback(() => {
    if (stream) {
      const safeName = sanitizeInput(currentUser.name || 'مستخدم');
      // Mock live post
      onPostCreate(`🎥 بث مباشر — ${safeName} بدأ بثاً مباشراً!`);
      setShowLiveModal(false);
      showNotification('success', 'تم بدء البث المباشر بنجاح!');
    }
  }, [stream, currentUser, onPostCreate]);

  const handleSubmit = useCallback(async () => {
    let finalContent = sanitizeInput(content.trim());
    
    if (selectedFeeling) {
      const prefix = activityType === 'feeling' ? 'يشعر بـ' : '';
      const feelingStr = `${prefix} ${selectedFeeling.label} ${selectedFeeling.emoji}`;
      finalContent = `${feelingStr}\n${finalContent}`.trim();
    }

    if (!finalContent && !selectedFile) {
      showNotification('error', 'الرجاء كتابة نص أو اختيار ملف.');
      return;
    }

    let mediaData: string | undefined = undefined;
    if (selectedFile) {
        try {
            mediaData = await readFileAsDataURL(selectedFile);
        } catch (e) {
            showNotification('error', 'فشل في معالجة الملف.');
            return;
        }
    }

    onPostCreate(finalContent, mediaData); 
    
    setContent('');
    removeMedia();
    setSelectedFeeling(null);
    showNotification('success', 'تم نشر المنشور بنجاح!');
  }, [content, selectedFeeling, activityType, selectedFile, onPostCreate, removeMedia]);

  const getCameraErrorMessage = (code: string | null) => {
    switch (code) {
      case 'PERMISSION_DENIED': return 'تم رفض إذن الوصول للكاميرا.';
      case 'NOT_FOUND': return 'لم يتم العثور على كاميرا متصلة.';
      case 'INSECURE_CONTEXT': return 'الكاميرا تتطلب اتصالاً آمناً (HTTPS).';
      case 'API_NOT_SUPPORTED': return 'المتصفح لا يدعم الوصول للكاميرا.';
      default: return 'حدث خطأ أثناء تشغيل الكاميرا.';
    }
  };

  const avatarUrl = currentUser.avatar || "/default-avatar.png";

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-card border border-gray-100 dark:border-gray-700 p-4 mb-4 relative z-10 font-sans transition-colors" dir={dir}>
        
        {notification && (
          <div className={`absolute top-0 left-0 right-0 -mt-12 mx-auto w-fit px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-fade-in z-50 ${
            notification.type === 'error' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'
          }`}>
            {notification.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span className="text-sm font-medium">{notification.msg}</span>
          </div>
        )}

        <div className="flex gap-3 mb-3">
          <img 
            src={avatarUrl} 
            alt={currentUser.name} 
            className="h-11 w-11 rounded-full object-cover border border-gray-200 dark:border-gray-600" 
            onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/150'; }}
          />
          <div className="flex-1">
            {selectedFeeling && (
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-1 animate-fade-in bg-fb-blue/10 w-fit px-3 py-1 rounded-full border border-fb-blue/20">
                <span className="font-semibold text-gray-900 dark:text-white">{currentUser.name}</span>
                <span>{activityType === 'feeling' ? 'يشعر بـ' : ''}</span>
                <span className="font-bold text-fb-blue">{selectedFeeling.label} {selectedFeeling.emoji}</span>
                <button onClick={() => setSelectedFeeling(null)} className="mr-2 hover:bg-fb-blue/20 rounded-full p-0.5 transition">
                  <X className="w-3 h-3 text-fb-blue" />
                </button>
              </div>
            )}
            
            <div className={`bg-gray-50 dark:bg-gray-700 rounded-2xl px-4 py-3 transition-all focus-within:bg-white dark:focus-within:bg-gray-600 focus-within:ring-2 focus-within:ring-fb-blue/20 focus-within:shadow-sm border border-transparent focus-within:border-fb-blue/30 ${isGenerating ? 'opacity-70 pointer-events-none' : ''}`}>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="bg-transparent w-full outline-none placeholder-gray-400 dark:placeholder-gray-500 text-base resize-none min-h-[60px] text-gray-900 dark:text-white"
                placeholder={`${t('create_post_placeholder')} ${currentUser.name.split(' ')[0]}؟`}
                rows={Math.min(content.split('\n').length, 6)}
                disabled={isGenerating}
                maxLength={MAX_TEXT_LENGTH}
              />
              <div className="text-xs text-gray-400 text-left mt-1">
                {content.length}/{MAX_TEXT_LENGTH}
              </div>
            </div>
          </div>
        </div>

        {previewUrl && (
          <div className="relative mb-4 rounded-xl overflow-hidden bg-black/5 border border-gray-200 dark:border-gray-600 group">
            {mediaType === 'video' ? (
              <video src={previewUrl} controls className="max-h-96 w-full object-contain bg-black" />
            ) : (
              <img src={previewUrl} alt="Preview" className="max-h-96 w-full object-contain" />
            )}
            <button 
              onClick={removeMedia} 
              className="absolute top-3 left-3 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition backdrop-blur-sm opacity-0 group-hover:opacity-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            <ActionButton 
              onClick={() => setShowLiveModal(true)} 
              icon={<Video className="h-5 w-5 text-red-500" />} 
              label={t('btn_live')}
            />

            <ActionButton 
              onClick={() => fileInputRef.current?.click()} 
              icon={<Image className="h-5 w-5 text-green-500" />} 
              label={t('btn_photo')} 
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm" 
                onChange={handleFileChange} 
              />
            </ActionButton>

            <ActionButton 
              onClick={() => setShowFeelingModal(true)} 
              icon={<Smile className="h-5 w-5 text-yellow-500" />} 
              label={t('btn_feeling')} 
            />

            <button 
              onClick={handleMagicPost} 
              disabled={isGenerating}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                isGenerating ? 'bg-purple-100 dark:bg-purple-900/30 cursor-wait' : 'hover:bg-purple-50 dark:hover:bg-purple-900/20'
              }`}
            >
              {isGenerating ? (
                <Loader2 className="h-5 w-5 text-purple-600 dark:text-purple-400 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              )}
              <span className="text-purple-700 dark:text-purple-300 font-medium text-sm hidden sm:inline">
                {isGenerating ? t('ai_thinking') : t('btn_ai')}
              </span>
            </button>
          </div>

          <button 
            onClick={handleSubmit} 
            disabled={(!content.trim() && !selectedFile && !selectedFeeling) || isGenerating}
            className="bg-fb-blue text-white px-6 py-2 rounded-lg font-semibold hover:bg-emerald-800 transition shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center gap-2"
          >
            {t('btn_post')}
            <Send size={16} className={dir === 'rtl' ? 'rotate-180' : ''} />
          </button>
        </div>

        {/* ================= MODALS ================= */}

        {showLiveModal && (
          <Modal onClose={() => setShowLiveModal(false)} title="بث مباشر">
            <div className="aspect-video bg-gray-900 relative flex items-center justify-center overflow-hidden rounded-xl shadow-inner">
              {cameraError ? (
                <div className="text-center p-6">
                  <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                  <p className="text-white font-medium mb-4">{getCameraErrorMessage(cameraError)}</p>
                  <button onClick={startCamera} className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition">
                    إعادة المحاولة
                  </button>
                </div>
              ) : !stream ? (
                <div className="text-white flex flex-col items-center">
                  <Loader2 className="w-10 h-10 animate-spin mb-3 text-fb-blue" />
                  <p className="text-gray-300">جاري تشغيل الكاميرا...</p>
                </div>
              ) : (
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
              )}

              <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6 z-20">
                <button className="bg-black/40 p-3 rounded-full hover:bg-black/60 backdrop-blur-md transition text-white"><Settings className="w-5 h-5" /></button>
                <button 
                  onClick={handleGoLive} 
                  disabled={!stream} 
                  className="bg-red-600 text-white px-8 py-3 rounded-full font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-red-900/30 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Video className="w-5 h-5" />
                  بدء البث
                </button>
                <button className="bg-black/40 p-3 rounded-full hover:bg-black/60 backdrop-blur-md transition text-white"><Mic className="w-5 h-5" /></button>
              </div>
            </div>
          </Modal>
        )}

        {showFeelingModal && (
          <Modal onClose={() => setShowFeelingModal(false)} title="بم تشعر؟">
            <div className="flex border-b border-gray-100 dark:border-gray-700 mb-4">
              <TabButton active={activityType === 'feeling'} onClick={() => setActivityType('feeling')} label="مشاعر" />
              <TabButton active={activityType === 'activity'} onClick={() => setActivityType('activity')} label="أنشطة" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1 custom-scrollbar">
              {(activityType === 'feeling' ? FEELINGS_LIST : ACTIVITIES_LIST).map((item, idx) => (
                <button 
                  key={idx} 
                  onClick={() => { setSelectedFeeling(item); setShowFeelingModal(false); }} 
                  className="flex items-center gap-3 p-3 hover:bg-fb-blue/10 dark:hover:bg-gray-700 rounded-xl transition text-right border border-transparent hover:border-fb-blue/20 dark:text-gray-200"
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                </button>
              ))}
            </div>
          </Modal>
        )}
      </div>
    </>
  );
};

// ==========================================
// 6. Sub-Components
// ==========================================

const ActionButton: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string; children?: React.ReactNode }> = ({ onClick, icon, label, children }) => (
  <button onClick={onClick} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0 group relative">
    {icon}
    <span className="text-gray-600 dark:text-gray-300 font-medium text-sm hidden sm:inline group-hover:text-gray-900 dark:group-hover:text-white">{label}</span>
    {children}
  </button>
);

const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
  <button 
    onClick={onClick} 
    className={`flex-1 py-2 font-semibold text-sm transition-all relative ${
      active ? 'text-fb-blue dark:text-emerald-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
    }`}
  >
    {label}
    {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-fb-blue dark:bg-emerald-400 rounded-t-full mx-4"></span>}
  </button>
);

const Modal: React.FC<{ onClose: () => void; title: string; children: React.ReactNode }> = ({ onClose, title, children }) => (
  <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm" onClick={onClose}>
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] transform transition-all scale-100" onClick={e => e.stopPropagation()}>
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
        <h3 className="font-bold text-lg text-gray-800 dark:text-white">{title}</h3>
        <button onClick={onClose} className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition text-gray-600 dark:text-gray-300">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4 overflow-y-auto bg-white dark:bg-gray-800">
        {children}
      </div>
    </div>
  </div>
);

export default CreatePost;