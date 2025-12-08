import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MoreHorizontal, UserMinus, Ban, Flag, Globe, Users, Lock, Check, X, UserPlus } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { User } from '../types';

// --- Types ---
// Extending the global User type to include specific friend-related properties locally
interface Friend extends Partial<User> {
  id: string;
  name: string;
  avatar: string;
  mutualFriends: number;
  subtitle?: string; // e.g. "Work", "University"
}

type PrivacyLevel = 'public' | 'friends' | 'only_me';
type ActionType = 'unfriend' | 'block' | 'report' | null;

interface ProfileFriendsProps {
  onFriendClick?: (friend: Friend) => void;
}

// --- Constants ---
const NOTIFICATION_TIMEOUT_MS = 4000;

// Mock Data (Ideally passed via props or fetched)
const INITIAL_FRIENDS: Friend[] = [
  { id: '1', name: 'محمد أحمد', avatar: 'https://picsum.photos/200/200?random=101', mutualFriends: 12, subtitle: 'زميل عمل' },
  { id: '2', name: 'سارة علي', avatar: 'https://picsum.photos/200/200?random=102', mutualFriends: 45 },
  { id: '3', name: 'يوسف محمود', avatar: 'https://picsum.photos/200/200?random=103', mutualFriends: 3 },
  { id: '4', name: 'منى زكي', avatar: 'https://picsum.photos/200/200?random=104', mutualFriends: 89, subtitle: 'جامعة القاهرة' },
  { id: '5', name: 'كريم عبد العزيز', avatar: 'https://picsum.photos/200/200?random=105', mutualFriends: 150 },
  { id: '6', name: 'أحمد حلمي', avatar: 'https://picsum.photos/200/200?random=106', mutualFriends: 230 },
  { id: '7', name: 'نور الشريف', avatar: 'https://picsum.photos/200/200?random=107', mutualFriends: 5 },
  { id: '8', name: 'عمر الشريف', avatar: 'https://picsum.photos/200/200?random=108', mutualFriends: 0 },
  { id: '9', name: 'ليلى علوي', avatar: 'https://picsum.photos/200/200?random=109', mutualFriends: 67 },
  { id: '10', name: 'هند صبري', avatar: 'https://picsum.photos/200/200?random=110', mutualFriends: 34 }
];

// --- Sub-components ---

interface NotificationToastProps {
  notification: { message: string; type: 'success' | 'info' } | null;
  onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
  if (!notification) return null;

