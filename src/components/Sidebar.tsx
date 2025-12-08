import React, { useMemo, useState } from 'react';
import {
  Users, Bookmark, Calendar, Clock, ChevronDown,
  MonitorPlay, Store, LayoutGrid, ChevronUp, LucideIcon
} from 'lucide-react';
import { User, View } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface SidebarProps {
  currentUser: User;
  onProfileClick: () => void;
  onNavigate: (view: View) => void;
  currentView: View;
}

interface SidebarRowProps {
  icon?: React.ReactNode;
  src?: string;
  label: string;
  onClick: () => void;
  isRoundImage?: boolean;
  isActive?: boolean;
  ariaControls?: string;
  ariaExpanded?: boolean;
}

const SidebarRow: React.FC<SidebarRowProps> = ({
  icon,
  src,
  label,
  onClick,
  isRoundImage = false,
  isActive = false,
  ariaControls,
  ariaExpanded,
}) => (
  <li className="w-full">
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors text-left focus:outline-none focus:ring-2 focus:ring-fb-blue/50 dark:focus:ring-fb-accent/50 ${isActive ? 'bg-fb-blue/10 text-fb-blue dark:bg-fb-accent/20 dark:text-fb-accent font-bold' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      aria-controls={ariaControls}
      aria-expanded={ariaExpanded}
    >
      {src ? (
        <img
          src={src}
          alt={label}
          className={`h-9 w-9 object-cover ${isRoundImage ? 'rounded-full border border-gray-200 dark:border-gray-600' : 'rounded-lg'}`}
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = 'https://via.placeholder.com/40'; // Fallback
          }}
        />
      ) : (
        <div className={`flex items-center justify-center w-9 h-9 ${isActive ? 'text-fb-blue dark:text-fb-accent' : 'text-fb-blue dark:text-fb-accent'}`}>
          {icon}
        </div>
      )}
      <span className={`text-[15px] truncate flex-1 ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
    </button>
  </li>
);

interface MenuItem {
  id: string;
  Icon: LucideIcon;
  label: string;
  view: View;
}

interface ShortcutItem {
  id: string;
  img: string;
  label: string;
  view: View;
}

const Sidebar: React.FC<SidebarProps> = ({ currentUser, onProfileClick, onNavigate, currentView }) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  // Navigation Items with correct View mappings
  const allMenuItems: MenuItem[] = useMemo(() => [
    { id: 'friends', Icon: Users, label: t('nav_friends'), view: 'friends' },
    { id: 'marketplace', Icon: Store, label: t('nav_market'), view: 'marketplace' },
    { id: 'watch', Icon: MonitorPlay, label: t('nav_watch'), view: 'watch' },
    { id: 'memories', Icon: Clock, label: t('menu_memories'), view: 'memories' as View }, // Type assertion if 'memories' view is not fully typed yet
    { id: 'saved', Icon: Bookmark, label: t('menu_saved'), view: 'saved' },
    { id: 'groups', Icon: LayoutGrid, label: t('menu_groups'), view: 'groups' },
    { id: 'events', Icon: Calendar, label: t('menu_events'), view: 'events' },
  ], [t]);

  const visibleMenuItems = useMemo(() => {
    return isExpanded ? allMenuItems : allMenuItems.slice(0, 5);
  }, [isExpanded, allMenuItems]);

  // Shortcut items
  const shortcutItems: ShortcutItem[] = useMemo(() => [
    {
      id: 'devgroup1',
      img: 'https://picsum.photos/40/40?random=21',
      label: 'مجموعة المطورين 1',
      view: 'groups'
    },
    {
      id: 'devgroup2',
      img: 'https://picsum.photos/40/40?random=22',
      label: 'عشاق السفر',
      view: 'groups'
    },
    {
      id: 'devgroup3',
      img: 'https://picsum.photos/40/40?random=23',
      label: 'سوق السيارات',
      view: 'groups'
    },
  ], []);

  // Robust Fallback for User
  const userToDisplay = currentUser && currentUser.name ? currentUser : { 
    id: 'guest', 
    name: 'زائر', 
    avatar: 'https://via.placeholder.com/40' 
  };

  return (
    <aside
      className="hidden lg:block w-[300px] h-[calc(100vh-56px)] overflow-y-auto sticky top-14 p-4 no-scrollbar hover:overflow-y-auto bg-[#F0F2F5] dark:bg-gray-900 transition-colors duration-300"
      aria-label="Sidebar Navigation"
    >
      <ul className="space-y-1">
        {/* Profile Row */}
        <SidebarRow
          src={userToDisplay.avatar}
          label={userToDisplay.name}
          onClick={onProfileClick}
          isRoundImage={true}
          isActive={currentView === 'profile'}
        />

        {/* Navigation Items */}
        <ul id="sidebar-menu-items" className="space-y-1">
          {visibleMenuItems.map(({ id, Icon, label, view }) => (
            <SidebarRow
              key={id}
              icon={<Icon className={`h-6 w-6 ${currentView === view ? 'fill-current' : ''}`} />}
              label={label}
              onClick={() => onNavigate(view)}
              isActive={currentView === view}
            />
          ))}
        </ul>

        {/* See More / See Less Toggle */}
        <SidebarRow
          icon={
            <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center transition-colors group-hover:bg-gray-300 dark:group-hover:bg-gray-600">
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-gray-800 dark:text-gray-200" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-800 dark:text-gray-200" />
              )}
            </div>
          }
          label={isExpanded ? t('menu_less') : t('menu_more')}
          onClick={() => setIsExpanded(!isExpanded)}
          ariaControls="sidebar-menu-items"
          ariaExpanded={isExpanded}
        />
      </ul>

      <div className="border-t border-gray-300 dark:border-gray-700 my-4 mx-2" role="separator" aria-hidden="true"></div>

      {/* Shortcuts Section */}
      <div className="px-2">
        <h3 className="text-gray-500 dark:text-gray-400 font-semibold text-[17px] mb-2">
          {t('shortcuts')}
        </h3>
        <ul className="space-y-1">
          {shortcutItems.map((item) => (
            <SidebarRow
              key={item.id}
              src={item.img}
              label={item.label}
              onClick={() => onNavigate(item.view)}
              isActive={false}
            />
          ))}
        </ul>
      </div>

      {/* Footer / Legal Links */}
      <footer className="mt-auto p-4 px-6 text-xs text-gray-500 dark:text-gray-400 leading-normal">
        <p className="mb-1">
          <a href="#" className="hover:underline">Privacy</a> ·{' '}
          <a href="#" className="hover:underline">Terms</a> ·{' '}
          <a href="#" className="hover:underline">Advertising</a> ·{' '}
          <a href="#" className="hover:underline">Ad Choices</a> ·{' '}
          <a href="#" className="hover:underline">Cookies</a> ·{' '}
          <span className="cursor-pointer hover:underline">More</span>
        </p>
        <p>{t('privacy_footer')}</p>
      </footer>
    </aside>
  );
};

export default Sidebar;