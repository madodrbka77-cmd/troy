import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Home, Bell, MessageCircle, Users, Moon, Sun, Search,
  Video, Store, Gamepad2, Bookmark, Settings, X,
  Menu, Plus, ChevronDown, LogOut
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { View } from "../types";

// --- 1. Types & Interfaces ---
interface NavbarProps {
  currentView: View;
  setView: (view: View) => void;
}

interface NavItemProps {
  view: View;
  icon: React.ElementType;
  label: string;
  hiddenOnMobile?: boolean;
  isActive: boolean;
  onClick: (view: View) => void;
}

interface UserData {
  name: string;
  avatar: string;
}

interface NotificationItem {
  id: number;
  text: React.ReactNode;
  isRead: boolean;
  time: string;
}

interface MessageItem {
  id: number;
  sender: string;
  preview: string;
  avatar: string;
  unread: boolean;
}

// --- 2. Constants & Mock Data ---
const CURRENT_USER: UserData = {
  name: "Al-Muhandis",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
};

const NOTIFICATIONS: NotificationItem[] = [
  { id: 1, text: <span><strong>Ahmed</strong> reacted to your post.</span>, isRead: false, time: "2m ago" },
  { id: 2, text: <span>New friend request from <strong>Karim</strong>.</span>, isRead: false, time: "1h ago" },
  { id: 3, text: <span><strong>Sarah</strong> commented on your photo.</span>, isRead: true, time: "5h ago" },
];