  return (
    <div className="fixed bottom-6 right-6 md:right-10 z-[60] animate-bounce-in">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white ${notification.type === 'success' ? 'bg-gray-800 dark:bg-gray-700' : 'bg-blue-600 dark:bg-blue-800'}`}>
        {notification.type === 'success' ? <Check className="w-5 h-5 text-green-400" /> : <Flag className="w-5 h-5 text-white" />}
        <span className="font-medium text-sm">{notification.message}</span>
        <button onClick={onClose} className="mr-2 text-gray-300 hover:text-white" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

interface ConfirmationModalProps {
  modalConfig: { isOpen: boolean; type: ActionType; friend: Friend | null };
  onConfirm: () => void;
  onClose: () => void;
  t: (key: string) => string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ modalConfig, onConfirm, onClose, t }) => {
  if (!modalConfig.isOpen || !modalConfig.friend) return null;

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isUnfriend = modalConfig.type === 'unfriend';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm" onClick={onClose}>
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm overflow-hidden animate-scaleIn border border-gray-100 dark:border-gray-700"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
          <h3 id="modal-title" className="font-bold text-lg text-gray-900 dark:text-white">
            {isUnfriend ? t('unfriend') || 'إلغاء الصداقة' : t('block_user') || 'حظر المستخدم'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 text-center">
          {isUnfriend ? (
            <>
              <img src={modalConfig.friend.avatar} alt={modalConfig.friend.name} className="w-16 h-16 rounded-full mx-auto mb-4 border-2 border-white dark:border-gray-700 shadow-sm object-cover" />
              <p className="text-gray-700 dark:text-gray-300 mb-2 font-medium">
                {t('confirm_unfriend') || 'هل أنت متأكد من إلغاء الصداقة مع'} <span className="font-bold text-gray-900 dark:text-white">{modalConfig.friend.name}</span>؟
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Ban className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-2 font-medium">
                {t('confirm_block') || 'هل أنت متأكد من حظر'} <span className="font-bold text-gray-900 dark:text-white">{modalConfig.friend.name}</span>؟
              </p>
            </>
          )}
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition">
            {t('btn_cancel')}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-md text-sm font-semibold text-white transition ${
              isUnfriend ? 'bg-fb-blue hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isUnfriend ? t('btn_confirm') || 'تأكيد' : t('btn_block') || 'حظر'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface PrivacyDropdownProps {
  currentPrivacyLevel: PrivacyLevel;
  onPrivacyChange: (level: PrivacyLevel) => void;
  t: (key: string) => string;
}

const PrivacyDropdown: React.FC<PrivacyDropdownProps> = ({ currentPrivacyLevel, onPrivacyChange, t }) => {
  const [showMenu, setShowMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getPrivacyIcon = (level: PrivacyLevel) => {
    switch (level) {
      case 'public': return <Globe className="w-4 h-4" />;
      case 'friends': return <Users className="w-4 h-4" />;
      case 'only_me': return <Lock className="w-4 h-4" />;
    }
  };

  const getPrivacyLabel = (level: PrivacyLevel) => {
    switch (level) {
      case 'public': return t('audience_public') || 'العامة';
      case 'friends': return t('audience_friends') || 'الأصدقاء';
      case 'only_me': return t('audience_only_me') || 'أنا فقط';
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
        className="flex items-center gap-2 text-fb-blue dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 px-3 py-2 rounded-md font-medium text-sm transition"
        aria-haspopup="true"
        aria-expanded={showMenu}
      >
        {getPrivacyIcon(currentPrivacyLevel)}
        <span className="hidden md:inline">{t('edit_privacy') || 'تعديل الخصوصية'}</span>
        <span className="md:hidden">{t('privacy') || 'الخصوصية'}</span>
      </button>

      {showMenu && (
        <div
          className="absolute rtl:left-0 ltr:right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-fadeIn"
          role="menu"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white">{t('who_can_see_friends') || 'من يمكنه رؤية قائمة أصدقائك؟'}</h4>
          </div>
          <div className="p-1">
            {(['public', 'friends', 'only_me'] as PrivacyLevel[]).map(level => (
              <button
                key={level}
                onClick={() => { onPrivacyChange(level); setShowMenu(false); }}
                className="w-full flex items-center justify-between p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition text-start group"
                role="menuitem"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full group-hover:bg-white dark:group-hover:bg-gray-600 transition">
                    {getPrivacyIcon(level)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-200">{getPrivacyLabel(level)}</span>
                  </div>
                </div>
                {currentPrivacyLevel === level && <Check className="w-5 h-5 text-fb-blue" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface FriendCardProps {
  friend: Friend;
  onFriendClick?: (friend: Friend) => void;
  activeMenuId: string | null;
  onToggleMenu: (friendId: string) => void;
  onMenuAction: (action: 'unfriend' | 'block' | 'report', friend: Friend) => void;
  t: (key: string) => string;
}

const FriendCard: React.FC<FriendCardProps> = ({ friend, onFriendClick, activeMenuId, onToggleMenu, onMenuAction, t }) => {
  const isMenuOpen = activeMenuId === friend.id;
  const menuRef = useRef<HTMLDivElement>(null);

  const handleCardClick = useCallback(() => {
    if (onFriendClick) onFriendClick(friend);
  }, [friend, onFriendClick]);

  const handleMenuToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleMenu(friend.id);
  }, [friend.id, onToggleMenu]);

  return (
    <div
      onClick={handleCardClick}
      className={`border rounded-lg p-3 flex items-center gap-3 relative group transition cursor-pointer ${
        isMenuOpen 
          ? 'z-20 border-gray-300 dark:border-gray-500 shadow-md bg-gray-50 dark:bg-gray-700' 
          : 'z-0 border-gray-200 dark:border-gray-700 hover:shadow-sm bg-white dark:bg-gray-800'
      }`}
    >
      <img src={friend.avatar} alt={friend.name} className="w-20 h-20 rounded-md object-cover border border-gray-100 dark:border-gray-600 bg-gray-200" />
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 leading-tight mb-1 hover:underline truncate">{friend.name}</h3>
        {friend.subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 truncate">{friend.subtitle}</p>}
        <p className="text-xs text-gray-500 dark:text-gray-400">{friend.mutualFriends} {t('mutual_friends') || 'صديق مشترك'}</p>
      </div>

      {/* Menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={handleMenuToggle}
          className={`p-2 rounded-full transition ${isMenuOpen ? 'bg-blue-100 dark:bg-blue-900/30 text-fb-blue dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          aria-label={`Options for ${friend.name}`}
          aria-haspopup="true"
          aria-expanded={isMenuOpen}
        >
          <MoreHorizontal className="w-6 h-6" />
        </button>

        {isMenuOpen && (
          <div
            className="absolute rtl:left-0 ltr:right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-fadeIn z-50"
            role="menu"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => onMenuAction('unfriend', friend)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition text-sm font-medium border-b border-gray-50 dark:border-gray-700"
              role="menuitem"
            >
              <UserMinus className="w-5 h-5 text-red-500" />
              {t('unfriend') || 'إلغاء الصداقة'}
            </button>
            <button
              onClick={() => onMenuAction('block', friend)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition text-sm font-medium border-b border-gray-50 dark:border-gray-700"
              role="menuitem"
            >
              <Ban className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              {t('block') || 'حظر'}
            </button>
            <button
              onClick={() => onMenuAction('report', friend)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition text-sm font-medium"
              role="menuitem"
            >
              <Flag className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              {t('report') || 'إبلاغ'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


// Main Component
const ProfileFriends: React.FC<ProfileFriendsProps> = ({ onFriendClick }) => {
  const { t, dir } = useLanguage();
  const [friends, setFriends] = useState<Friend[]>(INITIAL_FRIENDS);
  const [searchTerm, setSearchTerm] = useState('');
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>('public');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; type: ActionType; friend: Friend | null }>(
    { isOpen: false, type: null, friend: null }
  );

  // Filter friends
  const filteredFriends = friends.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Notification handling
  const showNotification = useCallback((message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    const timer = setTimeout(() => setNotification(null), NOTIFICATION_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  const clearNotification = useCallback(() => setNotification(null), []);

  // Friend Card Menu Actions
  const handleMenuAction = useCallback((action: 'unfriend' | 'block' | 'report', friend: Friend) => {
    setActiveMenuId(null); 
    if (action === 'report') {
      showNotification(`${t('report_received') || 'تم استلام البلاغ عن'} ${friend.name}.`, 'info');
    } else {
      setModalConfig({ isOpen: true, type: action, friend });
    }
  }, [showNotification, t]);

  // Modal Actions
  const confirmModalAction = useCallback(() => {
    const { type, friend } = modalConfig;
    if (!friend || !type) return;

    setFriends(prev => prev.filter(f => f.id !== friend.id));
    
    const actionMessage = type === 'unfriend' 
        ? `${t('unfriend_success') || 'تم إلغاء الصداقة مع'} ${friend.name}.` 
        : `${t('block_success') || 'تم حظر'} ${friend.name}.`;

    showNotification(actionMessage, type === 'unfriend' ? 'success' : 'info');
    closeModal();
  }, [modalConfig, showNotification, t]);

  const closeModal = useCallback(() => setModalConfig({ isOpen: false, type: null, friend: null }), []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const clickedOnFriendMenu = (event.target as Element).closest('.relative > button[aria-haspopup="true"], .relative > div[role="menu"]');
      if (!clickedOnFriendMenu) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm min-h-[500px] animate-fadeIn p-4 md:p-6 relative" dir={dir}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{t('profile_friends')}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{friends.length} {t('friends')}</p>
        </div>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:w-60">
            <Search className={`absolute ${dir === 'rtl' ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500`} />
            <input
              type="text"
              placeholder={t('search_placeholder')}
              className={`w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 focus:bg-white dark:focus:bg-gray-800 border-transparent focus:border-fb-blue border rounded-full py-2 ${dir === 'rtl' ? 'pl-10 pr-4' : 'pr-10 pl-4'} text-sm transition outline-none text-gray-900 dark:text-white`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              aria-label="Search friends"
            />
          </div>

          {/* Privacy Dropdown */}
          <PrivacyDropdown
            currentPrivacyLevel={privacyLevel}
            onPrivacyChange={setPrivacyLevel}
            t={t}
          />
        </div>
      </div>

      {/* Friends Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">
        {filteredFriends.length > 0 ? (
          filteredFriends.map(friend => (
            <FriendCard
              key={friend.id}
              friend={friend}
              onFriendClick={onFriendClick}
              activeMenuId={activeMenuId}
              onToggleMenu={setActiveMenuId}
              onMenuAction={handleMenuAction}
              t={t}
            />
          ))
        ) : (
          <div className="col-span-1 md:col-span-2 py-10 text-center text-gray-500 dark:text-gray-400">
            <Search className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p>{t('no_friends_found') || 'لا يوجد أصدقاء بهذا الاسم.'}</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <ConfirmationModal
        modalConfig={modalConfig}
        onConfirm={confirmModalAction}
        onClose={closeModal}
        t={t}
      />

      {/* Notification */}
      <NotificationToast notification={notification} onClose={clearNotification} />
    </div>
  );
};

export default ProfileFriends;