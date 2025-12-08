import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Calendar,
  MapPin,
  Star,
  MoreHorizontal,
  Share2,
  Search,
  ArrowUpDown,
  ImageOff,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// --- Security Utilities ---

/**
 * Validates and sanitizes URLs to prevent XSS via javascript: protocol
 * and ensures only HTTP/HTTPS are allowed.
 */
const sanitizeUrl = (url: string): string => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (['http:', 'https:'].includes(parsed.protocol)) {
      return url;
    }
    console.warn(`[Security] Blocked unsafe URL protocol: ${parsed.protocol}`);
    return '';
  } catch (e) {
    return '';
  }
};

// --- Custom Hooks ---

/**
 * Debounce hook to prevent DoS on heavy filtering operations
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// --- Types & Interfaces ---
type EventStatus = 'going' | 'interested' | 'none';
type SortOption = 'date' | 'popularity';

interface EventDate {
  day: string;
  month: string;
  fullDate: Date;
}

interface Event {
  id: string;
  title: string;
  date: EventDate;
  location: string;
  interestedCount: number;
  coverUrl: string;
  status: EventStatus;
  description?: string;
}

// --- Constants ---
const FALLBACK_IMAGE = 'https://placehold.co/600x400?text=No+Image'; // Safe fallback

const formatCount = (num: number): string => {
  return new Intl.NumberFormat('en-US', {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(num);
};

// Mock Data (Ideally this comes from a secure API)
const INITIAL_EVENTS: Event[] = [
  {
    id: '1',
    title: 'مؤتمر المطورين السنوي',
    date: { day: '15', month: 'NOV', fullDate: new Date('2023-11-15') },
    location: 'مركز المؤتمرات، القاهرة',
    interestedCount: 2500,
    coverUrl: 'https://picsum.photos/300/150?random=401',
    status: 'going',
    description: 'مؤتمر سنوي يجمع المطورين لمناقشة أحدث التقنيات والذكاء الاصطناعي.',
  },
  {
    id: '2',
    title: 'حفل موسيقي خيري',
    date: { day: '20', month: 'DEC', fullDate: new Date('2023-12-20') },
    location: 'دار الأوبرا',
    interestedCount: 500,
    coverUrl: 'https://picsum.photos/300/150?random=402',
    status: 'interested',
    description: 'حفل موسيقي لدعم الجمعيات الخيرية المختلفة بمشاركة فنانين عالميين.',
  },
  {
    id: '3',
    title: 'معرض الكتاب الدولي',
    date: { day: '05', month: 'JAN', fullDate: new Date('2024-01-05') },
    location: 'مركز المعارض',
    interestedCount: 12000,
    coverUrl: 'https://picsum.photos/300/150?random=403',
    status: 'none',
    description: 'أكبر تجمع لدور النشر والكتاب في المنطقة مع ندوات ثقافية متنوعة.',
  }
];

const STATUS_LABELS: Record<EventStatus, string> = {
  going: 'ذاهب',
  interested: 'مهتم',
  none: 'غير مهتم',
};

type EventFilterStatus = 'all' | EventStatus;

// --- Sub-Components ---

const EventSkeleton = () => (
  <div className="flex flex-col md:flex-row border border-gray-100 rounded-xl overflow-hidden bg-white animate-pulse shadow-sm">
    <div className="w-full md:w-48 h-40 bg-gray-200" />
    <div className="p-4 flex-1 space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
      <div className="flex gap-2 mt-4">
        <div className="h-8 bg-gray-200 rounded w-24" />
        <div className="h-8 bg-gray-200 rounded w-8" />
      </div>
    </div>
  </div>
);

interface FilterButtonProps {
  label: string;
  value: EventFilterStatus;
  currentFilter: EventFilterStatus;
  onClick: (val: EventFilterStatus) => void;
}

const FilterButton: React.FC<FilterButtonProps> = ({ label, value, currentFilter, onClick }) => {
  const isActive = currentFilter === value;
  return (
    <button
      className={`text-sm font-semibold px-4 py-2 rounded-full transition-all duration-200 border ${ 
        isActive
          ? 'text-fb-white bg-fb-blue border-fb-blue shadow-md'
          : 'text-fb-textGray bg-fb-gray border-transparent hover:bg-gray-200'
      }`}
      onClick={() => onClick(value)}
      aria-pressed={isActive}
    >
      {label}
    </button>
  );
};

interface EventCardProps {
  event: Event;
  onToggleStatus: (id: string) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onToggleStatus }) => {
  const [imgSrc, setImgSrc] = useState<string>(sanitizeUrl(event.coverUrl) || FALLBACK_IMAGE);
  const [imgError, setImgError] = useState(false);

  const handleImageError = () => {
    if (!imgError) {
      setImgError(true);
      setImgSrc(FALLBACK_IMAGE);
    }
  };

  const getStatusButtonStyle = () => {
    if (event.status === 'going') return 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200';
    if (event.status === 'interested') return 'bg-blue-50 text-fb-blue hover:bg-blue-100 border-blue-200';
    return 'bg-fb-gray text-fb-textGray hover:bg-gray-200 border-gray-200';
  };

  const StatusIcon = event.status === 'going' ? CheckCircle : (event.status === 'interested' ? Star : Star);

  return (
    <div className="group flex flex-col md:flex-row border border-gray-100 rounded-xl overflow-hidden hover:shadow-card hover:border-fb-blue/20 transition-all duration-300 bg-white">
      {/* Image Section with Security Handling */}
      <div className="w-full md:w-48 h-48 md:h-auto relative flex-shrink-0 overflow-hidden bg-fb-gray flex items-center justify-center">
        {imgError ? (
          <ImageOff className="text-fb-textGray w-10 h-10 opacity-50" />
        ) : (
          <img 
            src={imgSrc} 
            alt={event.title} // React escapes this automatically
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            onError={handleImageError}
          />
        )}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1.5 text-center shadow-md border border-gray-100 min-w-[60px]">
          <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider leading-none mb-0.5">{event.date.month}</div>
          <div className="text-2xl font-bold text-gray-800 leading-none">{event.date.day}</div>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg text-fb-text line-clamp-1 group-hover:text-fb-blue transition-colors cursor-pointer">
            {event.title}
          </h3>
        </div>
        
        <div className="text-xs text-fb-textGray flex items-center gap-1.5 mb-3">
          <MapPin className="w-4 h-4 flex-shrink-0 text-fb-textGray" /> 
          <span className="truncate font-medium">{event.location}</span>
        </div>
        
        <p className="text-xs text-fb-textGray mb-4 font-medium flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-fb-accent inline-block"></span>
          {formatCount(event.interestedCount)} مهتم
        </p>
        
        {event.description && (
          <p className="text-sm text-gray-600 mb-5 line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        )}

        <div className="flex items-center gap-3 mt-auto pt-4 border-t border-gray-100">
          <button
            onClick={() => onToggleStatus(event.id)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 border ${getStatusButtonStyle()}`}
            aria-label={`Change status from ${event.status}`}
          >
            <StatusIcon className={`w-4 h-4 ${event.status !== 'none' ? 'fill-current' : ''}`} />
            {STATUS_LABELS[event.status]}
          </button>
          
          <button 
            className="p-2 rounded-lg hover:bg-fb-gray text-fb-textGray transition border border-transparent hover:border-gray-200"
            aria-label="مشاركة"
          >
            <Share2 className="w-5 h-5" />
          </button>
          
          <button 
            className="p-2 rounded-lg hover:bg-fb-gray text-fb-textGray transition border border-transparent hover:border-gray-200"
            aria-label="المزيد من الخيارات"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---
const ProfileEvents: React.FC = () => {
  const { t, dir } = useLanguage();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<EventFilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date');

  // Security: Debounce search term to prevent UI blocking (DoS)
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    // Simulate API fetch
    const timer = setTimeout(() => {
      setEvents(INITIAL_EVENTS);
      setIsLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleToggleStatus = useCallback((id: string) => {
    setEvents(prevEvents => prevEvents.map(event => {
      if (event.id === id) {
        const nextStatus: Record<EventStatus, EventStatus> = {
          'none': 'interested',
          'interested': 'going',
          'going': 'none'
        };
        return { ...event, status: nextStatus[event.status] };
      }
      return event;
    }));
  }, []);

  const processedEvents = useMemo(() => {
    let result = [...events];

    // Filter by Debounced Search (Performance/Security)
    if (debouncedSearchTerm) {
      const lowerTerm = debouncedSearchTerm.toLowerCase().trim();
      result = result.filter(e => 
        e.title.toLowerCase().includes(lowerTerm) || 
        e.location.toLowerCase().includes(lowerTerm)
      );
    }

    if (filterStatus !== 'all') {
      result = result.filter(e => e.status === filterStatus);
    }

    result.sort((a, b) => {
      if (sortBy === 'date') {
        return a.date.fullDate.getTime() - b.date.fullDate.getTime();
      } else {
        return b.interestedCount - a.interestedCount; // High interest first
      }
    });

    return result;
  }, [events, debouncedSearchTerm, filterStatus, sortBy]);

  return (
    <div className="bg-fb-white rounded-xl shadow-sm border border-gray-100 min-h-[500px] p-4 md:p-6 font-sans animate-fadeIn" dir={dir}>
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-fb-text flex items-center gap-2">
            <Calendar className="w-6 h-6 text-fb-blue" />
            {t('profile_events') || 'المناسبات'}
          </h2>
          <div className="text-sm text-fb-textGray font-medium hidden md:block bg-fb-gray px-3 py-1 rounded-full">
            {processedEvents.length} مناسبة
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-gray-50/80 p-3 rounded-2xl border border-gray-100">
          <div className="flex gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 no-scrollbar">
            <FilterButton label="الكل" value="all" currentFilter={filterStatus} onClick={setFilterStatus} />
            <FilterButton label="سأذهب" value="going" currentFilter={filterStatus} onClick={setFilterStatus} />
            <FilterButton label="مهتم" value="interested" currentFilter={filterStatus} onClick={setFilterStatus} />
          </div>

          <div className="flex gap-3 w-full lg:w-auto items-center">
            <button 
              onClick={() => setSortBy(prev => prev === 'date' ? 'popularity' : 'date')}
              className="flex items-center gap-2 text-sm font-semibold text-fb-textGray bg-white px-4 py-2.5 rounded-full border border-gray-200 hover:border-fb-blue/50 hover:text-fb-blue transition shadow-sm whitespace-nowrap"
            >
              <ArrowUpDown className="w-4 h-4" />
              {sortBy === 'date' ? 'التاريخ' : 'الأكثر شعبية'}
            </button>

            <div className="relative flex-grow lg:flex-grow-0 w-full">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="بحث في المناسبات..."
                className="w-full lg:w-56 pr-10 pl-4 py-2.5 text-sm rounded-full border border-gray-200 focus:ring-2 focus:ring-fb-blue/20 focus:border-fb-blue outline-none transition-all bg-white placeholder-gray-400"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                maxLength={100} // Security: Limit input length
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <>
            <EventSkeleton />
            <EventSkeleton />
          </>
        ) : processedEvents.length > 0 ? (
          processedEvents.map(event => (
            <EventCard 
              key={event.id} 
              event={event} 
              onToggleStatus={handleToggleStatus}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <div className="bg-white p-4 rounded-full mb-4 shadow-sm">
              <Calendar className="w-10 h-10 text-fb-textGray" />
            </div>
            <h3 className="text-lg font-bold text-fb-text mb-1">{t('empty_events') || 'لا توجد مناسبات'}</h3>
            <p className="text-fb-textGray max-w-xs mx-auto mb-5 text-sm">
              لم نتمكن من العثور على أي مناسبات تطابق بحثك الحالي. جرب تغيير كلمات البحث.
            </p>
            <button 
              onClick={() => {setFilterStatus('all'); setSearchTerm('');}}
              className="text-sm font-bold text-fb-blue bg-blue-50 px-6 py-2 rounded-full hover:bg-blue-100 transition"
            >
              مسح جميع الفلاتر
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileEvents;