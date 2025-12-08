export type Language = 'ar' | 'en';
export type TextDirection = 'rtl' | 'ltr';

export interface TranslationKeys {
  dir: TextDirection;
  nav_home: string;
  nav_watch: string;
  nav_marketplace: string;
  nav_groups: string;
  nav_gaming: string;
  nav_events: string;
  nav_memories: string;
  nav_saved: string;
  nav_pages: string;
  nav_profile: string;
  nav_friends: string;
  nav_videos: string;
  about_work_edu: string;
  about_places_lived: string;
  about_contact_info: string;
  about_basic_info: string;
  about_relationship: string;
  profile_intro: string;
  profile_photos: string;
  profile_videos: string;
  profile_friends: string;
  profile_groups: string;
  profile_events: string;
  profile_pages: string;
  profile_about: string;
  create_post: string;
  whats_on_mind: string;
  post: string;
  like: string;
  comment: string;
  share: string;
  save: string;
  delete: string;
  edit: string;
  pin: string;
  unpin: string;
  add_story: string;
  your_story: string;
  online: string;
  offline: string;
  message: string;
  add_friend: string;
  unfriend: string;
  block: string;
  change_profile_photo: string;
  change_cover_photo: string;
  edit_profile: string;
  view_profile: string;
  settings: string;
  logout: string;
  search: string;
  notifications: string;
  messages: string;
  menu: string;
  dark_mode: string;
  light_mode: string;
  language: string;
}

const ar: TranslationKeys = {
  dir: 'rtl',
  nav_home: 'الرئيسية',
  nav_watch: 'مقاطع الفيديو',
  nav_marketplace: 'المتجر',
  nav_groups: 'المجموعات',
  nav_gaming: 'الألعاب',
  nav_events: 'الفعاليات',
  nav_memories: 'الذكريات',
  nav_saved: 'العناصر المحفوظة',
  nav_pages: 'الصفحات',
  nav_profile: 'الملف الشخصي',
  nav_friends: 'الأصدقاء',
  nav_videos: 'الفيديوهات',
  about_work_edu: 'العمل والتعليم',
  about_places_lived: 'الأماكن التي عشت فيها',
  about_contact_info: 'معلومات الاتصال',
  about_basic_info: 'المعلومات الأساسية',
  about_relationship: 'العلاقة',
  profile_intro: 'المقدمة',
  profile_photos: 'الصور',
  profile_videos: 'الفيديوهات',
  profile_friends: 'الأصدقاء',
  profile_groups: 'المجموعات',
  profile_events: 'الفعاليات',
  profile_pages: 'الصفحات',
  profile_about: 'حول',
  create_post: 'إنشاء منشور',
  whats_on_mind: 'بم تفكر؟',
  post: 'نشر',
  like: 'إعجاب',
  comment: 'تعليق',
  share: 'مشاركة',
  save: 'حفظ',
  delete: 'حذف',
  edit: 'تعديل',
  pin: 'تثبيت',
  unpin: 'إلغاء التثبيت',
  add_story: 'إضافة قصة',
  your_story: 'قصتك',
  online: 'متصل',
  offline: 'غير متصل',
  message: 'رسالة',
  add_friend: 'إضافة صديق',
  unfriend: 'إلغاء الصداقة',
  block: 'حظر',
  change_profile_photo: 'تغيير صورة الملف الشخصي',
  change_cover_photo: 'تغيير صورة الغلاف',
  edit_profile: 'تعديل الملف الشخصي',
  view_profile: 'عرض الملف الشخصي',
  settings: 'الإعدادات',
  logout: 'تسجيل الخروج',
  search: 'بحث',
  notifications: 'الإشعارات',
  messages: 'الرسائل',
  menu: 'القائمة',
  dark_mode: 'الوضع الداكن',
  light_mode: 'الوضع الفاتح',
  language: 'اللغة',
};

const en: TranslationKeys = {
  dir: 'ltr',
  nav_home: 'Home',
  nav_watch: 'Watch',
  nav_marketplace: 'Marketplace',
  nav_groups: 'Groups',
  nav_gaming: 'Gaming',
  nav_events: 'Events',
  nav_memories: 'Memories',
  nav_saved: 'Saved',
  nav_pages: 'Pages',
  nav_profile: 'Profile',
  nav_friends: 'Friends',
  nav_videos: 'Videos',
  about_work_edu: 'Work and Education',
  about_places_lived: 'Places Lived',
  about_contact_info: 'Contact Info',
  about_basic_info: 'Basic Info',
  about_relationship: 'Relationship',
  profile_intro: 'Intro',
  profile_photos: 'Photos',
  profile_videos: 'Videos',
  profile_friends: 'Friends',
  profile_groups: 'Groups',
  profile_events: 'Events',
  profile_pages: 'Pages',
  profile_about: 'About',
  create_post: 'Create Post',
  whats_on_mind: "What's on your mind?",
  post: 'Post',
  like: 'Like',
  comment: 'Comment',
  share: 'Share',
  save: 'Save',
  delete: 'Delete',
  edit: 'Edit',
  pin: 'Pin',
  unpin: 'Unpin',
  add_story: 'Add Story',
  your_story: 'Your Story',
  online: 'Online',
  offline: 'Offline',
  message: 'Message',
  add_friend: 'Add Friend',
  unfriend: 'Unfriend',
  block: 'Block',
  change_profile_photo: 'Change Profile Photo',
  change_cover_photo: 'Change Cover Photo',
  edit_profile: 'Edit Profile',
  view_profile: 'View Profile',
  settings: 'Settings',
  logout: 'Logout',
  search: 'Search',
  notifications: 'Notifications',
  messages: 'Messages',
  menu: 'Menu',
  dark_mode: 'Dark Mode',
  light_mode: 'Light Mode',
  language: 'Language',
};

export const translations: Record<Language, TranslationKeys> = {
  ar,
  en,
};