const MESSAGES: MessageItem[] = [
  { id: 1, sender: "Ahmed", preview: "Are we meeting tomorrow?", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmed", unread: true },
  { id: 2, sender: "Team Lead", preview: "Great job on the PR!", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Team", unread: false },
];

const RECENT_SEARCHES = ["React Tutorials", "Tailwind CSS Tips", "Next.js 14 Features", "Frontend Jobs"];

// --- 3. Helper Hooks ---
function useClickOutside(ref: React.RefObject<HTMLElement>, handler: () => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

// --- 4. Sub-Components ---

const NavItem: React.FC<NavItemProps> = ({ view, icon: Icon, label, hiddenOnMobile = false, isActive, onClick }) => (
  <button
    onClick={() => onClick(view)}
    aria-label={label}
    title={label}
    className={`relative p-3 rounded-lg transition-all duration-200 flex items-center justify-center
      ${isActive 
        ? "text-fb-blue bg-blue-50 dark:bg-blue-900/20" 
        : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400"}
      ${hiddenOnMobile ? "hidden md:flex" : "flex"}
      focus:outline-none focus:ring-2 focus:ring-fb-blue/50`}
  >
    <Icon className={`w-6 h-6 ${isActive ? "fill-current" : ""}`} />
    {isActive && (
      <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-fb-blue rounded-full" />
    )}
  </button>
);

const Badge = ({ count }: { count: number }) => {
  if (count === 0) return null;
  return (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border-2 border-white dark:border-gray-900 animate-in zoom-in duration-200">
      {count > 9 ? "9+" : count}
    </span>
  );
};

const DropdownMenu = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div
    className={`absolute mt-2 rounded-xl shadow-xl top-full z-50 overflow-hidden border border-gray-100 dark:border-gray-700 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100 origin-top-right ${className}`}
  >
    {children}
  </div>
);

// --- 5. Main Navbar Component ---
const Navbar: React.FC<NavbarProps> = ({ currentView, setView }) => {
  const { t, dir } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const navRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useClickOutside(navRef, () => setActiveMenu(null));

  const toggleMenu = (menuName: string) => setActiveMenu(prev => (prev === menuName ? null : menuName));

  const filteredSearch = useMemo(() => {
    if (!searchQuery) return RECENT_SEARCHES;
    return RECENT_SEARCHES.filter(item => item.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery]);

  const isDark = theme === 'dark';
  const bgClass = isDark ? "bg-gray-900/95 text-white border-b border-gray-800" : "bg-white/95 text-black border-b border-gray-200";
  const dropdownBg = isDark ? "bg-gray-800 text-white" : "bg-white text-black";
  const hoverBg = isDark ? "hover:bg-gray-700" : "hover:bg-gray-50";

  // Navigation config mapped to translation keys and views
  const navItems = [
    { view: 'home' as View, icon: Home, label: t('nav_home') },
    { view: 'watch' as View, icon: Video, label: t('nav_watch') },
    { view: 'marketplace' as View, icon: Store, label: t('nav_market') },
    { view: 'groups' as View, icon: Users, label: t('menu_groups') },
    { view: 'gaming' as View, icon: Gamepad2, label: t('nav_gaming') },
  ];

  return (
    <header 
      ref={navRef} 
      className={`fixed top-0 w-full z-[100] backdrop-blur-md transition-colors duration-300 ${bgClass}`}
      dir={dir}
    >
      <div className="max-w-[1920px] mx-auto flex items-center justify-between px-4 h-14">

        {/* LEFT: Logo & Mobile Toggle */}
        <div className="flex items-center gap-3 min-w-fit">
          <button
            className="text-2xl md:hidden p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            onClick={() => toggleMenu('mobile')}
            aria-label="Open Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div 
            onClick={() => setView('home')} 
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <div className="w-9 h-9 bg-fb-blue rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md">
              T
            </div>
            <span className="text-2xl font-bold text-fb-blue tracking-tight hidden lg:block">
              Tourloop
            </span>
          </div>
        </div>

        {/* CENTER: Search Bar & Desktop Nav */}
        <div className="flex-1 flex justify-center px-4 md:px-10">
            {/* Search - Hidden on small mobile */}
            <div className="hidden md:flex relative w-full max-w-xl z-50">
                <div className="relative w-full group">
                    <div className="absolute inset-y-0 start-0 pl-3 pr-3 flex items-center pointer-events-none">
                    <Search className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'} group-focus-within:text-fb-blue transition-colors`} />
                    </div>
                    <input
                    type="text"
                    className={`block w-full px-10 py-2.5 rounded-full border-transparent focus:border-fb-blue focus:ring-1 focus:ring-fb-blue transition-all outline-none text-sm ${isDark ? 'bg-gray-800 focus:bg-gray-800 text-white' : 'bg-gray-100 focus:bg-white text-black'}`}
                    placeholder={t('search_placeholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setActiveMenu('search')}
                    />
                    {/* Search Dropdown */}
                    {activeMenu === 'search' && (
                    <DropdownMenu className={`start-0 w-full ${dropdownBg}`}>
                        <div className="p-2">
                        <p className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {searchQuery ? "نتائج البحث" : t('shortcuts')}
                        </p>
                        {filteredSearch.length > 0 ? (
                            filteredSearch.map((item, idx) => (
                            <button key={idx} className={`w-full text-start px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${hoverBg}`}>
                                <Search className="w-3 h-3 text-gray-400" /> {item}
                            </button>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500 px-3 py-2">لا توجد نتائج.</p>
                        )}
                        </div>
                    </DropdownMenu>
                    )}
                </div>
            </div>
        </div>

        {/* Desktop Centered Nav (Optional Layout: If you prefer Nav in center, move this block. Here it's on right/left based on design usually, or center. Given Facebook layout, it's center. I'll place it in the center flex container if space permits, otherwise separate) */}
        <div className="hidden xl:flex items-center gap-1 xl:gap-2 absolute left-1/2 transform -translate-x-1/2 h-full">
            {navItems.map((item) => (
                <NavItem 
                    key={item.label} 
                    {...item} 
                    isActive={currentView === item.view} 
                    onClick={setView} 
                />
            ))}
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-2 lg:gap-3 min-w-fit justify-end">
          
          {/* Create Button */}
          <button 
            className={`hidden md:flex items-center justify-center w-10 h-10 rounded-full transition-colors ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`} 
            aria-label="Create"
          >
            <Plus className="w-5 h-5 text-black dark:text-white" />
          </button>

          {/* Messages */}
          <div className="relative">
            <button
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${activeMenu === 'messages' ? 'bg-blue-100 text-fb-blue' : isDark ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-black'}`}
              onClick={() => toggleMenu('messages')}
              aria-label="Messages"
            >
              <MessageCircle className="w-5 h-5" />
              <Badge count={MESSAGES.filter(m => m.unread).length} />
            </button>
            {activeMenu === 'messages' && (
              <DropdownMenu className={`end-0 w-80 sm:w-96 ${dropdownBg}`}>
                <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'} flex justify-between items-center`}>
                  <h3 className="font-bold text-lg">الرسائل</h3>
                  <span className="text-xs text-fb-blue cursor-pointer hover:underline">تحديد الكل كمقروء</span>
                </div>
                <div className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
                  {MESSAGES.map((msg) => (
                    <button key={msg.id} className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${hoverBg}`}>
                      <div className="relative">
                        <img src={msg.avatar} alt={msg.sender} className="w-10 h-10 rounded-full object-cover" />
                        {msg.unread && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-black rounded-full"></span>}
                      </div>
                      <div className="flex-1 text-start min-w-0">
                        <div className="flex justify-between items-baseline">
                          <p className={`text-sm truncate ${msg.unread ? 'font-bold' : 'font-medium'}`}>{msg.sender}</p>
                        </div>
                        <p className={`text-xs truncate ${msg.unread ? 'text-fb-blue font-semibold' : 'text-gray-500'}`}>{msg.preview}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className={`p-2 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'} text-center`}>
                  <button onClick={() => { setView('friends'); toggleMenu('messages'); }} className="text-sm text-fb-blue hover:underline font-medium">عرض الكل في Messenger</button>
                </div>
              </DropdownMenu>
            )}
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${activeMenu === 'notifications' ? 'bg-blue-100 text-fb-blue' : isDark ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-black'}`}
              onClick={() => toggleMenu('notifications')}
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <Badge count={NOTIFICATIONS.filter(n => !n.isRead).length} />
            </button>
            {activeMenu === 'notifications' && (
              <DropdownMenu className={`end-0 w-80 sm:w-96 ${dropdownBg}`}>
                <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'} flex justify-between items-center`}>
                  <h3 className="font-bold text-lg">الإشعارات</h3>
                  <button className="text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 p-1 rounded-full"><Settings className="w-4 h-4" /></button>
                </div>
                <div className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
                  {NOTIFICATIONS.map((notif) => (
                    <button key={notif.id} className={`w-full flex items-start gap-3 p-2 rounded-lg transition-colors ${hoverBg} ${!notif.isRead ? (isDark ? 'bg-blue-900/20' : 'bg-blue-50') : ''}`}>
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-fb-blue flex-shrink-0">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div className="text-start">
                        <p className="text-sm leading-snug">{notif.text}</p>
                        <p className="text-xs text-fb-blue mt-1 font-medium">{notif.time}</p>
                      </div>
                      {!notif.isRead && <div className="w-2 h-2 bg-fb-blue rounded-full mt-2"></div>}
                    </button>
                  ))}
                </div>
              </DropdownMenu>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative ml-1">
            <button
              className={`flex items-center gap-1 p-1 rounded-full border border-transparent transition-all ${hoverBg}`}
              onClick={() => toggleMenu('profile')}
            >
              <img src={CURRENT_USER.avatar} alt="Profile" className="w-8 h-8 rounded-full bg-gray-300 object-cover ring-2 ring-transparent hover:ring-fb-blue transition-all" />
              <ChevronDown className="w-4 h-4 text-gray-500 hidden sm:block" />
            </button>
            {activeMenu === 'profile' && (
              <DropdownMenu className={`end-0 w-72 ${dropdownBg}`}>
                <div 
                    className={`p-3 m-2 rounded-lg shadow-inner flex items-center gap-3 mb-2 cursor-pointer ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'}`}
                    onClick={() => { setView('profile'); toggleMenu('profile'); }}
                >
                  <img src={CURRENT_USER.avatar} alt="Profile" className="w-10 h-10 rounded-full" />
                  <div className="text-start overflow-hidden">
                    <p className="font-bold truncate">{CURRENT_USER.name}</p>
                    <span className="text-xs text-gray-500">عرض الملف الشخصي</span>
                  </div>
                </div>
                
                <div className="px-2 pb-2 space-y-1">
                  <div className={`border-b my-2 ${isDark ? 'border-gray-700' : 'border-gray-100'}`} />
                  
                  <button className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-sm font-medium ${hoverBg}`}>
                    <div className={`p-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}><Settings className="w-5 h-5" /></div>
                    الإعدادات والخصوصية
                  </button>
                  
                  <button 
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-sm font-medium ${hoverBg}`}
                    onClick={(e) => { e.stopPropagation(); toggleTheme(); }}
                  >
                    <div className={`p-2 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 flex justify-between items-center">
                      <span>المظهر</span>
                      <span className="text-xs text-gray-500">{isDark ? "داكن" : "فاتح"}</span>
                    </div>
                  </button>

                  <button className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors`}>
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full"><LogOut className="w-5 h-5" /></div>
                    تسجيل الخروج
                  </button>
                </div>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE MENU DRAWER */}
      {activeMenu === 'mobile' && (
        <div className="fixed inset-0 z-[150] md:hidden">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity opacity-100"
            onClick={() => toggleMenu('mobile')}
          />
          <div className={`fixed start-0 top-0 w-[85%] max-w-sm h-screen shadow-2xl overflow-y-auto transform transition-transform translate-x-0 ${dropdownBg}`}>
            <div className={`p-4 flex justify-between items-center border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
              <h2 className="text-2xl font-extrabold text-fb-blue">Tourloop</h2>
              <button onClick={() => toggleMenu('mobile')} className={`p-2 rounded-full ${hoverBg}`}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* User Info Mobile */}
              <div 
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}
                onClick={() => { setView('profile'); toggleMenu('mobile'); }}
              >
                <img src={CURRENT_USER.avatar} alt="Profile" className="w-12 h-12 rounded-full" />
                <div>
                  <p className="font-bold text-lg">{CURRENT_USER.name}</p>
                  <p className="text-sm text-gray-500">عرض الملف الشخصي</p>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">القائمة</p>
                {navItems.map((item, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => { setView(item.view); toggleMenu('mobile'); }}
                    className={`w-full flex items-center gap-4 p-3 rounded-lg text-lg font-medium transition-colors ${currentView === item.view ? 'bg-blue-50 dark:bg-blue-900/20 text-fb-blue' : hoverBg}`}
                  >
                    <item.icon className={`w-6 h-6 ${currentView === item.view ? 'text-fb-blue' : 'text-gray-500'}`} />
                    {item.label}
                  </button>
                ))}
                <button 
                    onClick={() => { setView('saved'); toggleMenu('mobile'); }}
                    className={`w-full flex items-center gap-4 p-3 rounded-lg text-lg font-medium transition-colors ${currentView === 'saved' ? 'bg-blue-50 dark:bg-blue-900/20 text-fb-blue' : hoverBg}`}
                  >
                    <Bookmark className={`w-6 h-6 ${currentView === 'saved' ? 'text-fb-blue' : 'text-gray-500'}`} />
                    {t('menu_saved')}
                </button>
              </div>

              {/* Settings & Logout */}
              <div className={`pt-4 border-t ${isDark ? 'border-gray-800' : 'border-gray-100'} space-y-1`}>
                <button onClick={toggleTheme} className={`w-full flex items-center gap-4 p-3 rounded-lg text-lg font-medium ${hoverBg}`}>
                  <span className="text-2xl text-gray-500">{isDark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}</span>
                  {isDark ? "الوضع النهاري" : "الوضع الليلي"}
                </button>
                <button className={`w-full flex items-center gap-4 p-3 rounded-lg text-lg font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20`}>
                  <LogOut className="w-6 h-6" />
                  تسجيل الخروج
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;