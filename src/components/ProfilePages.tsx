import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Flag, Search, ThumbsUp, MessageCircle, ChevronLeft, ChevronRight, CheckCircle, X, AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// --- Types ---
interface Page {
  id: string;
  name: string;
  avatar: string;
  category: string;
  likesCount: string;
  isLiked: boolean;
}

type ToastType = 'success' | 'info' | 'error';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

// --- Constants ---
const ALL_CATEGORY = 'all';
const MAX_SEARCH_LENGTH = 60; // Security: Limit input length to prevent potential processing issues
const DEFAULT_AVATAR = 'https://via.placeholder.com/100?text=Page'; // Fallback image

const INITIAL_PAGES: Page[] = [
  { id: '1', name: 'ناشيونال جيوغرافيك', avatar: 'https://picsum.photos/100/100?random=301', category: 'Science & Nature', likesCount: '50M', isLiked: true },
  { id: '2', name: 'نادي ليفربول', avatar: 'https://picsum.photos/100/100?random=302', category: 'Sports', likesCount: '30M', isLiked: true },
  { id: '3', name: 'أخبار التقنية', avatar: 'https://picsum.photos/100/100?random=303', category: 'Technology', likesCount: '1.2M', isLiked: false }, 
  { id: '4', name: 'مطبخ منال', avatar: 'https://picsum.photos/100/100?random=304', category: 'Food & Drink', likesCount: '500K', isLiked: true },
  { id: '5', name: 'عشاق السفر', avatar: 'https://picsum.photos/100/100?random=305', category: 'Travel', likesCount: '200K', isLiked: false },
  { id: '6', name: 'برمجة بالعربي', avatar: 'https://picsum.photos/100/100?random=306', category: 'Technology', likesCount: '80K', isLiked: true },
];

// --- Custom Hooks ---

// Security & Performance: Debounce hook to prevent DoS on heavy search filtering
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// --- Helper Components ---

const PageCardSkeleton: React.FC = () => (
  <div className="flex items-center gap-4 p-4 border border-gray-100 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 animate-pulse">
    <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
    </div>
  </div>
);

