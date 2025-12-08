import React, { useState, useCallback, useMemo } from 'react';
import { Video, Search, MoreHorizontal, AlertCircle, User as UserIcon } from 'lucide-react';
import { User } from '../types';

// --- 1. Types Definition ---
// Security: Using the project's global User type ensures consistency across App, Chat, and Sidebar.
// No local re-definition of User interface to avoid ID mismatch (string vs number).

interface RightbarProps {
  onlineUsers: User[];
  onChatClick: (user: User) => void;
  isLoading?: boolean;
}

interface AdItemProps {
  id: number;
  imageUrl: string;
  title: string;
  website: string;
}

interface IconButtonProps {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  className?: string;
}

// --- Constants ---
const ADS_DATA = [
  { id: 1, imageUrl: "https://picsum.photos/120/120?random=99", title: "منتج رائع", website: "example.com" },
  { id: 2, imageUrl: "https://picsum.photos/120/120?random=98", title: "خدمة مميزة", website: "service.com" },
];

// Privacy: Using a fallback service. We ensure the name is encoded to prevent URL injection.
const FALLBACK_AVATAR_BASE = "https://ui-avatars.com/api/?background=random&color=fff&name=";

// --- Sub-components ---

const UserSkeleton = () => (
  <div className="flex items-center gap-3 p-2 animate-pulse" aria-hidden="true">
    <div className="h-9 w-9 rounded-full bg-gray-300 dark:bg-gray-700"></div>
    <div className="h-4 w-32 bg-gray-300 dark:bg-gray-700 rounded"></div>
  </div>
);

const AdItem: React.FC<AdItemProps> = React.memo(({ imageUrl, title, website }) => {
  // Security: Robust URL sanitization preventing javascript: URI vectors
  const safeHref = useMemo(() => {
    try {
      const urlStr = website.startsWith('http') ? website : `https://${website}`;
      const parsed = new URL(urlStr);
      // Whitelist allowed protocols
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '#';
    } catch (e) {
      return '#';
    }
  }, [website]);

  return (
    <a
      href={safeHref}
      className="flex items-center gap-4 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition group focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label={`إعلان: ${title} من ${website}`}
      target="_blank"
      rel="noopener noreferrer" // Security: Prevents Reverse Tabnabbing attacks
    >
      <img 
        src={imageUrl} 
        alt="" 
        loading="lazy"
        className="h-24 w-24 rounded-lg object-cover bg-gray-200 dark:bg-gray-600" 
      />
      <div className="flex flex-col">
        <span className="font-semibold text-[15px] text-gray-900 dark:text-gray-200">{title}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{website}</span>
      </div>
    </a>
  );
});

const IconButton: React.FC<IconButtonProps> = React.memo(({ icon: Icon, label, onClick, className = '' }) => (
  <button
    onClick={onClick}
    aria-label={label}
    title={label}
    type="button"
    className={`text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 rounded-full p-1 -m-1 transition-colors ${className}`}
  >
    <Icon className="h-4 w-4" />
  </button>
));

// Security & UX: Robust Image Handling with 3-tier fallback (Src -> UI Avatars -> Icon)
const UserAvatar: React.FC<{ user: User }> = ({ user }) => {
  const [imgSrc, setImgSrc] = useState(user.avatar);
  const [hasError, setHasError] = useState(false);
  const [showFallbackIcon, setShowFallbackIcon] = useState(false);

  const handleError = useCallback(() => {
    if (!hasError) {
      // Tier 2: Try UI Avatars
      setHasError(true);
      // Security: Encode user input before placing in URL to prevent injection
      const encodedName = encodeURIComponent(user.name);
      setImgSrc(`${FALLBACK_AVATAR_BASE}${encodedName}`);
    } else {
      // Tier 3: If UI Avatars fails, show Icon
      setShowFallbackIcon(true);
    }
  }, [hasError, user.name]);

  if (showFallbackIcon) {
    return (
      <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-600">
        <UserIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        {user.online && (
          <span
            className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"
            aria-label="متصل"
            role="status"
          ></span>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex-shrink-0">
      <img 
        src={imgSrc} 
        alt={user.name}
        loading="lazy"
        onError={handleError}
        className="h-9 w-9 rounded-full border border-gray-200 dark:border-gray-700 object-cover bg-gray-200 dark:bg-gray-600" 
      />
      {user.online && (
        <span
          className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"
          aria-label="متصل"
          role="status"
        ></span>
      )}
    </div>
  );
};

// --- Main Component ---

const Rightbar: React.FC<RightbarProps> = ({ onlineUsers, onChatClick, isLoading = false }) => {
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent, user: User) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChatClick(user);
    }
  }, [onChatClick]);

  return (
    <aside className="hidden xl:block w-[300px] h-[calc(100vh-56px)] sticky top-14 p-4 overflow-y-auto no-scrollbar bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      {/* Sponsored Section */}
      <div className="mb-4">
        <h3 className="text-gray-500 dark:text-gray-400 font-semibold text-[17px] mb-2 px-2">ممول</h3>
        <div className="space-y-2">
          {ADS_DATA.map((ad) => (
            <AdItem key={ad.id} {...ad} />
          ))}
        </div>
      </div>

      <div className="border-t border-gray-300 dark:border-gray-700 my-4 mx-2" role="separator"></div>

      {/* Contacts Header */}
      <div className="flex items-center justify-between px-2 mb-2">
        <h3 className="text-gray-500 dark:text-gray-400 font-semibold text-[17px]">جهات الاتصال</h3>
        <div className="flex gap-2">
          <IconButton icon={Video} label="مكالمة فيديو" />
          <IconButton icon={Search} label="بحث في جهات الاتصال" />
          <IconButton icon={MoreHorizontal} label="المزيد من الخيارات" />
        </div>
      </div>

      {/* Users List */}
      <ul className="space-y-1" aria-label="قائمة المستخدمين المتصلين">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, idx) => <UserSkeleton key={idx} />)
        ) : onlineUsers.length === 0 ? (
          <li className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 text-sm p-4 text-center gap-2">
            <AlertCircle className="h-6 w-6 opacity-50" />
            <span>لا يوجد مستخدمون متصلون حاليًا.</span>
          </li>
        ) : (
          onlineUsers.map((user) => (
            <li
              key={user.id}
              onClick={() => onChatClick(user)}
              className="flex items-center gap-3 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition group focus:outline-none focus:ring-2 focus:ring-blue-500"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => handleKeyDown(e, user)}
              aria-label={`بدء محادثة مع ${user.name}`}
            >
              <UserAvatar user={user} />
              <span className="font-medium text-[15px] text-gray-900 dark:text-gray-200 group-hover:text-black dark:group-hover:text-white truncate">
                {user.name}
              </span>
            </li>
          ))
        )}
      </ul>
    </aside>
  );
};

export default Rightbar;