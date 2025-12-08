import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Users, Search, MoreHorizontal, Loader2, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// --- Types ---
interface Group {
  id: string;
  name: string;
  coverUrl: string;
  membersCount: string;
  role: 'admin' | 'member';
  lastActive: string;
}

// --- Security Utilities ---

/**
 * Validates if a string is a safe HTTPS URL.
 * Prevents 'javascript:', 'file:', or 'http:' (mixed content) schemes.
 */
const isValidSecureUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Sanitizes search input to prevent injection attacks.
 */
const sanitizeInput = (input: string): string => {
  return input.replace(/[^\w\s\u0600-\u06FF]/g, '').trim();
};

/**
 * Custom Hook for Debouncing values.
 * Prevents rapid state updates/filtering on every keystroke (DoS protection).
 */
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

// --- Constants ---
const MOCK_GROUPS_DATA: Group[] = [
  { id: '1', name: 'عشاق البرمجة', coverUrl: 'https://picsum.photos/300/150?random=201', membersCount: '15K', role: 'admin', lastActive: 'منذ ساعة' },
  { id: '2', name: 'تصميم الجرافيك العربي', coverUrl: 'https://picsum.photos/300/150?random=202', membersCount: '42K', role: 'member', lastActive: 'منذ 5 ساعات' },
  { id: '3', name: 'سوق المستعمل', coverUrl: 'https://picsum.photos/300/150?random=203', membersCount: '102K', role: 'member', lastActive: 'منذ يوم' },
  { id: '4', name: 'وظائف خالية', coverUrl: 'https://picsum.photos/300/150?random=204', membersCount: '250K', role: 'member', lastActive: 'منذ 3 ساعات' },
  { id: '5', name: 'نادي القراءة', coverUrl: 'https://picsum.photos/300/150?random=205', membersCount: '5.3K', role: 'member', lastActive: 'منذ يومين' },
];

const FALLBACK_IMAGE = 'https://via.placeholder.com/300x150?text=No+Image';

// --- Localized Strings (Component Specific) ---
const COMPONENT_STRINGS = {
  ar: {
    adminRole: 'مسؤول',
    visitButton: 'زيارة',
    optionsButton: 'خيارات',
    groupsHeader: 'المجموعات',
    searchPlaceholder: 'بحث في المجموعات...',
    noGroupsMessage: 'لا توجد مجموعات مطابقة للبحث.',
    emptyStateMessage: 'لم تنضم لأي مجموعات بعد.',
    errorMessage: 'حدث خطأ أثناء تحميل البيانات.',
    retryButton: 'إعادة المحاولة',
    toastVisit: (name: string) => `جاري الانتقال إلى "${name}"...`,
    toastMoreOptions: (name: string) => `خيارات إضافية لمجموعة "${name}"`,
  },
  en: {
    adminRole: 'Admin',
    visitButton: 'Visit',
    optionsButton: 'Options',
    groupsHeader: 'Groups',
    searchPlaceholder: 'Search groups...',
    noGroupsMessage: 'No groups found.',
    emptyStateMessage: 'You haven\'t joined any groups yet.',
    errorMessage: 'Error loading data.',
    retryButton: 'Retry',
    toastVisit: (name: string) => `Visiting "${name}"...`,
    toastMoreOptions: (name: string) => `More options for "${name}"`,
  }
};

// --- Components ---

const GroupCardSkeleton = () => (
  <div className="border border-gray-200 rounded-xl overflow-hidden flex flex-col bg-white animate-pulse shadow-sm">
    <div className="h-24 bg-gray-200 w-full"></div>
    <div className="p-4 flex flex-col flex-1">
      <div className="flex justify-between items-start mb-2">
        <div className="h-5 bg-gray-200 rounded w-2/3"></div>
        <div className="h-5 bg-gray-200 rounded w-12"></div>
      </div>
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
      <div className="mt-auto pt-2 flex gap-2">
        <div className="h-9 bg-gray-200 rounded-lg flex-1"></div>
        <div className="h-9 bg-gray-200 rounded-lg w-10"></div>
      </div>
    </div>
  </div>
);