const Toast: React.FC<{ message: string; type: ToastType; onClose: () => void; dir: string }> = ({ message, type, onClose, dir }) => {
  const bgColors = {
    success: 'bg-green-600',
    info: 'bg-blue-600',
    error: 'bg-red-600'
  };
  
  const Icons = {
    success: CheckCircle,
    info: MessageCircle,
    error: AlertCircle
  };

  const Icon = Icons[type];

  return (
    <div 
      className={`fixed bottom-4 ${dir === 'rtl' ? 'left-4' : 'right-4'} z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white transform transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in ${bgColors[type]}`}
      role="alert"
    >
      <Icon className="w-5 h-5" />
      {/* Security: Ensure message is rendered as text, not HTML */}
      <span className="text-sm font-medium max-w-xs truncate">{message}</span>
      <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1 transition-colors" aria-label="Close notification">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

interface PageCardProps {
  page: Page;
  onToggleLike: (id: string) => void;
  onMessage: (name: string) => void;
  t: (key: string) => string;
}

const PageCard: React.FC<PageCardProps> = React.memo(({ page, onToggleLike, onMessage, t }) => {
  // Security: Handle broken images safely
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = DEFAULT_AVATAR;
    e.currentTarget.onerror = null; // Prevent infinite loop
  };

  return (
    <div className="group flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900 transition-all duration-200 bg-white dark:bg-gray-800">
      <div className="relative">
        <img 
          src={page.avatar} 
          alt={page.name} // Accessibility
          loading="lazy"
          onError={handleImageError}
          referrerPolicy="no-referrer" // Security: Don't leak referrer
          className="w-20 h-20 rounded-full border border-gray-100 dark:border-gray-600 object-cover shrink-0 group-hover:scale-105 transition-transform duration-300 bg-gray-100 dark:bg-gray-700" 
        />
        {page.isLiked && (
          <div className="absolute -bottom-1 -right-1 rtl:-left-1 rtl:right-auto bg-blue-500 text-white p-1 rounded-full border-2 border-white dark:border-gray-800">
            <ThumbsUp className="w-3 h-3 fill-current" />
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer truncate transition-colors">
          {page.name}
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{page.category}</span>
        <span className="text-xs text-gray-400 dark:text-gray-500 block mb-3 font-medium">{page.likesCount} {t('btn_like')}</span>
        
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={() => onMessage(page.name)}
            className="flex-1 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-200 outline-none"
          >
            <MessageCircle className="w-4 h-4" /> 
            <span>{t('profile_message')}</span>
          </button>
          <button
            type="button"
            onClick={() => onToggleLike(page.id)}
            className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 focus:ring-2 focus:ring-blue-200 outline-none ${
              page.isLiked
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                : 'bg-blue-600 text-white border border-transparent hover:bg-blue-700 shadow-sm hover:shadow'
            }`}
          >
            <ThumbsUp className={`w-4 h-4 ${page.isLiked ? 'fill-current' : ''}`} /> 
            <span>{page.isLiked ? t('btn_like') : t('btn_like')}</span>
          </button>
        </div>
      </div>
    </div>
  );
});

// --- Main Component ---

const ProfilePages: React.FC = () => {
  const { t, dir } = useLanguage();
  const [pages, setPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // To ensure stability for useCallback
  const pagesRef = useRef<Page[]>([]);

  // Performance: Debounce search term (300ms delay)
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPages(INITIAL_PAGES);
      pagesRef.current = INITIAL_PAGES;
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(INITIAL_PAGES.map(p => p.category)));
    return [ALL_CATEGORY, ...cats];
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ id: Date.now(), message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Logic Fix: Correctly handle state update and side effects safely using ref
  const handleToggleLike = useCallback((id: string) => {
    // We use the functional update to ensure we have the latest state
    setPages(prevPages => {
      const updatedPages = prevPages.map(page => {
        if (page.id === id) {
          return { ...page, isLiked: !page.isLiked };
        }
        return page;
      });
      
      // Update ref for consistency
      pagesRef.current = updatedPages;
      return updatedPages;
    });

    // Determine which page was toggled to show toast
    // Since we are inside the callback and state update is scheduled, 
    // we look at the ref (which we assume was consistent before this op) or the current 'pages' state via closure if dependency was set,
    // but simpler to find it from the previous known state or current ref.
    const targetPage = pagesRef.current.find(p => p.id === id);
    
    if (targetPage) {
        // Note: targetPage here is the *old* state before toggle inside the setPages call above finishes? 
        // Actually, we updated pagesRef inside the setPages callback if we could, but we can't side-effect inside setState easily.
        // Correct approach: Find it, calculate new status locally for toast.
        const action = !targetPage.isLiked ? 'تم الإعجاب بـ' : 'تم إلغاء الإعجاب بـ'; // Inverted logic because targetPage is currently pre-update
        // In a real app with localization keys: `t(targetPage.isLiked ? 'unliked_action' : 'liked_action', { name: targetPage.name })`
        showToast(`${action} ${targetPage.name}`);
    }
  }, [showToast]);

  const handleMessage = useCallback((name: string) => {
    // Security: Truncate name in toast to prevent UI overflow
    const safeName = name.length > 20 ? name.substring(0, 20) + '...' : name;
    showToast(`${t('profile_message')} ${safeName}...`, 'info');
  }, [showToast, t]);

  // Filtering Logic uses Debounced Term
  const filteredPages = useMemo(() => {
    // Security: Sanitize input before processing (trim)
    const cleanTerm = debouncedSearchTerm.trim().toLowerCase();
    
    return pages.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(cleanTerm);
      const matchesCategory = selectedCategory === ALL_CATEGORY || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [pages, debouncedSearchTerm, selectedCategory]);

  // Security: Input Handler with Validation
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_SEARCH_LENGTH) {
      setSearchTerm(value);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 min-h-[600px] overflow-hidden transition-colors duration-300" dir={dir}>
      {/* Header Section */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('profile_pages')}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">صفحات قد تهمك بناءً على اهتماماتك</p>
          </div>
          
          <div className="relative w-full md:w-72">
             <Search className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none`} />
             <input 
               type="text" 
               placeholder={t('search_placeholder')}
               // Security: Add maxLength attribute
               maxLength={MAX_SEARCH_LENGTH}
               className={`w-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-white dark:focus:bg-gray-900 border border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl py-2.5 ${dir === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-sm transition-all outline-none placeholder:text-gray-400 dark:text-white`}
               value={searchTerm}
               onChange={handleSearchChange}
             />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-800 dark:focus:ring-gray-400 ${
                selectedCategory === cat
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {cat === ALL_CATEGORY ? t('menu_more') : cat} {/* Using menu_more as a placeholder for 'All' if specific key missing */}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6 bg-gray-50/50 dark:bg-gray-900/50 min-h-[400px]">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(n => <PageCardSkeleton key={n} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {filteredPages.length > 0 ? (
               filteredPages.map(page => (
                 <PageCard 
                   key={page.id} 
                   page={page} 
                   onToggleLike={handleToggleLike}
                   onMessage={handleMessage}
                   t={t}
                 />
               ))
             ) : (
                <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center py-16 text-center">
                   <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                     <Flag className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                   </div>
                   <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">لا توجد نتائج</h3>
                   {/* Security: Truncate displayed search term to avoid UI breaking */}
                   <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto break-words">
                     لم نعثر على صفحات تطابق "{searchTerm.length > 20 ? searchTerm.slice(0, 20) + '...' : searchTerm}" في قسم "{selectedCategory === ALL_CATEGORY ? 'الكل' : selectedCategory}".
                   </p>
                   <button 
                     onClick={() => { setSearchTerm(''); setSelectedCategory(ALL_CATEGORY); }}
                     className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-blue-200 rounded px-2"
                   >
                     مسح فلاتر البحث
                   </button>
                </div>
             )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-center">
        <button className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 transition-colors focus:outline-none focus:underline">
          <span>{t('profile_more')}</span>
          {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Toast Notification Container */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
          dir={dir}
        />
      )}
    </div>
  );
};

export default ProfilePages;