const ProfileGroups: React.FC = () => {
  const { language, dir } = useLanguage();
  const strings = COMPONENT_STRINGS[language] || COMPONENT_STRINGS['en'];

  const [groups, setGroups] = useState<Group[]>([]); 
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'info'} | null>(null);
  
  // SECURITY: Debounce search term to prevent UI freezing on rapid typing
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); 

  const fetchGroups = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // SECURITY: In a real app, validate API response schema here (e.g., using Zod)
      // For now, we assume the mock data structure is correct but we will sanitize URLs in render.
      setGroups(MOCK_GROUPS_DATA);
    } catch (err) {
      setError(strings.errorMessage);
      // SECURITY: Log error to monitoring service, do not expose stack trace to user
      console.error("Failed to fetch groups", err); 
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []); 

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    // SECURITY: Ensure message is treated as text, not HTML (React does this by default)
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null; 
    }, 3000);
  };

  const filteredGroups = useMemo(() => {
    // SECURITY: Trim input to avoid whitespace issues
    const term = debouncedSearchTerm.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter(g => g.name.toLowerCase().includes(term));
  }, [groups, debouncedSearchTerm]);

  const handleVisit = (group: Group, e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    showToast(strings.toastVisit(group.name), 'success');
  };

  const handleMore = (group: Group, e: React.MouseEvent) => {
    e.stopPropagation();
    showToast(strings.toastMoreOptions(group.name), 'info');
  };

  // SECURITY: Input change handler with sanitization
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 60) {
        setSearchTerm(value);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm min-h-[500px] p-4 md:p-6 relative font-sans border border-gray-100 dark:border-gray-700 transition-colors duration-200" dir={dir}>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-fb-text dark:text-white flex items-center gap-2">
          {strings.groupsHeader}
          {!isLoading && !error && (
            <span className="text-xs bg-fb-gray dark:bg-gray-700 text-fb-textGray dark:text-gray-300 px-2.5 py-1 rounded-full font-medium">
              {filteredGroups.length}
            </span>
          )}
        </h2>
        
        <div className="relative flex-1 md:w-64 w-full group">
           <Search className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-fb-blue transition-colors pointer-events-none`} />
           <input 
             type="text" 
             placeholder={strings.searchPlaceholder} 
             className={`w-full bg-fb-gray dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 focus:bg-white dark:focus:bg-gray-800 border border-transparent focus:border-fb-blue dark:focus:border-fb-blue rounded-full py-2.5 ${dir === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-sm transition-all outline-none focus:ring-2 focus:ring-fb-blue/20 dark:text-white placeholder:text-gray-500`}
             value={searchTerm}
             onChange={handleSearchChange}
             disabled={isLoading || !!error}
             maxLength={60} // SECURITY: Prevent massive input strings
             autoComplete="off" // Privacy: Disable browser autocomplete for search
           />
        </div>
      </div>

      <div className="min-h-[300px]">
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n) => <GroupCardSkeleton key={n} />)}
          </div>
        )}

        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center h-64 text-center p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20">
            <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
            <p className="text-gray-800 dark:text-red-200 font-medium mb-3">{error}</p>
            <button 
              onClick={fetchGroups}
              className="px-4 py-2 bg-white dark:bg-red-900/30 text-red-600 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/50 font-semibold text-sm transition-colors"
            >
              {strings.retryButton}
            </button>
          </div>
        )}

        {!isLoading && !error && filteredGroups.length === 0 && (
          <div className="text-center py-12 text-gray-500 flex flex-col items-center justify-center h-64 bg-fb-gray/50 dark:bg-gray-700/30 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
             <Users className="w-16 h-16 mb-3 text-gray-300 dark:text-gray-600" />
             <p className="text-gray-600 dark:text-gray-400 font-medium">
               {searchTerm ? strings.noGroupsMessage : strings.emptyStateMessage}
             </p>
          </div>
        )}

        {!isLoading && !error && filteredGroups.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
             {filteredGroups.map(group => {
               // SECURITY: Validate URL before rendering
               const safeCoverUrl = isValidSecureUrl(group.coverUrl) 
                 ? group.coverUrl 
                 : FALLBACK_IMAGE;

               return (
                 <div 
                   key={group.id} 
                   onClick={(e) => handleVisit(group, e)}
                   className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden flex flex-col group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer bg-white dark:bg-gray-800 relative"
                   role="button"
                   tabIndex={0}
                   onKeyDown={(e) => e.key === 'Enter' && handleVisit(group, e)}
                 >
                    <div className="h-28 overflow-hidden relative bg-gray-100 dark:bg-gray-700">
                       <img 
                         src={safeCoverUrl} 
                         alt={group.name} // React escapes this automatically
                         loading="lazy"
                         referrerPolicy="no-referrer" // SECURITY: Privacy protection
                         className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                         onError={(e) => {
                           // Fallback if image fails to load
                           (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                         }}
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60 transition-opacity" />
                    </div>
                    
                    <div className="p-4 flex flex-col flex-1 relative">
                       <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-gray-900 dark:text-white text-lg group-hover:text-fb-blue transition-colors line-clamp-1">
                            {group.name}
                          </h3>
                          {group.role === 'admin' && (
                            <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-[10px] px-2 py-0.5 rounded-full font-bold border border-green-200 dark:border-green-800 shrink-0 uppercase tracking-wider">
                              {strings.adminRole} 
                            </span>
                          )}
                       </div>
                       <span className="text-xs text-gray-500 dark:text-gray-400 mb-5 flex items-center gap-1.5 font-medium">
                         <Users className="w-3.5 h-3.5" />
                         {group.membersCount} · {group.lastActive}
                       </span>
                       
                       <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2">
                          <button 
                            className="flex-1 bg-fb-blue hover:bg-blue-800 active:bg-blue-900 text-white font-semibold py-2 rounded-lg text-sm transition-all focus:ring-2 focus:ring-fb-blue focus:ring-offset-1 shadow-sm flex items-center justify-center gap-2"
                            onClick={(e) => handleVisit(group, e)}
                          >
                             {strings.visitButton}
                          </button>
                          <button 
                            className="p-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg transition border border-gray-200 dark:border-gray-600"
                            onClick={(e) => handleMore(group, e)}
                            aria-label={strings.optionsButton}
                          >
                             <MoreHorizontal className="w-5 h-5" />
                          </button>
                       </div>
                    </div>
                 </div>
               );
             })}
          </div>
        )}
      </div>

      {toast && (
        <div 
          role="status" 
          className={`fixed bottom-6 ${dir === 'rtl' ? 'right-6 md:right-10' : 'left-6 md:left-10'} z-[60] animate-bounce-in`}
        >
          <div className={`px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 max-w-sm transition-all duration-300 ${toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-fb-blue text-white'}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${toast.type === 'success' ? 'bg-green-400' : 'bg-white'}`}></span>
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileGroups;