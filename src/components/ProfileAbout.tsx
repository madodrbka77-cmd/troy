import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Briefcase, GraduationCap, MapPin, Heart, Phone, Info, Clock, Globe, Plus, Save, X, Trash2, Users, Lock, ChevronDown, Home, Mail, Link as LinkIcon, Calendar, User as UserIcon, Languages, Mic, Quote, Droplet, PenLine, Star, Pen, Facebook, Instagram, Twitter, Linkedin, Youtube, Github, MessageCircle, Twitch } from 'lucide-react';
import type { User } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface ProfileAboutProps {
  currentUser: User;
  readonly?: boolean;
}

type SectionType = 'overview' | 'work' | 'places' | 'contact' | 'family' | 'details' | 'events';
type PrivacyLevel = 'public' | 'friends' | 'friends_of_friends' | 'only_me';
type PlaceType = 'current' | 'hometown';

// Data Interfaces
interface Work {
  id: string;
  role: string;
  company: string;
  privacy: PrivacyLevel;
}

interface University {
  id: string;
  name: string;
  degree: string;
  major: string;
  year: string;
  privacy: PrivacyLevel;
}

interface School {
  id: string;
  name: string;
  year: string;
  privacy: PrivacyLevel;
}

interface Place {
  id: string;
  type: PlaceType;
  country: string;
  city: string;
  privacy: PrivacyLevel;
}

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  privacy: PrivacyLevel;
}

interface Website {
  id: string;
  url: string;
  privacy: PrivacyLevel;
}

interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  privacy: PrivacyLevel;
}

interface Relationship {
  status: string;
  partner?: string;
  year?: string;
  month?: string;
  day?: string;
  privacy: PrivacyLevel;
}

interface OtherName {
  id: string;
  name: string;
  type: string;
  privacy: PrivacyLevel;
}

interface LifeEvent {
  id: string;
  title: string;
  location: string;
  description: string;
  year: string;
  privacy: PrivacyLevel;
}

// Hypothetical User.about structure for initialization
// In a real app, this would match your backend User model.
interface UserAboutData {
  works?: Work[];
  universities?: University[];
  schools?: School[];
  places?: Place[];
  contactInfo?: { mobile: { value: string; privacy: PrivacyLevel; }; email: { value: string; privacy: PrivacyLevel; }; };
  websites?: Website[];
  socialLinks?: SocialLink[];
  basicInfo?: { gender: { value: string; privacy: PrivacyLevel; }; birthDate: { day: string; month: string; year: string; privacy: PrivacyLevel; }; languages: { value: string[]; privacy: PrivacyLevel; }; };
  relationship?: Relationship;
  familyMembers?: FamilyMember[];
  bio?: { text: string; privacy: PrivacyLevel; };
  pronunciation?: { text: string; privacy: PrivacyLevel; };
  otherNames?: OtherName[];
  quotes?: { text: string; privacy: PrivacyLevel; };
  bloodDonor?: boolean;
  lifeEvents?: LifeEvent[];
}

// --- Data Constants ---
const COUNTRIES_DATA: Record<string, string[]> = {
  "مصر": ["القاهرة", "الإسكندرية", "الجيزة", "المنصورة", "شرم الشيخ", "أسوان", "الأقصر", "طنطا", "بورسعيد", "السويس", "الغردقة", "دمياط", "الإسماعيلية", "الزقازيق", "المنيا", "أسيوط", "سوهاج", "كفر الشيخ", "الفيوم", "بني سويف", "قنا", "مطروح", "العريش"],
  "السعودية": ["الرياض", "جدة", "مكة المكرمة", "الدمام", "المدينة المنورة", "الخبر", "تبوك", "أبها", "الطائف", "بريدة", "خميس مشيط", "الجبيل", "حائل", "نجران", "جازان", "الهفوف", "المبرز", "القطيف", "ينبع", "عرعر", "سكاكا"],
  "الإمارات": ["دبي", "أبو ظبي", "الشارقة", "عجمان", "رأس الخيمة", "الفجيرة", "العين", "أم القيوين", "خورفكان", "دبا الفجيرة"],
  "الكويت": ["مدينة الكويت", "حولي", "السالمية", "الأحمدي", "الجهراء", "الفروانية", "مبارك الكبير", "الصباحية", "الفحيحيل"],
  "قطر": ["الدوحة", "الريان", "الخور", "الوكرة", "أم صلال", "الشمال", "مسيعيد", "دخان"],
  "البحرين": ["المنامة", "المحرق", "الرفاع", "مدينة حمد", "مدينة عيسى", "الحد", "سترة", "البديع"],
  "عمان": ["مسقط", "صلالة", "صحار", "نزوى", "صور", "البريمي", "السيب", "عبري", "إبراء", "خصب"],
  "الأردن": ["عمان", "الزرقاء", "إربد", "العقبة", "السلط", "مادبا", "الكرك", "جرش", "المفرق", "معان", "عجلون", "الطفيلة"],
  "لبنان": ["بيروت", "طرابلس", "صيدا", "صور", "جونيه", "زحلة", "بعلبك", "جبيل", "النبطية", "عاليه"],
  "العراق": ["بغداد", "البصرة", "الموصل", "أربيل", "النجف", "كربلاء", "كركوك", "السليمانية", "الرمادي", "الفلوجة", "الحلة", "الناصرية", "العمارة", "الديوانية", "الكوت", "دهوك", "سامراء"],
  "سوريا": ["دمشق", "حلب", "حمص", "اللاذقية", "حماة", "طرطوس", "الرقة", "دير الزور", "الحسكة", "إدلب", "درعا", "السويداء"],
  "فلسطين": ["القدس", "غزة", "رام الله", "نابلس", "الخليل", "بيت لحم", "أريحا", "جنين", "طولكرم", "رفح", "خان يونس", "قلقيلية", "دير البلح"],
  "المغرب": ["الدار البيضاء", "الرباط", "مراكش", "فاس", "طنجة", "أكادير", "مكناس", "وجدة", "القنيطرة", "تطوان", "آسفي", "تمارة", "العيون", "المحمدية", "الجديدة", "بني ملال"],
  "تونس": ["تونس", "صفاقس", "سوسة", "المنستير", "القيروان", "بنزرت", "قابس", "أريانة", "القصرين", "قفصة", "توزر", "جربة"],
  "الجزائر": ["الجزائر", "وهران", "قسنطينة", "عنابة", "البليدة", "تلمسان", "سطيف", "باتنة", "بجاية", "سكيكدة", "سيدي بلعباس", "مستغانم", "بسكرة"],
  "ليبيا": ["طرابلس", "بنغازي", "مصراتة", "البيضاء", "طبرق", "الزاوية", "سبها", "سرت", "أجدابيا", "درنة"],
  "السودان": ["الخرطوم", "أم درمان", "بورتسودان", "نيالا", "كسلا", "الأبيض", "القضارف", "كوستي", "واد مدني"],
  "اليمن": ["صنعاء", "عدن", "تعز", "الحديدة", "المكلا", "إب", "ذمار", "عمران", "صعدة"],
  "موريتانيا": ["نواكشوط", "نواذيبو", "كيفه", "روصو", "كيهيدي"],
  "الصومال": ["مقديشو", "هرجيسا", "بوصاصو", "جالكعيو", "بربرة"],
  "جيبوتي": ["جيبوتي", "علي صبيح", "تاجورة", "دخيل"],
  "جزر القمر": ["موروني", "موتسامودو", "فومبوني"],
  "تركيا": ["إسطنبول", "أنقرة", "إزمير", "أنطاليا", "بورصة", "غازي عنتاب", "أضنة", "قونية", "مرسين", "ديار بكر", "قيصري", "سامسون"],
  "الولايات المتحدة": ["نيويورك", "لوس أنجلوس", "شيكاغو", "هيوستن", "واشنطن", "ميامي", "سان فرانسيسكو", "بوسطن", "سياتل", "دالاس", "أتلانتا", "فيلادلفيا", "فينيكس", "ديترويت", "سان دييغو"],
  "المملكة المتحدة": ["لندن", "مانشستر", "ليفربول", "برمنغهام", "ليدز", "غلاسكو", "أدنبرة", "بريستول", "شفيلد", "كارديف", "بلفاست"],
  "ألمانيا": ["برلين", "ميونخ", "هامبورغ", "فرانكفورت", "كولونيا", "شتوتغارت", "دوسلدورف", "دورتموند", "إيسن", "لايبزيغ"],
  "فرنسا": ["باريس", "ليون", "مارسيليا", "تولوز", "نيس", "بوردو", "ستراسبورغ", "نانت", "مونبلييه", "ليل"],
  "إيطاليا": ["روما", "ميلانو", "نابولي", "تورينو", "البندقية", "فلورنسا", "بولونيا", "جنوة", "باري", "باليرمو"],
  "إسبانيا": ["مدريد", "برشلونة", "فالنسيا", "إشبيلية", "ملقة", "بلباو", "سرقسطة", "مايوركا"],
  "كندا": ["تورونتو", "مونتريال", "فانكوفر", "كالجاري", "أوتاوا", "إدمونتون", "كيبيك", "وينيبيغ"],
  "أستراليا": ["سيدني", "ملبورن", "بريزبن", "بيرث", "أديلايد", "كانبرا", "جولد كوست"],
  "الهند": ["نيودلهي", "مومباي", "بنغالور", "تشيناي", "حيدر أباد", "كولكاتا", "أحمد أباد", "بونه"],
  "الصين": ["بكين", "شانغهاي", "غوانزو", "شنتشن", "تشنغدو", "ووهان", "تيانجين", "هانغتشو"],
  "اليابان": ["طوكيو", "أوساكا", "يوكوهاما", "ناغويا", "سوبورو", "كيوتو", "كوبي", "فوكوكا"],
  "البرازيل": ["ساو باولو", "ريو دي جانيرو", "برازيليا", "سلفادور", "فورتاليزا", "بيلو هوريزونتي"],
  "روسيا": ["موسكو", "سانت بطرسبرغ", "نوفوسيبيرسك", "يكاترينبورغ", "قازان", "نيجني نوفغورود"]
};

const SOCIAL_PLATFORMS = [
  "فيسبوك (Facebook)", "إنستجرام (Instagram)", "تويتر (X)", "لينكد إن (LinkedIn)", 
  "سناب شات (Snapchat)", "تيك توك (TikTok)", "يوتيوب (YouTube)", "واتساب (WhatsApp)",
  "تيليجرام (Telegram)", "بينتيريست (Pinterest)", "بيهانس (Behance)", "جيت هب (GitHub)",
  "ديسكورد (Discord)", "تويتش (Twitch)", "ساوند كلاود (SoundCloud)"
];

const LANGUAGES_LIST = [
  "العربية", "الإنجليزية", "الفرنسية", "الإسبانية", "الألمانية", "الإيطالية", 
  "التركية", "الروسية", "الصينية", "اليابانية", "الكورية", "الهندية", 
  "البرتغالية", "الهولندية", "اليونانية", "السويدية", "الفارسية", "الأردية"
];

const MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", 
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

const RELATIONSHIP_STATUS_OPTIONS = [
    "أعزب", "مرتبط", "مخطوب", "متزوج", "في علاقة مدنية", 
    "في علاقة مفتوحة", "علاقة معقدة", "منفصل", "مطلق", "أرمل"
];

const PARTNER_REQUIRED_STATUSES = ["مرتبط", "مخطوب", "متزوج", "في علاقة مدنية", "في علاقة مفتوحة", "علاقة معقدة"];

const FAMILY_RELATIONS_OPTIONS = [
    "أب", "أم", "أخ", "أخت", "ابن", "ابنة", 
    "عم/خال", "عمة/خالة", "جد", "جدة", 
    "ابن أخ/أخت", "ابنة أخ/أخت", "ابن عم/خال", "ابنة عم/خال", "زوج الأب", "زوجة الأب"
];

const OTHER_NAME_TYPES = [
    "اسم الشهرة", "اسم قبل الزواج", "طريقة كتابة بديلة", "اسم المتزوجة",
    "اسم الأب", "اسم الميلاد", "اسم سابق", "اسم مع لقب", "آخر"
];

// Mock friends list for dropdowns
const MOCK_FRIENDS_LIST = [
    "محمد أحمد", "سارة علي", "يوسف محمود", "منى زكي", "كريم عبد العزيز", 
    "أحمد حلمي", "نور الشريف", "عمر الشريف", "ليلى علوي", "هند صبري"
];

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 111 }, (_, i) => String((currentYear + 10) - i));

// Predefined Options
const jobTitles = [
    "مهندس برمجيات", "مطور ويب", "مطور تطبيقات جوال", "مدير مشروع تقني", "مصمم جرافيك", 
    "مصمم واجهات مستخدم (UI/UX)", "محلل بيانات", "مهندس أمن سيبراني", "مسؤول شبكات",
    "محاسب", "مدير موارد بشرية", "مسوق إلكتروني", "مدير مبيعات", "مندوب مبيعات", 
    "خدمة عملاء", "سكرتير", "موظف استقبال", "مدير عام", "رائد أعمال", "محلل مالي",
    "طبيب بشري", "طبيب أسنان", "صيدلي", "ممرض", "أخصائي علاج طبيعي", 
    "أخصائي تغذية", "فني مختبر", "طبيب بيطري",
    "مهندس مدني", "مهندس معماري", "مهندس ميكانيكا", "مهندس كهرباء", "مهندس زراعي", "مهندس ديكور",
    "مدرس", "أستاذ جامعي", "معيد", "مدير مدرسة", "محاضر", "باحث أكاديمي",
    "محامي", "مستشار قانوني", "قاضي",
    "كاتب محتوى", "صحفي", "مترجم", "مصور", "مخرج", "مونتير", "ممثل", "رسام",
    "طباخ", "شيف", "نادل", "سائق", "ميكانيكي", "كهربائي منازل", 
    "نجار", "سباك", "حداد", "نقاش", "حلاق", "خياط",
    "طالب", "عمل حر (Freelancer)", "مدرب رياضي", "ضابط شرطة", "طيار", "مضيف طيران"
];

const degrees = [
    "ثانوية عامة", "دبلوم فني", "دبلوم عالي", "بكالوريوس", 
    "ليسانس", "ماجستير", "دكتوراه", "زمالة"
];

// Map for social platform icons
const PLATFORM_ICONS: Record<string, React.ElementType> = {
  'facebook': Facebook,
  'instagram': Instagram,
  'twitter': Twitter,
  'x)': Twitter, // For 'تويتر (X)'
  'linkedin': Linkedin,
  'youtube': Youtube,
  'github': Github,
  'whatsapp': MessageCircle,
  'telegram': MessageCircle,
  'twitch': Twitch,
  // Add more platforms as needed
};

// --- Privacy Selector Component ---
interface PrivacySelectProps {
  value: PrivacyLevel;
  onChange: (val: PrivacyLevel) => void;
  small?: boolean;
  id?: string; // For accessibility
}

const PrivacySelect: React.FC<PrivacySelectProps> = ({ value, onChange, small, id }) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options: { val: PrivacyLevel; label: string; icon: React.ElementType }[] = [
    { val: 'public', label: t('common.public'), icon: Globe },
    { val: 'friends', label: t('common.friends'), icon: Users },
    { val: 'friends_of_friends', label: t('common.friendsOfFriends'), icon: Users }, // Fixed Arabic typo
    { val: 'only_me', label: t('common.onlyMe'), icon: Lock },
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
      <button
        type="button"
        id={id} // Added id for accessibility
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 bg-gray-200 hover:bg-gray-300 rounded-md transition font-semibold text-gray-700 ${small ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={t('common.privacySetting')}
      >
        <Icon className={small ? "w-3 h-3" : "w-4 h-4"} />
        <span>{selected.label}</span>
        <ChevronDown className={small ? "w-3 h-3" : "w-3 h-3"} />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 md:right-0 z-20 mt-1 w-40 bg-white shadow-xl rounded-lg border border-gray-100 overflow-hidden animate-fadeIn"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby={id}
        >
          {options.map((opt) => (
            <div
              key={opt.val}
              onClick={() => {
                onChange(opt.val);
                setIsOpen(false);
              }}
              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-100 text-sm ${value === opt.val ? 'bg-blue-50 text-fb-blue' : 'text-gray-700'}`}
              role="menuitem"
            >
              <opt.icon className="w-4 h-4" />
              <span>{opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Helper to render Privacy Icon only ---
const PrivacyIcon: React.FC<{ type: PrivacyLevel }> = ({ type }) => {
    const { t } = useLanguage();
    const privacyText = {
      'public': t('common.public'),
      'friends': t('common.friends'),
      'friends_of_friends': t('common.friendsOfFriends'),
      'only_me': t('common.onlyMe'),
    }[type];

    const Icon = {
      'public': Globe,
      'friends': Users,
      'friends_of_friends': Users,
      'only_me': Lock,
    }[type];
    
    return <span title={privacyText} className="inline-flex items-center"><Icon className="w-3.5 h-3.5 text-fb-blue/70" /></span>;
};

// --- Helper to render Platform Icon ---
const getPlatformIcon = (platform: string) => {
  const p = platform.toLowerCase();
  const Icon = Object.entries(PLATFORM_ICONS).find(([key]) => p.includes(key))?.[1] || Globe;
  return <Icon className="w-5 h-5 text-fb-blue" />;
};

// --- Reusable Form Action Buttons Component ---
interface FormActionsProps {
  onCancel: () => void;
  onSave: () => void;
  onDelete?: () => void;
  saveDisabled?: boolean;
  editingId?: string | null;
  t: (key: string) => string; // Pass translation function
}

const FormActions: React.FC<FormActionsProps> = ({
  onCancel,
  onSave,
  onDelete,
  saveDisabled,
  editingId,
  t,
}) => (
  <div className="flex items-center justify-between pt-2 border-t border-gray-200 mt-3">
    {editingId && onDelete ? (
      <button
        type="button"
        onClick={onDelete}
        className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-md text-sm font-semibold flex items-center gap-1"
      >
        <Trash2 className="w-4 h-4" /> {t('btn.delete')}
      </button>
    ) : (
      <div />
    )}
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="px-3 py-1.5 text-gray-600 hover:bg-gray-200 rounded-md text-sm font-semibold"
      >
        {t('btn.cancel')}
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saveDisabled}
        className="px-4 py-1.5 bg-fb-blue text-white rounded-md text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
      >
        {t('btn.save')}
      </button>
    </div>
  </div>
);


// --- Sub-components for each section to reduce ProfileAbout complexity ---

// Work and Education Section
interface WorkEducationSectionProps {
  readonly: boolean;
  works: Work[];
  setWorks: React.Dispatch<React.SetStateAction<Work[]>>;
  universities: University[];
  setUniversities: React.Dispatch<React.SetStateAction<University[]>>;
  schools: School[];
  setSchools: React.Dispatch<React.SetStateAction<School[]>>;
  t: (key: string) => string;
}

const WorkEducationSection: React.FC<WorkEducationSectionProps> = ({
  readonly,
  works,
  setWorks,
  universities,
  setUniversities,
  schools,
  setSchools,
  t,
}) => {
  const [showWorkForm, setShowWorkForm] = useState(false);
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [newWork, setNewWork] = useState<Omit<Work, 'id'>>({ role: '', company: '', privacy: 'public' });

  const [showUniForm, setShowUniForm] = useState(false);
  const [editingUniId, setEditingUniId] = useState<string | null>(null);
  const [newUni, setNewUni] = useState<Omit<University, 'id'>>({ name: '', degree: '', major: '', year: '', privacy: 'public' });

  const [showSchoolForm, setShowSchoolForm] = useState(false);
  const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
  const [newSchool, setNewSchool] = useState<Omit<School, 'id'>>({ name: '', year: '', privacy: 'public' });

  const resetWorkForm = useCallback(() => {
    setNewWork({ role: '', company: '', privacy: 'public' });
    setEditingWorkId(null);
    setShowWorkForm(false);
  }, []);

  const handleSaveWork = useCallback(() => {
    if (newWork.role && newWork.company) {
      if (editingWorkId) {
        setWorks((prev) => prev.map((w) => (w.id === editingWorkId ? { ...newWork, id: editingWorkId } as Work : w)));
      } else {
        setWorks((prev) => [...prev, { ...newWork, id: `work-${Date.now()}` }]);
      }
      resetWorkForm();
    }
  }, [newWork, editingWorkId, setWorks, resetWorkForm]);

  const handleEditWork = useCallback((work: Work) => {
    setNewWork(work);
    setEditingWorkId(work.id);
    setShowWorkForm(true);
  }, []);

  const handleDeleteWork = useCallback((id: string) => {
    setWorks((prev) => prev.filter((w) => w.id !== id));
    resetWorkForm();
  }, [setWorks, resetWorkForm]);

  const resetUniForm = useCallback(() => {
    setNewUni({ name: '', degree: '', major: '', year: '', privacy: 'public' });
    setEditingUniId(null);
    setShowUniForm(false);
  }, []);

  const handleSaveUni = useCallback(() => {
    if (newUni.name && newUni.degree) {
      if (editingUniId) {
        setUniversities((prev) => prev.map((u) => (u.id === editingUniId ? { ...newUni, id: editingUniId } as University : u)));
      } else {
        setUniversities((prev) => [...prev, { ...newUni, id: `uni-${Date.now()}` }]);
      }
      resetUniForm();
    }
  }, [newUni, editingUniId, setUniversities, resetUniForm]);

  const handleEditUni = useCallback((uni: University) => {
    setNewUni(uni);
    setEditingUniId(uni.id);
    setShowUniForm(true);
  }, []);

  const handleDeleteUni = useCallback((id: string) => {
    setUniversities((prev) => prev.filter((u) => u.id !== id));
    resetUniForm();
  }, [setUniversities, resetUniForm]);

  const resetSchoolForm = useCallback(() => {
    setNewSchool({ name: '', year: '', privacy: 'public' });
    setEditingSchoolId(null);
    setShowSchoolForm(false);
  }, []);

  const handleSaveSchool = useCallback(() => {
    if (newSchool.name) {
      if (editingSchoolId) {
        setSchools((prev) => prev.map((s) => (s.id === editingSchoolId ? { ...newSchool, id: editingSchoolId } as School : s)));
      } else {
        setSchools((prev) => [...prev, { ...newSchool, id: `school-${Date.now()}` }]);
      }
      resetSchoolForm();
    }
  }, [newSchool, editingSchoolId, setSchools, resetSchoolForm]);

  const handleEditSchool = useCallback((school: School) => {
    setNewSchool(school);
    setEditingSchoolId(school.id);
    setShowSchoolForm(true);
  }, []);

  const handleDeleteSchool = useCallback((id: string) => {
    setSchools((prev) => prev.filter((s) => s.id !== id));
    resetSchoolForm();
  }, [setSchools, resetSchoolForm]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Work Section */}
      <div>
        <h4 className="font-bold text-[19px] mb-4 text-gray-900">{t('about.workEdu')}</h4>

        {works.map((work) => (
          <div key={work.id} className="flex items-start gap-4 mb-4 group relative">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-5 h-5 text-fb-blue" />
            </div>
            <div className="flex-1">
              <div className="text-[16px] font-bold text-fb-blue">{work.role}</div>
              <div className="text-fb-blue font-medium text-[14px] flex items-center gap-2">
                {t('work.roleAt')} {work.company}
                <span aria-hidden="true">·</span>
                <PrivacyIcon type={work.privacy} />
              </div>
            </div>
            {!readonly && (
              <button
                type="button"
                onClick={() => handleEditWork(work)}
                className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition"
                aria-label={t('btn.edit')}
              >
                <Pen className="w-5 h-5" />
              </button>
            )}
          </div>
        ))}

        {!readonly &&
          (!showWorkForm ? (
            <button
              type="button"
              onClick={() => {
                setNewWork({ role: '', company: '', privacy: 'public' });
                setEditingWorkId(null);
                setShowWorkForm(true);
              }}
              className="flex items-center gap-2 text-fb-blue hover:underline text-[15px] font-bold mt-2"
            >
              <Plus className="w-6 h-6 rounded-full bg-blue-50 p-1" />
              <span>{t('empty.addWork')}</span>
            </button>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4 fade-in">
              <div className="space-y-3">
                <div>
                  <label htmlFor="work-role" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('ph.position')}
                  </label>
                  <select
                    id="work-role"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white focus:ring-2 focus:ring-fb-blue focus:border-transparent outline-none"
                    value={newWork.role}
                    onChange={(e) => setNewWork({ ...newWork, role: e.target.value })}
                  >
                    <option value="">{t('ph.position')}...</option>
                    {jobTitles.map((title) => (
                      <option key={title} value={title}>
                        {title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="work-company" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('ph.company')}
                  </label>
                  <input
                    type="text"
                    id="work-company"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-fb-blue focus:border-transparent outline-none"
                    placeholder={t('ph.company')}
                    value={newWork.company}
                    onChange={(e) => setNewWork({ ...newWork, company: e.target.value })}
                  />
                </div>

                <div className="pt-2 flex justify-start">
                  <PrivacySelect
                    id="work-privacy"
                    value={newWork.privacy}
                    onChange={(val) => setNewWork({ ...newWork, privacy: val })}
                  />
                </div>

                <FormActions
                  onCancel={resetWorkForm}
                  onSave={handleSaveWork}
                  onDelete={editingWorkId ? () => handleDeleteWork(editingWorkId) : undefined}
                  saveDisabled={!newWork.role || !newWork.company}
                  editingId={editingWorkId}
                  t={t}
                />
              </div>
            </div>
          ))}
      </div>

      <div className="border-t border-gray-200"></div>

      {/* University Section */}
      <div>
        <h4 className="font-bold text-[19px] mb-4 text-gray-900">{t('edu.university')}</h4>

        {universities.map((uni) => (
          <div key={uni.id} className="flex items-start gap-4 mb-4 group relative">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-5 h-5 text-fb-blue" />
            </div>
            <div className="flex-1">
              <div className="text-[16px] font-bold text-fb-blue">{uni.name}</div>
              <div className="text-fb-blue font-medium text-[14px] flex items-center gap-2 flex-wrap">
                {uni.degree} · {uni.major} {uni.year && `· ${t('edu.graduated')} ${uni.year}`}
                <span aria-hidden="true">·</span>
                <PrivacyIcon type={uni.privacy} />
              </div>
            </div>
            {!readonly && (
              <button
                type="button"
                onClick={() => handleEditUni(uni)}
                className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition"
                aria-label={t('btn.edit')}
              >
                <Pen className="w-5 h-5" />
              </button>
            )}
          </div>
        ))}

        {!readonly &&
          (!showUniForm ? (
            <button
              type="button"
              onClick={() => {
                setNewUni({ name: '', degree: '', major: '', year: '', privacy: 'public' });
                setEditingUniId(null);
                setShowUniForm(true);
              }}
              className="flex items-center gap-2 text-fb-blue hover:underline text-[15px] font-bold mt-2"
            >
              <Plus className="w-6 h-6 rounded-full bg-blue-50 p-1" />
              <span>{t('empty.addUniversity')}</span>
            </button>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4 fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label htmlFor="uni-name" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('ph.university')}
                  </label>
                  <input
                    type="text"
                    id="uni-name"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-fb-blue focus:border-transparent outline-none"
                    value={newUni.name}
                    onChange={(e) => setNewUni({ ...newUni, name: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="uni-degree" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('edu.degree')}
                  </label>
                  <select
                    id="uni-degree"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white focus:ring-2 focus:ring-fb-blue focus:border-transparent outline-none"
                    value={newUni.degree}
                    onChange={(e) => setNewUni({ ...newUni, degree: e.target.value })}
                  >
                    <option value="">{t('ph.selectDegree')}</option>
                    {degrees.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="uni-year" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('edu.graduatedYear')}
                  </label>
                  <input
                    type="number"
                    id="uni-year"
                    placeholder="YYYY"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-fb-blue focus:border-transparent outline-none"
                    value={newUni.year}
                    onChange={(e) => setNewUni({ ...newUni, year: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="uni-major" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('edu.major')}
                  </label>
                  <input
                    type="text"
                    id="uni-major"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-fb-blue focus:border-transparent outline-none"
                    placeholder={t('ph.majorExample')}
                    value={newUni.major}
                    onChange={(e) => setNewUni({ ...newUni, major: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-start">
                <PrivacySelect
                  id="uni-privacy"
                  value={newUni.privacy}
                  onChange={(val) => setNewUni({ ...newUni, privacy: val })}
                />
              </div>

              <FormActions
                onCancel={resetUniForm}
                onSave={handleSaveUni}
                onDelete={editingUniId ? () => handleDeleteUni(editingUniId) : undefined}
                saveDisabled={!newUni.name || !newUni.degree}
                editingId={editingUniId}
                t={t}
              />
            </div>
          ))}
      </div>

      <div className="border-t border-gray-200"></div>

      {/* High School Section */}
      <div>
        <h4 className="font-bold text-[19px] mb-4 text-gray-900">{t('edu.highSchool')}</h4>

        {schools.map((school) => (
          <div key={school.id} className="flex items-start gap-4 mb-4 group relative">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-5 h-5 text-fb-blue" />
            </div>
            <div className="flex-1">
              <div className="text-[16px] font-bold text-fb-blue">{school.name}</div>
              <div className="text-fb-blue font-medium text-[14px] flex items-center gap-2">
                {school.year ? `${t('edu.graduated')} ${school.year}` : t('empty.highSchool')}
                <span aria-hidden="true">·</span>
                <PrivacyIcon type={school.privacy} />
              </div>
            </div>
            {!readonly && (
              <button
                type="button"
                onClick={() => handleEditSchool(school)}
                className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition"
                aria-label={t('btn.edit')}
              >
                <Pen className="w-5 h-5" />
              </button>
            )}
          </div>
        ))}

        {!readonly &&
          (!showSchoolForm ? (
            <button
              type="button"
              onClick={() => {
                setNewSchool({ name: '', year: '', privacy: 'public' });
                setEditingSchoolId(null);
                setShowSchoolForm(true);
              }}
              className="flex items-center gap-2 text-fb-blue hover:underline text-[15px] font-bold mt-2"
            >
              <Plus className="w-6 h-6 rounded-full bg-blue-50 p-1" />
              <span>{t('empty.addHighSchool')}</span>
            </button>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4 fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label htmlFor="school-name" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('ph.school')}
                  </label>
                  <input
                    type="text"
                    id="school-name"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-fb-blue focus:border-transparent outline-none"
                    value={newSchool.name}
                    onChange={(e) => setNewSchool({ ...newSchool, name: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="school-year" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('edu.graduatedYear')}
                  </label>
                  <input
                    type="number"
                    id="school-year"
                    placeholder="YYYY"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-fb-blue focus:border-transparent outline-none"
                    value={newSchool.year}
                    onChange={(e) => setNewSchool({ ...newSchool, year: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-start">
                <PrivacySelect
                  id="school-privacy"
                  value={newSchool.privacy}
                  onChange={(val) => setNewSchool({ ...newSchool, privacy: val })}
                />
              </div>

              <FormActions
                onCancel={resetSchoolForm}
                onSave={handleSaveSchool}
                onDelete={editingSchoolId ? () => handleDeleteSchool(editingSchoolId) : undefined}
                saveDisabled={!newSchool.name}
                editingId={editingSchoolId}
                t={t}
              />
            </div>
          ))}
      </div>
    </div>
  );
};

// Places Section
interface PlacesSectionProps {
  readonly: boolean;
  places: Place[];
  setPlaces: React.Dispatch<React.SetStateAction<Place[]>>;
  t: (key: string) => string;
}

const PlacesSection: React.FC<PlacesSectionProps> = ({
  readonly,
  places,
  setPlaces,
  t,
}) => {
  const [editingPlaceType, setEditingPlaceType] = useState<PlaceType | null>(null);
  const [newPlace, setNewPlace] = useState<Omit<Place, 'id' | 'type'>>({ country: '', city: '', privacy: 'public' });

  const resetPlaceForm = useCallback(() => {
    setNewPlace({ country: '', city: '', privacy: 'public' });
    setEditingPlaceType(null);
  }, []);

  const handleSavePlace = useCallback(() => {
    if (newPlace.country && newPlace.city && editingPlaceType) {
      const filteredPlaces = places.filter((p) => p.type !== editingPlaceType);
      setPlaces([...filteredPlaces, { ...newPlace, id: `place-${Date.now()}`, type: editingPlaceType }]);
      resetPlaceForm();
    }
  }, [newPlace, editingPlaceType, places, setPlaces, resetPlaceForm]);

  const handleEditPlace = useCallback((place: Place) => {
    setNewPlace(place);
    setEditingPlaceType(place.type);
  }, []);

  const handleDeletePlace = useCallback((typeToDelete: PlaceType) => {
    setPlaces((prev) => prev.filter((p) => p.type !== typeToDelete));
    resetPlaceForm();
  }, [setPlaces, resetPlaceForm]);

  const currentCity = places.find((p) => p.type === 'current');
  const hometown = places.find((p) => p.type === 'hometown');

  const renderPlaceForm = (type: PlaceType) => (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4 fade-in">
      <div className="space-y-3">
        <div>
          <label htmlFor={`place-country-${type}`} className="block text-sm font-medium text-gray-700 mb-1">
            {t('place.country')}
          </label>
          <select
            id={`place-country-${type}`}
            className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white focus:ring-2 focus:ring-fb-blue focus:border-transparent outline-none"
            value={newPlace.country}
            onChange={(e) => setNewPlace({ ...newPlace, country: e.target.value, city: '' })}
          >
            <option value="">{t('ph.selectCountry')}</option>
            {Object.keys(COUNTRIES_DATA).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`place-city-${type}`} className="block text-sm font-medium text-gray-700 mb-1">
            {t('ph.city')}
          </label>
          <select
            id={`place-city-${type}`}
            className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white focus:ring-2 focus:ring-fb-blue focus:border-transparent outline-none disabled:bg-gray-200"
            value={newPlace.city}
            onChange={(e) => setNewPlace({ ...newPlace, city: e.target.value })}
            disabled={!newPlace.country}
          >
            <option value="">{t('ph.selectCity')}</option>
            {newPlace.country &&
              COUNTRIES_DATA[newPlace.country]?.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
          </select>
        </div>

        <div className="pt-2 flex justify-start">
          <PrivacySelect
            id={`place-privacy-${type}`}
            value={newPlace.privacy}
            onChange={(val) => setNewPlace({ ...newPlace, privacy: val })}
          />
        </div>

        <FormActions
          onCancel={resetPlaceForm}
          onSave={handleSavePlace}
          onDelete={places.find((p) => p.type === type) ? () => handleDeletePlace(type) : undefined}
          saveDisabled={!newPlace.country || !newPlace.city}
          editingId={editingPlaceType}
          t={t}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <h4 className="font-bold text-[19px] mb-2 text-gray-900">{t('about.places')}</h4>

      {/* Current City Section */}
      <div className="mb-4">
        {currentCity && editingPlaceType !== 'current' ? (
          <div className="flex items-start gap-4 mb-4 group relative">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-fb-blue" />
            </div>
            <div className="flex-1">
              <div className="text-[16px] font-bold text-fb-blue">
                {currentCity.city}, {currentCity.country}
              </div>
              <div className="text-fb-blue font-medium text-[14px] flex items-center gap-2">
                {t('place.current')}
                <span aria-hidden="true">·</span>
                <PrivacyIcon type={currentCity.privacy} />
              </div>
            </div>
            {!readonly && (
              <button
                type="button"
                onClick={() => handleEditPlace(currentCity)}
                className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition"
                aria-label={t('btn.edit')}
              >
                <Pen className="w-5 h-5" />
              </button>
            )}
          </div>
        ) : editingPlaceType !== 'current' ? (
          !readonly && (
            <button
              type="button"
              onClick={() => setEditingPlaceType('current')}
              className="flex items-center gap-2 text-fb-blue hover:underline text-[15px] font-bold"
            >
              <Plus className="w-6 h-6 rounded-full bg-blue-50 p-1" />
              <span>{t('empty.currentCity')}</span>
            </button>
          )
        ) : (
          renderPlaceForm('current')
        )}
      </div>

      {/* Hometown Section */}
      <div className="mb-4">
        {hometown && editingPlaceType !== 'hometown' ? (
          <div className="flex items-start gap-4 mb-4 group relative">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Home className="w-5 h-5 text-fb-blue" />
            </div>
            <div className="flex-1">
              <div className="text-[16px] font-bold text-fb-blue">
                {hometown.city}, {hometown.country}
              </div>
              <div className="text-fb-blue font-medium text-[14px] flex items-center gap-2">
                {t('place.hometown')}
                <span aria-hidden="true">·</span>
                <PrivacyIcon type={hometown.privacy} />
              </div>
            </div>
            {!readonly && (
              <button
                type="button"
                onClick={() => handleEditPlace(hometown)}
                className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition"
                aria-label={t('btn.edit')}
              >
                <Pen className="w-5 h-5" />
              </button>
            )}
          </div>
        ) : editingPlaceType !== 'hometown' ? (
          !readonly && (
            <button
              type="button"
              onClick={() => setEditingPlaceType('hometown')}
              className="flex items-center gap-2 text-fb-blue hover:underline text-[15px] font-bold"
            >
              <Plus className="w-6 h-6 rounded-full bg-blue-50 p-1" />
              <span>{t('empty.hometown')}</span>
            </button>
          )
        ) : (
          renderPlaceForm('hometown')
        )}
      </div>
    </div>
  );
};

// Contact and Basic Info Section
interface ContactBasicInfoSectionProps {
  readonly: boolean;
  contactInfo: { mobile: { value: string; privacy: PrivacyLevel; }; email: { value: string; privacy: PrivacyLevel; }; };
  setContactInfo: React.Dispatch<React.SetStateAction<{ mobile: { value: string; privacy: PrivacyLevel; }; email: { value: string; privacy: PrivacyLevel; }; }>>;
  websites: Website[];
  setWebsites: React.Dispatch<React.SetStateAction<Website[]>>;
  socialLinks: SocialLink[];
  setSocialLinks: React.Dispatch<React.SetStateAction<SocialLink[]>>;
  basicInfo: { gender: { value: string; privacy: PrivacyLevel; }; birthDate: { day: string; month: string; year: string; privacy: PrivacyLevel; }; languages: { value: string[]; privacy: PrivacyLevel; }; };
  setBasicInfo: React.Dispatch<React.SetStateAction<{ gender: { value: string; privacy: PrivacyLevel; }; birthDate: { day: string; month: string; year: string; privacy: PrivacyLevel; }; languages: { value: string[]; privacy: PrivacyLevel; }; }>>;
  t: (key: string) => string;
}

const ContactBasicInfoSection: React.FC<ContactBasicInfoSectionProps> = ({
  readonly,
  contactInfo,
  setContactInfo,
  websites,
  setWebsites,
  socialLinks,
  setSocialLinks,
  basicInfo,
  setBasicInfo,
  t,
}) => {
  const [editingContact, setEditingContact] = useState<'mobile' | 'email' | null>(null);
  const [tempContact, setTempContact] = useState({ value: '', privacy: 'public' as PrivacyLevel });

  const [showWebsiteForm, setShowWebsiteForm] = useState(false);
  const [editingWebsiteId, setEditingWebsiteId] = useState<string | null>(null);
  const [newWebsite, setNewWebsite] = useState({ url: '', privacy: 'public' as PrivacyLevel });

  const [showSocialForm, setShowSocialForm] = useState(false);
  const [editingSocialId, setEditingSocialId] = useState<string | null>(null);
  const [newSocial, setNewSocial] = useState({ platform: '', url: '', privacy: 'public' as PrivacyLevel });

  const [editingBasic, setEditingBasic] = useState<'gender' | 'birthDate' | 'languages' | null>(null);
  const [tempGender, setTempGender] = useState({ value: '', privacy: 'public' as PrivacyLevel });
  const [tempBirthDate, setTempBirthDate] = useState({ day: '', month: '', year: '', privacy: 'public' as PrivacyLevel });
  const [tempLanguages, setTempLanguages] = useState({ value: [] as string[], privacy: 'public' as PrivacyLevel });

  const handleSaveContact = useCallback((field: 'mobile' | 'email') => {
    setContactInfo((prev) => ({ ...prev, [field]: tempContact }));
    setEditingContact(null);
  }, [tempContact, setContactInfo]);

  const resetWebsiteForm = useCallback(() => {
    setNewWebsite({ url: '', privacy: 'public' });
    setEditingWebsiteId(null);
    setShowWebsiteForm(false);
  }, []);

  const handleSaveWebsite = useCallback(() => {
    if (newWebsite.url) {
      if (editingWebsiteId) {
        setWebsites((prev) => prev.map((w) => (w.id === editingWebsiteId ? { ...newWebsite, id: editingWebsiteId } as Website : w)));
      } else {
        setWebsites((prev) => [...prev, { ...newWebsite, id: `website-${Date.now()}` }]);
      }
      resetWebsiteForm();
    }
  }, [newWebsite, editingWebsiteId, setWebsites, resetWebsiteForm]);

  const handleEditWebsite = useCallback((site: Website) => {
    setNewWebsite(site);
    setEditingWebsiteId(site.id);
    setShowWebsiteForm(true);
  }, []);

  const handleDeleteWebsite = useCallback((id: string) => {
    setWebsites((prev) => prev.filter((w) => w.id !== id));
    resetWebsiteForm();
  }, [setWebsites, resetWebsiteForm]);

  const resetSocialForm = useCallback(() => {
    setNewSocial({ platform: '', url: '', privacy: 'public' });
    setEditingSocialId(null);
    setShowSocialForm(false);
  }, []);

  const handleSaveSocial = useCallback(() => {
    if (newSocial.platform && newSocial.url) {
      if (editingSocialId) {
        setSocialLinks((prev) => prev.map((s) => (s.id === editingSocialId ? { ...newSocial, id: editingSocialId } as SocialLink : s)));
      } else {
        setSocialLinks((prev) => [...prev, { ...newSocial, id: `social-${Date.now()}` }]);
      }
      resetSocialForm();
    }
  }, [newSocial, editingSocialId, setSocialLinks, resetSocialForm]);

  const handleEditSocial = useCallback((social: SocialLink) => {
    setNewSocial(social);
    setEditingSocialId(social.id);
    setShowSocialForm(true);
  }, []);

  const handleDeleteSocial = useCallback((id: string) => {
    setSocialLinks((prev) => prev.filter((s) => s.id !== id));
    resetSocialForm();
  }, [setSocialLinks, resetSocialForm]);

  const handleSaveBasic = useCallback((field: 'gender' | 'birthDate' | 'languages') => {
    setBasicInfo((prev) => ({
      ...prev,
      [field]: field === 'gender' ? tempGender : field === 'birthDate' ? tempBirthDate : tempLanguages,
    }));
    setEditingBasic(null);
  }, [tempGender, tempBirthDate, tempLanguages, setBasicInfo]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Contact Info */}
      <div>
        <h4 className="font-bold text-[17px] mb-4 text-gray-900">{t('about.contact')}</h4>

        {/* Mobile */}
        <div className="mb-4 group">
          {editingContact === 'mobile' ? (
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <label htmlFor="contact-mobile" className="text-xs text-gray-500 mb-1 block">
                {t('contact.mobile')}
              </label>
              <input
                type="text"
                id="contact-mobile"
                className="w-full border p-2 rounded mb-2 text-sm"
                value={tempContact.value}
                onChange={(e) => setTempContact({ ...tempContact, value: e.target.value })}
                dir="ltr"
              />
              <div className="flex justify-between items-center">
                <PrivacySelect
                  id="contact-mobile-privacy"
                  value={tempContact.privacy}
                  onChange={(val) => setTempContact({ ...tempContact, privacy: val })}
                  small
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingContact(null)}
                    className="text-xs font-semibold px-2 py-1 bg-gray-200 rounded"
                  >
                    {t('btn.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveContact('mobile')}
                    className="text-xs font-semibold px-2 py-1 bg-fb-blue text-white rounded"
                  >
                    {t('btn.save')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 relative">
              <Phone className="w-5 h-5 text-fb-blue" />
              <div className="flex-1">
                {contactInfo.mobile.value ? (
                  <>
                    <div
                      className={`text-[15px] ${!readonly ? 'text-fb-blue font-bold cursor-pointer hover:underline' : 'text-fb-blue font-bold'}`}
                      onClick={() => !readonly && (() => { setTempContact(contactInfo.mobile); setEditingContact('mobile'); })()}
                    >
                      {contactInfo.mobile.value}
                    </div>
                    <div className="text-xs text-fb-blue font-medium flex items-center gap-1">
                      {t('contact.mobile')} <span aria-hidden="true">·</span>{' '}
                      <PrivacyIcon type={contactInfo.mobile.privacy} />
                    </div>
                  </>
                ) : !readonly ? (
                  <button
                    type="button"
                    onClick={() => { setTempContact(contactInfo.mobile); setEditingContact('mobile'); }}
                    className="text-[15px] text-fb-blue font-bold hover:underline"
                  >
                    {t('empty.addMobile')}
                  </button>
                ) : (
                  <div className="text-[15px] text-gray-400 italic">{t('no.mobile')}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Email */}
        <div className="mb-4 group">
          {editingContact === 'email' ? (
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <label htmlFor="contact-email" className="text-xs text-gray-500 mb-1 block">
                {t('contact.email')}
              </label>
              <input
                type="text"
                id="contact-email"
                className="w-full border p-2 rounded mb-2 text-sm"
                value={tempContact.value}
                onChange={(e) => setTempContact({ ...tempContact, value: e.target.value })}
              />
              <div className="flex justify-between items-center">
                <PrivacySelect
                  id="contact-email-privacy"
                  value={tempContact.privacy}
                  onChange={(val) => setTempContact({ ...tempContact, privacy: val })}
                  small
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingContact(null)}
                    className="text-xs font-semibold px-2 py-1 bg-gray-200 rounded"
                  >
                    {t('btn.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveContact('email')}
                    className="text-xs font-semibold px-2 py-1 bg-fb-blue text-white rounded"
                  >
                    {t('btn.save')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 relative">
              <Mail className="w-5 h-5 text-fb-blue" />
              <div className="flex-1">
                {contactInfo.email.value ? (
                  <>
                    <div
                      className={`text-[15px] ${!readonly ? 'text-fb-blue font-bold cursor-pointer hover:underline' : 'text-fb-blue font-bold'}`}
                      onClick={() => !readonly && (() => { setTempContact(contactInfo.email); setEditingContact('email'); })()}
                    >
                      {contactInfo.email.value}
                    </div>
                    <div className="text-xs text-fb-blue font-medium flex items-center gap-1">
                      {t('contact.email')} <span aria-hidden="true">·</span>{' '}
                      <PrivacyIcon type={contactInfo.email.privacy} />
                    </div>
                  </>
                ) : !readonly ? (
                  <button
                    type="button"
                    onClick={() => { setTempContact(contactInfo.email); setEditingContact('email'); }}
                    className="text-[15px] text-fb-blue font-bold hover:underline"
                  >
                    {t('empty.addEmail')}
                  </button>
                ) : (
                  <div className="text-[15px] text-gray-400 italic">{t('no.email')}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Websites */}
        <div className="mb-4">
          {websites.map((site) => (
            <div key={site.id} className="flex items-center gap-3 mb-3 group relative">
              <LinkIcon className="w-5 h-5 text-fb-blue" />
              <div className="flex-1">
                <a
                  href={site.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[15px] text-fb-blue hover:underline block truncate max-w-[200px] font-bold"
                >
                  {site.url}
                </a>
                <div className="text-xs text-fb-blue font-medium flex items-center gap-1">
                  {t('contact.website')} <span aria-hidden="true">·</span>{' '}
                  <PrivacyIcon type={site.privacy} />
                </div>
              </div>
              {!readonly && (
                <button
                  type="button"
                  onClick={() => handleEditWebsite(site)}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
                  aria-label={t('btn.edit')}
                >
                  <Pen className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {showWebsiteForm ? (
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-2">
              <label htmlFor="website-url" className="text-xs text-gray-500 mb-1 block">
                {t('contact.website')}
              </label>
              <input
                type="text"
                id="website-url"
                className="w-full border p-2 rounded mb-2 text-sm text-left"
                placeholder="https://..."
                value={newWebsite.url}
                onChange={(e) => setNewWebsite({ ...newWebsite, url: e.target.value })}
              />
              <div className="flex justify-between items-center">
                <PrivacySelect
                  id="website-privacy"
                  value={newWebsite.privacy}
                  onChange={(val) => setNewWebsite({ ...newWebsite, privacy: val })}
                  small
                />
              </div>
              <FormActions
                onCancel={resetWebsiteForm}
                onSave={handleSaveWebsite}
                onDelete={editingWebsiteId ? () => handleDeleteWebsite(editingWebsiteId) : undefined}
                saveDisabled={!newWebsite.url}
                editingId={editingWebsiteId}
                t={t}
              />
            </div>
          ) : (
            !readonly && (
              <button
                type="button"
                onClick={() => {
                  setNewWebsite({ url: '', privacy: 'public' });
                  setEditingWebsiteId(null);
                  setShowWebsiteForm(true);
                }}
                className="flex items-center gap-2 text-fb-blue hover:underline text-[15px] font-bold mt-1"
              >
                <Plus className="w-5 h-5 rounded-full bg-blue-50 p-1" />{' '}
                <span>{t('empty.addWebsite')}</span>
              </button>
            )
          )}
        </div>

        {/* Social Links */}
        <div className="mb-2">
          {socialLinks.map((link) => (
            <div key={link.id} className="flex items-center gap-3 mb-3 group relative">
              {getPlatformIcon(link.platform)}
              <div className="flex-1">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[15px] text-fb-blue hover:underline block font-bold"
                >
                  {link.platform}
                </a>
                <div className="text-xs text-fb-blue font-medium flex items-center gap-1">
                  {link.url} <span aria-hidden="true">·</span> <PrivacyIcon type={link.privacy} />
                </div>
              </div>
              {!readonly && (
                <button
                  type="button"
                  onClick={() => handleEditSocial(link)}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
                  aria-label={t('btn.edit')}
                >
                  <Pen className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {showSocialForm ? (
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-2">
              <div className="mb-2">
                <label htmlFor="social-platform" className="text-xs text-gray-500 mb-1 block">
                  {t('social.platform')}
                </label>
                <select
                  id="social-platform"
                  className="w-full border p-2 rounded text-sm bg-white"
                  value={newSocial.platform}
                  onChange={(e) => setNewSocial({ ...newSocial, platform: e.target.value })}
                >
                  <option value="">{t('ph.selectPlatform')}</option>
                  {SOCIAL_PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-2">
                <label htmlFor="social-url" className="text-xs text-gray-500 mb-1 block">
                  {t('social.linkOrUsername')}
                </label>
                <input
                  type="text"
                  id="social-url"
                  className="w-full border p-2 rounded text-sm text-left"
                  placeholder={t('ph.urlOrUsername')}
                  value={newSocial.url}
                  onChange={(e) => setNewSocial({ ...newSocial, url: e.target.value })}
                />
              </div>
              <div className="flex justify-between items-center">
                <PrivacySelect
                  id="social-privacy"
                  value={newSocial.privacy}
                  onChange={(val) => setNewSocial({ ...newSocial, privacy: val })}
                  small
                />
              </div>
              <FormActions
                onCancel={resetSocialForm}
                onSave={handleSaveSocial}
                onDelete={editingSocialId ? () => handleDeleteSocial(editingSocialId) : undefined}
                saveDisabled={!newSocial.platform || !newSocial.url}
                editingId={editingSocialId}
                t={t}
              />
            </div>
          ) : (
            !readonly && (
              <button
                type="button"
                onClick={() => {
                  setNewSocial({ platform: '', url: '', privacy: 'public' });
                  setEditingSocialId(null);
                  setShowSocialForm(true);
                }}
                className="flex items-center gap-2 text-fb-blue hover:underline text-[15px] font-bold mt-1"
              >
                <Plus className="w-5 h-5 rounded-full bg-blue-50 p-1" />{' '}
                <span>{t('empty.addSocial')}</span>
              </button>
            )
          )}
        </div>
      </div>

      <div className="border-t border-gray-200"></div>

      {/* Basic Info */}
      <div>
        <h4 className="font-bold text-[17px] mb-4 text-gray-900">{t('basic.info')}</h4>

        {/* Gender */}
        <div className="mb-4 group">
          {editingBasic === 'gender' ? (
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <label htmlFor="basic-gender" className="text-xs text-gray-500 mb-1 block">
                {t('basic.gender')}
              </label>
              <select
                id="basic-gender"
                className="w-full border p-2 rounded mb-2 text-sm bg-white"
                value={tempGender.value}
                onChange={(e) => setTempGender({ ...tempGender, value: e.target.value })}
              >
                <option value="">{t('ph.selectGender')}</option>
                <option value="ذكر">{t('gender.male')}</option>
                <option value="أنثى">{t('gender.female')}</option>
                <option value="مخصص">{t('gender.custom')}</option>
              </select>
              <div className="flex justify-between items-center">
                <PrivacySelect
                  id="basic-gender-privacy"
                  value={tempGender.privacy}
                  onChange={(val) => setTempGender({ ...tempGender, privacy: val })}
                  small
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingBasic(null)}
                    className="text-xs font-semibold px-2 py-1 bg-gray-200 rounded"
                  >
                    {t('btn.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveBasic('gender')}
                    className="text-xs font-semibold px-2 py-1 bg-fb-blue text-white rounded"
                  >
                    {t('btn.save')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 relative">
              <UserIcon className="w-5 h-5 text-fb-blue" />
              <div className="flex-1">
                {basicInfo.gender.value ? (
                  <>
                    <div
                      className={`text-[15px] ${!readonly ? 'text-fb-blue font-bold cursor-pointer hover:underline' : 'text-fb-blue font-bold'}`}
                      onClick={() => !readonly && (() => { setTempGender(basicInfo.gender); setEditingBasic('gender'); })()}
                    >
                      {basicInfo.gender.value}
                    </div>
                    <div className="text-xs text-fb-blue font-medium flex items-center gap-1">
                      {t('basic.gender')} <span aria-hidden="true">·</span>{' '}
                      <PrivacyIcon type={basicInfo.gender.privacy} />
                    </div>
                  </>
                ) : !readonly ? (
                  <button
                    type="button"
                    onClick={() => { setTempGender(basicInfo.gender); setEditingBasic('gender'); }}
                    className="text-[15px] text-fb-blue font-bold hover:underline"
                  >
                    {t('empty.addGender')}
                  </button>
                ) : (
                  <div className="text-[15px] text-gray-400 italic">{t('no.gender')}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Birth Date */}
        <div className="mb-4 group">
          {editingBasic === 'birthDate' ? (
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <label className="text-xs text-gray-500 mb-1 block">{t('basic.birth')}</label>
              <div className="flex gap-2 mb-2">
                <select
                  id="birth-day"
                  className="border p-1.5 rounded text-sm bg-white flex-1"
                  value={tempBirthDate.day}
                  onChange={(e) => setTempBirthDate({ ...tempBirthDate, day: e.target.value })}
                >
                  <option value="">{t('date.day')}</option>
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <select
                  id="birth-month"
                  className="border p-1.5 rounded text-sm bg-white flex-1"
                  value={tempBirthDate.month}
                  onChange={(e) => setTempBirthDate({ ...tempBirthDate, month: e.target.value })}
                >
                  <option value="">{t('date.month')}</option>
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  id="birth-year"
                  className="border p-1.5 rounded text-sm bg-white flex-1"
                  value={tempBirthDate.year}
                  onChange={(e) => setTempBirthDate({ ...tempBirthDate, year: e.target.value })}
                >
                  <option value="">{t('date.year')}</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-between items-center">
                <PrivacySelect
                  id="birthdate-privacy"
                  value={tempBirthDate.privacy}
                  onChange={(val) => setTempBirthDate({ ...tempBirthDate, privacy: val })}
                  small
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingBasic(null)}
                    className="text-xs font-semibold px-2 py-1 bg-gray-200 rounded"
                  >
                    {t('btn.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveBasic('birthDate')}
                    className="text-xs font-semibold px-2 py-1 bg-fb-blue text-white rounded"
                  >
                    {t('btn.save')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 relative">
              <Calendar className="w-5 h-5 text-fb-blue" />
              <div className="flex-1">
                {basicInfo.birthDate.year ? (
                  <>
                    <div
                      className={`text-[15px] ${!readonly ? 'text-fb-blue font-bold cursor-pointer hover:underline' : 'text-fb-blue font-bold'}`}
                      onClick={() => !readonly && (() => { setTempBirthDate(basicInfo.birthDate); setEditingBasic('birthDate'); })()}
                    >
                      {basicInfo.birthDate.day} {basicInfo.birthDate.month} {basicInfo.birthDate.year}
                    </div>
                    <div className="text-xs text-fb-blue font-medium flex items-center gap-1">
                      {t('basic.birth')} <span aria-hidden="true">·</span>{' '}
                      <PrivacyIcon type={basicInfo.birthDate.privacy} />
                    </div>
                  </>
                ) : !readonly ? (
                  <button
                    type="button"
                    onClick={() => { setTempBirthDate(basicInfo.birthDate); setEditingBasic('birthDate'); }}
                    className="text-[15px] text-fb-blue font-bold hover:underline"
                  >
                    {t('empty.addBirthDate')}
                  </button>
                ) : (
                  <div className="text-[15px] text-gray-400 italic">{t('no.birthDate')}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Languages */}
        <div className="mb-4 group">
          {editingBasic === 'languages' ? (
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <label htmlFor="basic-languages" className="text-xs text-gray-500 mb-1 block">
                {t('basic.languages')}
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tempLanguages.value.map((lang) => (
                  <span key={lang} className="bg-white border px-2 py-1 rounded text-sm flex items-center gap-1">
                    {lang}
                    <X
                      className="w-3 h-3 cursor-pointer text-red-500"
                      onClick={() =>
                        setTempLanguages({ ...tempLanguages, value: tempLanguages.value.filter((l) => l !== lang) })
                      }
                    />
                  </span>
                ))}
              </div>
              <select
                id="basic-languages"
                className="w-full border p-2 rounded mb-2 text-sm bg-white"
                onChange={(e) => {
                  if (e.target.value && !tempLanguages.value.includes(e.target.value)) {
                    setTempLanguages({ ...tempLanguages, value: [...tempLanguages.value, e.target.value] });
                  }
                }}
                value=""
              >
                <option value="">{t('ph.addLanguage')}</option>
                {LANGUAGES_LIST.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <div className="flex justify-between items-center">
                <PrivacySelect
                  id="languages-privacy"
                  value={tempLanguages.privacy}
                  onChange={(val) => setTempLanguages({ ...tempLanguages, privacy: val })}
                  small
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingBasic(null)}
                    className="text-xs font-semibold px-2 py-1 bg-gray-200 rounded"
                  >
                    {t('btn.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveBasic('languages')}
                    className="text-xs font-semibold px-2 py-1 bg-fb-blue text-white rounded"
                  >
                    {t('btn.save')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 relative">
              <Languages className="w-5 h-5 text-fb-blue" />
              <div className="flex-1">
                {basicInfo.languages.value.length > 0 ? (
                  <>
                    <div
                      className={`text-[15px] ${!readonly ? 'text-fb-blue font-bold cursor-pointer hover:underline' : 'text-fb-blue font-bold'}`}
                      onClick={() => !readonly && (() => { setTempLanguages(basicInfo.languages); setEditingBasic('languages'); })()}
                    >
                      {basicInfo.languages.value.join('، ')}
                    </div>
                    <div className="text-xs text-fb-blue font-medium flex items-center gap-1">
                      {t('basic.languages')} <span aria-hidden="true">·</span>{' '}
                      <PrivacyIcon type={basicInfo.languages.privacy} />
                    </div>
                  </>
                ) : !readonly ? (
                  <button
                    type="button"
                    onClick={() => { setTempLanguages(basicInfo.languages); setEditingBasic('languages'); }}
                    className="text-[15px] text-fb-blue font-bold hover:underline"
                  >
                    {t('empty.addLanguages')}
                  </button>
                ) : (
                  <div className="text-[15px] text-gray-400 italic">{t('no.languages')}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Family Section
interface FamilySectionProps {
  readonly: boolean;
  relationship: Relationship;
  setRelationship: React.Dispatch<React.SetStateAction<Relationship>>;
  familyMembers: FamilyMember[];
  setFamilyMembers: React.Dispatch<React.SetStateAction<FamilyMember[]>>;
  t: (key: string) => string;
}

const FamilySection: React.FC<FamilySectionProps> = ({
  readonly,
  relationship,
  setRelationship,
  familyMembers,
  setFamilyMembers,
  t,
}) => {
  const [editingRelationship, setEditingRelationship] = useState(false);
  const [tempRelationship, setTempRelationship] = useState<Relationship>({ status: '', privacy: 'public' });

  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null);
  const [newFamilyMember, setNewFamilyMember] = useState<Omit<FamilyMember, 'id'>>({ name: '', relation: '', privacy: 'public' });

  const handleSaveRelationship = useCallback(() => {
    setRelationship(tempRelationship);
    setEditingRelationship(false);
  }, [tempRelationship, setRelationship]);

  const resetFamilyForm = useCallback(() => {
    setNewFamilyMember({ name: '', relation: '', privacy: 'public' });
    setEditingFamilyId(null);
    setShowFamilyForm(false);
  }, []);

  const handleSaveFamilyMember = useCallback(() => {
    if (newFamilyMember.name && newFamilyMember.relation) {
      if (editingFamilyId) {
        setFamilyMembers((prev) => prev.map((f) => (f.id === editingFamilyId ? { ...newFamilyMember, id: editingFamilyId } as FamilyMember : f)));
      } else {
        setFamilyMembers((prev) => [...prev, { ...newFamilyMember, id: `family-${Date.now()}` }]);
      }
      resetFamilyForm();
    }
  }, [newFamilyMember, editingFamilyId, setFamilyMembers, resetFamilyForm]);

  const handleEditFamily = useCallback((member: FamilyMember) => {
    setNewFamilyMember(member);
    setEditingFamilyId(member.id);
    setShowFamilyForm(true);
  }, []);

  const handleDeleteFamily = useCallback((id: string) => {
    setFamilyMembers((prev) => prev.filter((f) => f.id !== id));
    resetFamilyForm();
  }, [setFamilyMembers, resetFamilyForm]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Relationship Status Section */}
      <div>
        <h4 className="font-bold text-[19px] mb-4 text-gray-900">{t('about.family')}</h4>

        {editingRelationship ? (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label htmlFor="relationship-status" className="block text-sm font-medium text-gray-700 mb-1">
              {t('relationship.status')}
            </label>
            <select
              id="relationship-status"
              className="w-full border p-2 rounded mb-3 text-sm bg-white"
              value={tempRelationship.status}
              onChange={(e) =>
                setTempRelationship({ ...tempRelationship, status: e.target.value, partner: '', year: '', month: '', day: '' })
              }
            >
              <option value="">{t('ph.selectStatus')}</option>
              {RELATIONSHIP_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {PARTNER_REQUIRED_STATUSES.includes(tempRelationship.status) && (
              <>
                <div className="mb-3">
                  <label htmlFor="relationship-partner" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('relationship.partner')}
                  </label>
                  <select
                    id="relationship-partner"
                    className="w-full border p-2 rounded text-sm bg-white"
                    value={tempRelationship.partner}
                    onChange={(e) => setTempRelationship({ ...tempRelationship, partner: e.target.value })}
                  >
                    <option value="">{t('ph.selectFriend')}</option>
                    {MOCK_FRIENDS_LIST.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('relationship.dateOptional')}
                  </label>
                  <div className="flex gap-2">
                    <select
                      id="relationship-day"
                      className="w-1/4 border p-2 rounded text-sm bg-white"
                      value={tempRelationship.day || ''}
                      onChange={(e) => setTempRelationship({ ...tempRelationship, day: e.target.value })}
                    >
                      <option value="">{t('date.day')}</option>
                      {DAYS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <select
                      id="relationship-month"
                      className="w-1/3 border p-2 rounded text-sm bg-white"
                      value={tempRelationship.month || ''}
                      onChange={(e) => setTempRelationship({ ...tempRelationship, month: e.target.value })}
                    >
                      <option value="">{t('date.month')}</option>
                      {MONTHS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <select
                      id="relationship-year"
                      className="flex-1 border p-2 rounded text-sm bg-white"
                      value={tempRelationship.year || ''}
                      onChange={(e) => setTempRelationship({ ...tempRelationship, year: e.target.value })}
                    >
                      <option value="">{t('date.year')}</option>
                      {YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-between items-center pt-2">
              <PrivacySelect
                id="relationship-privacy"
                value={tempRelationship.privacy}
                onChange={(val) => setTempRelationship({ ...tempRelationship, privacy: val })}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRelationship(false)}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-200 rounded-md text-sm font-semibold"
                >
                  {t('btn.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveRelationship}
                  className="px-4 py-1.5 bg-fb-blue text-white rounded-md text-sm font-semibold hover:bg-blue-700"
                >
                  {t('btn.save')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 group relative mb-4">
            <Heart className="w-6 h-6 text-fb-blue" />
            <div className="flex-1">
              {relationship.status ? (
                <>
                  <div
                    className={`text-[16px] ${!readonly ? 'text-fb-blue font-bold cursor-pointer hover:underline' : 'text-fb-blue font-bold'}`}
                    onClick={() => !readonly && (() => { setTempRelationship(relationship); setEditingRelationship(true); })()}
                  >
                    {relationship.status}
                    {relationship.partner && (
                      <span className={`${!readonly ? 'text-fb-blue' : 'text-gray-900'} font-normal`}>
                        {' '}{t('relationship.with')}{' '}
                        <span className="font-bold">{relationship.partner}</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-fb-blue font-medium flex items-center gap-1">
                    {relationship.year && (
                      <span>
                        {t('relationship.since')} {relationship.day ? `${relationship.day} ` : ''}
                        {relationship.month ? `${relationship.month} ` : ''}
                        {relationship.year}
                      </span>
                    )}
                    {relationship.year && <span aria-hidden="true">·</span>}
                    <PrivacyIcon type={relationship.privacy} />
                  </div>
                </>
              ) : !readonly ? (
                <button
                  type="button"
                  onClick={() => { setTempRelationship(relationship); setEditingRelationship(true); }}
                  className="text-[16px] text-fb-blue font-bold hover:underline"
                >
                  {t('empty.addRelationship')}
                </button>
              ) : (
                <div className="text-gray-400 italic">{t('no.relationship')}</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200"></div>

      {/* Family Members Section */}
      <div>
        <h4 className="font-bold text-[19px] mb-4 text-gray-900">{t('family.members')}</h4>

        {familyMembers.map((member) => (
          <div key={member.id} className="flex items-start gap-4 mb-4 group relative">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <UserIcon className="w-5 h-5 text-fb-blue" />
            </div>
            <div className="flex-1">
              <div className="text-[16px] font-bold text-fb-blue">{member.name}</div>
              <div className="text-fb-blue font-medium text-[14px] flex items-center gap-2">
                {member.relation}
                <span aria-hidden="true">·</span>
                <PrivacyIcon type={member.privacy} />
              </div>
            </div>
            {!readonly && (
              <button
                type="button"
                onClick={() => handleEditFamily(member)}
                className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition"
                aria-label={t('btn.edit')}
              >
                <Pen className="w-5 h-5" />
              </button>
            )}
          </div>
        ))}

        {!readonly &&
          (!showFamilyForm ? (
            <button
              type="button"
              onClick={() => {
                setNewFamilyMember({ name: '', relation: '', privacy: 'public' });
                setEditingFamilyId(null);
                setShowFamilyForm(true);
              }}
              className="flex items-center gap-2 text-fb-blue hover:underline text-[15px] font-bold mt-2"
            >
              <Plus className="w-6 h-6 rounded-full bg-blue-50 p-1" />
              <span>{t('empty.addFamilyMember')}</span>
            </button>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4 fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="md:col-span-2">
                  <label htmlFor="family-name" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('family.member')}
                  </label>
                  <select
                    id="family-name"
                    className="w-full border p-2 rounded text-sm bg-white"
                    value={newFamilyMember.name}
                    onChange={(e) => setNewFamilyMember({ ...newFamilyMember, name: e.target.value })}
                  >
                    <option value="">{t('ph.selectFriend')}</option>
                    {MOCK_FRIENDS_LIST.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="family-relation" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('family.relation')}
                  </label>
                  <select
                    id="family-relation"
                    className="w-full border p-2 rounded text-sm bg-white"
                    value={newFamilyMember.relation}
                    onChange={(e) => setNewFamilyMember({ ...newFamilyMember, relation: e.target.value })}
                  >
                    <option value="">{t('ph.selectRelation')}</option>
                    {FAMILY_RELATIONS_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <PrivacySelect
                  id="family-privacy"
                  value={newFamilyMember.privacy}
                  onChange={(val) => setNewFamilyMember({ ...newFamilyMember, privacy: val })}
                />
              </div>

              <FormActions
                onCancel={resetFamilyForm}
                onSave={handleSaveFamilyMember}
                onDelete={editingFamilyId ? () => handleDeleteFamily(editingFamilyId) : undefined}
                saveDisabled={!newFamilyMember.name || !newFamilyMember.relation}
                editingId={editingFamilyId}
                t={t}
              />
            </div>
          ))}
      </div>
    </div>
  );
};

// Details About You Section
interface DetailsAboutYouSectionProps {
  readonly: boolean;
  bio: { text: string; privacy: PrivacyLevel; };
  setBio: React.Dispatch<React.SetStateAction<{ text: string; privacy: PrivacyLevel; }>>;
  pronunciation: { text: string; privacy: PrivacyLevel; };
  setPronunciation: React.Dispatch<React.SetStateAction<{ text: string; privacy: PrivacyLevel; }>>;
  otherNames: OtherName[];
  setOtherNames: React.Dispatch<React.SetStateAction<OtherName[]>>;
  quotes: { text: string; privacy: PrivacyLevel; };
  setQuotes: React.Dispatch<React.SetStateAction<{ text: string; privacy: PrivacyLevel; }>>;
  bloodDonor: boolean;
  setBloodDonor: React.Dispatch<React.SetStateAction<boolean>>;
  t: (key: string) => string;
}

const DetailsAboutYouSection: React.FC<DetailsAboutYouSectionProps> = ({
  readonly,
  bio,
  setBio,
  pronunciation,
  setPronunciation,
  otherNames,
  setOtherNames,
  quotes,
  setQuotes,
  t,
}) => {
  const [editingBio, setEditingBio] = useState(false);
  const [tempBio, setTempBio] = useState({ text: '', privacy: 'public' as PrivacyLevel });

  const [editingPronunciation, setEditingPronunciation] = useState(false);
  const [tempPronunciation, setTempPronunciation] = useState('');

  const [showOtherNameForm, setShowOtherNameForm] = useState(false);
  const [editingOtherNameId, setEditingOtherNameId] = useState<string | null>(null);
  const [newOtherName, setNewOtherName] = useState<Omit<OtherName, 'id'>>({ name: '', type: OTHER_NAME_TYPES[0], privacy: 'public' });

  const [editingQuotes, setEditingQuotes] = useState(false);
  const [tempQuotes, setTempQuotes] = useState({ text: '', privacy: 'public' as PrivacyLevel });

  const handleSaveBio = useCallback(() => {
    setBio(tempBio);
    setEditingBio(false);
  }, [tempBio, setBio]);

  const handleSavePronunciation = useCallback(() => {
    setPronunciation({ ...pronunciation, text: tempPronunciation });
    setEditingPronunciation(false);
  }, [tempPronunciation, setPronunciation, pronunciation]);

  const resetOtherNameForm = useCallback(() => {
    setNewOtherName({ name: '', type: OTHER_NAME_TYPES[0], privacy: 'public' });
    setEditingOtherNameId(null);
    setShowOtherNameForm(false);
  }, []);

  const handleSaveOtherName = useCallback(() => {
    if (newOtherName.name) {
      if (editingOtherNameId) {
        setOtherNames((prev) => prev.map((n) => (n.id === editingOtherNameId ? { ...newOtherName, id: editingOtherNameId } as OtherName : n)));
      } else {
        setOtherNames((prev) => [...prev, { ...newOtherName, id: `othername-${Date.now()}` }]);
      }
      resetOtherNameForm();
    }
  }, [newOtherName, editingOtherNameId, setOtherNames, resetOtherNameForm]);

  const handleEditOtherName = useCallback((name: OtherName) => {
    setNewOtherName(name);
    setEditingOtherNameId(name.id);
    setShowOtherNameForm(true);
  }, []);

  const handleDeleteOtherName = useCallback((id: string) => {
    setOtherNames((prev) => prev.filter((n) => n.id !== id));
    resetOtherNameForm();
  }, [setOtherNames, resetOtherNameForm]);

  const handleSaveQuotes = useCallback(() => {
    setQuotes(tempQuotes);
    setEditingQuotes(false);
  }, [tempQuotes, setQuotes]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Bio */}
      <div>
        <h4 className="font-bold text-[19px] mb-4 text-gray-900">{t('about.details')}</h4>
        {editingBio ? (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <textarea
              id="bio-text"
              className="w-full border p-2 rounded mb-2 text-sm h-24 resize-none focus:ring-2 focus:ring-fb-blue focus:border-transparent outline-none"
              placeholder={t('ph.descSelf')}
              value={tempBio.text}
              onChange={(e) => setTempBio({ ...tempBio, text: e.target.value })}
            />
            <div className="flex justify-between items-center">
              <PrivacySelect
                id="bio-privacy"
                value={tempBio.privacy}
                onChange={(val) => setTempBio({ ...tempBio, privacy: val })}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBio(false)}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-200 rounded-md text-sm font-semibold"
                >
                  {t('btn.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveBio}
                  className="px-4 py-1.5 bg-fb-blue text-white rounded-md text-sm font-semibold hover:bg-blue-700"
                >
                  {t('btn.save')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 group relative mb-4">
            <div className="text-center w-full">
              {bio.text ? (
                <div className="text-[15px] text-fb-blue font-bold text-center mb-1">
                  {bio.text}
                </div>
              ) : (
                !readonly && (
                  <button
                    type="button"
                    onClick={() => { setTempBio(bio); setEditingBio(true); }}
                    className="text-fb-blue hover:underline font-bold"
                  >
                    {t('empty.addBio')}
                  </button>
                )
              )}
              {!readonly && bio.text && (
                <div className="flex justify-center items-center gap-1">
                  <PrivacyIcon type={bio.privacy} />
                  <button
                    type="button"
                    onClick={() => { setTempBio(bio); setEditingBio(true); }}
                    className="text-xs text-fb-blue hover:underline"
                  >
                    {t('btn.edit')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200"></div>

      {/* Name Pronunciation */}
      <div>
        <h4 className="font-bold text-[19px] mb-2 text-gray-900">{t('details.pronounce')}</h4>
        {editingPronunciation ? (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label htmlFor="pronunciation-text" className="text-xs text-gray-500 mb-1 block">
              {t('details.howToPronounce')}
            </label>
            <input
              type="text"
              id="pronunciation-text"
              className="w-full border p-2 rounded mb-2 text-sm"
              placeholder={t('ph.pronounce')}
              value={tempPronunciation}
              onChange={(e) => setTempPronunciation(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingPronunciation(false)}
                className="px-3 py-1.5 text-gray-600 hover:bg-gray-200 rounded-md text-sm font-semibold"
              >
                {t('btn.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSavePronunciation}
                className="px-4 py-1.5 bg-fb-blue text-white rounded-md text-sm font-semibold hover:bg-blue-700"
              >
                {t('btn.save')}
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            {pronunciation.text ? (
              <div className="flex items-center gap-3 group relative">
                <Mic className="w-6 h-6 text-fb-blue" />
                <div className="flex-1">
                  <div className="text-[16px] text-fb-blue font-bold">{pronunciation.text}</div>
                  <div className="text-xs text-fb-blue font-medium flex items-center gap-1">
                    {t('details.pronounce')} <span aria-hidden="true">·</span>{' '}
                    <PrivacyIcon type={pronunciation.privacy} />
                  </div>
                </div>
                {!readonly && (
                  <button
                    type="button"
                    onClick={() => { setTempPronunciation(pronunciation.text); setEditingPronunciation(true); }}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
                    aria-label={t('btn.edit')}
                  >
                    <Pen className="w-5 h-5" />
                  </button>
                )}
              </div>
            ) : !readonly ? (
              <button
                type="button"
                onClick={() => setEditingPronunciation(true)}
                className="flex items-center gap-2 text-fb-blue hover:underline text-[15px] font-bold"
              >
                <Plus className="w-6 h-6 rounded-full bg-blue-50 p-1" />
                <span>{t('empty.addPronunciation')}</span>
              </button>
            ) : null}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200"></div>

      {/* Other Names */}
      <div>
        <h4 className="font-bold text-[19px] mb-4 text-gray-900">{t('details.otherNames')}</h4>

        {otherNames.map((name) => (
          <div key={name.id} className="flex items-center gap-3 mb-3 group relative">
            <PenLine className="w-6 h-6 text-fb-blue" />
            <div className="flex-1">
              <div className="text-[16px] text-fb-blue font-bold">{name.name}</div>
              <div className="text-xs text-fb-blue font-medium flex items-center gap-1">
                {name.type} <span aria-hidden="true">·</span> <PrivacyIcon type={name.privacy} />
              </div>
            </div>
            {!readonly && (
              <button
                type="button"
                onClick={() => handleEditOtherName(name)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
                aria-label={t('btn.edit')}
              >
                <Pen className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        {showOtherNameForm ? (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2 fade-in">
            <div className="mb-3">
              <label htmlFor="othername-type" className="text-xs text-gray-500 mb-1 block">
                {t('otherName.type')}
              </label>
              <select
                id="othername-type"
                className="w-full border p-2 rounded text-sm bg-white"
                value={newOtherName.type}
                onChange={(e) => setNewOtherName({ ...newOtherName, type: e.target.value })}
              >
                {OTHER_NAME_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label htmlFor="othername-name" className="text-xs text-gray-500 mb-1 block">
                {t('otherName.name')}
              </label>
              <input
                type="text"
                id="othername-name"
                className="w-full border p-2 rounded text-sm"
                value={newOtherName.name}
                onChange={(e) => setNewOtherName({ ...newOtherName, name: e.target.value })}
              />
            </div>
            <div className="flex justify-between items-center pt-2">
              <PrivacySelect
                id="othername-privacy"
                value={newOtherName.privacy}
                onChange={(val) => setNewOtherName({ ...newOtherName, privacy: val })}
              />
            </div>
            <FormActions
              onCancel={resetOtherNameForm}
              onSave={handleSaveOtherName}
              onDelete={editingOtherNameId ? () => handleDeleteOtherName(editingOtherNameId) : undefined}
              saveDisabled={!newOtherName.name}
              editingId={editingOtherNameId}
              t={t}
            />
          </div>
        ) : (
          !readonly && (
            <button
              type="button"
              onClick={() => {
                setNewOtherName({ name: '', type: OTHER_NAME_TYPES[0], privacy: 'public' });
                setEditingOtherNameId(null);
                setShowOtherNameForm(true);
              }}
              className="flex items-center gap-2 text-fb-blue hover:underline text-[15px] font-bold"
            >
              <Plus className="w-6 h-6 rounded-full bg-blue-50 p-1" />
              <span>{t('empty.addOtherName')}</span>
            </button>
          )
        )}
      </div>

      <div className="border-t border-gray-200"></div>

      {/* Favorite Quotes */}
      <div>
        <h4 className="font-bold text-[19px] mb-4 text-gray-900">{t('details.quotes')}</h4>
        {editingQuotes ? (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <textarea
              id="quotes-text"
              className="w-full border p-2 rounded mb-2 text-sm h-24 resize-none focus:ring-2 focus:ring-fb-blue focus:border-transparent outline-none"
              placeholder={t('ph.quote')}
              value={tempQuotes.text}
              onChange={(e) => setTempQuotes({ ...tempQuotes, text: e.target.value })}
            />
            <div className="flex justify-between items-center">
              <PrivacySelect
                id="quotes-privacy"
                value={tempQuotes.privacy}
                onChange={(val) => setTempQuotes({ ...tempQuotes, privacy: val })}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingQuotes(false)}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-200 rounded-md text-sm font-semibold"
                >
                  {t('btn.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuotes}
                  className="px-4 py-1.5 bg-fb-blue text-white rounded-md text-sm font-semibold hover:bg-blue-700"
                >
                  {t('btn.save')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            {quotes.text ? (
              <div className="group relative">
                <div className="text-[15px] text-fb-blue font-bold italic font-serif border-r-4 border-gray-300 pr-3 py-1">
                  "{quotes.text}"
                </div>
                <div className="text-xs text-fb-blue font-medium flex items-center gap-1 mt-1 pr-3">
                  <PrivacyIcon type={quotes.privacy} />
                </div>
                {!readonly && (
                  <button
                    type="button"
                    onClick={() => { setTempQuotes(quotes); setEditingQuotes(true); }}
                    className="hidden group-hover:block absolute top-0 left-0 p-1 text-gray-500 hover:bg-gray-100 rounded-full"
                    aria-label={t('btn.edit')}
                  >
                    <Pen className="w-5 h-5" />
                  </button>
                )}
              </div>
            ) : !readonly ? (
              <button
                type="button"
                onClick={() => { setTempQuotes(quotes); setEditingQuotes(true); }}
                className="flex items-center gap-2 text-fb-blue hover:underline text-[15px] font-bold"
              >
                <Plus className="w-6 h-6 rounded-full bg-blue-50 p-1" />
                <span>{t('empty.addQuotes')}</span>
              </button>
            ) : null}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200"></div>

      {/* Blood Donation */}
      <div>
        <h4 className="font-bold text-[19px] mb-4 text-gray-900">{t('details.bloodDonation')}</h4>
        <div className="flex items-center gap-4 bg-red-50 p-3 rounded-lg border border-red-100">
          <div className="bg-red-500 rounded-full p-2">
            <Droplet className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900">{t('blood.learnAboutDonation')}</div>
            <div className="text-xs text-gray-500">{t('blood.saveLives')}</div>
          </div>
          <button type="button" className="text-sm bg-white border border-gray-300 px-3 py-1.5 rounded-md font-semibold hover:bg-gray-50 transition">
            {t('btn.viewMore')}
          </button>
        </div>
      </div>
    </div>
  );
};

// Life Events Section
interface LifeEventsSectionProps {
  readonly: boolean;
  lifeEvents: LifeEvent[];
  setLifeEvents: React.Dispatch<React.SetStateAction<LifeEvent[]>>;
  t: (key: string) => string;
}

const LifeEventsSection: React.FC<LifeEventsSectionProps> = ({
  readonly,
  lifeEvents,
  setLifeEvents,
  t,
}) => {
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState<Omit<LifeEvent, 'id'>>({
    title: '',
    location: '',
    description: '',
    year: '',
    privacy: 'public',
  });

  const resetEventForm = useCallback(() => {
    setNewEvent({ title: '', location: '', description: '', year: '', privacy: 'public' });
    setEditingEventId(null);
    setShowEventForm(false);
  }, []);

  const handleSaveEvent = useCallback(() => {
    if (newEvent.title && newEvent.year) {
      if (editingEventId) {
        setLifeEvents((prev) => prev.map((e) => (e.id === editingEventId ? { ...newEvent, id: editingEventId } as LifeEvent : e)));
      } else {
        setLifeEvents((prev) => [...prev, { ...newEvent, id: `event-${Date.now()}` }]);
      }
      resetEventForm();
    }
  }, [newEvent, editingEventId, setLifeEvents, resetEventForm]);

  const handleEditEvent = useCallback((event: LifeEvent) => {
    setNewEvent(event);
    setEditingEventId(event.id);
    setShowEventForm(true);
  }, []);

  const handleDeleteEvent = useCallback((id: string) => {
    setLifeEvents((prev) => prev.filter((e) => e.id !== id));
    resetEventForm();
  }, [setLifeEvents, resetEventForm]);

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h4 className="font-bold text-[19px] mb-4 text-gray-900">{t('about.events')}</h4>

        {lifeEvents.map((event) => (
          <div key={event.id} className="flex items-start gap-4 mb-4 group relative">
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
              <Star className="w-5 h-5 text-fb-blue" />
            </div>
            <div className="flex-1">
              <div className="text-[16px] font-bold text-fb-blue">{event.title}</div>
              <div className="text-sm text-fb-blue font-medium">
                {event.location} • {event.year}
              </div>
              {event.description && <div className="text-sm text-fb-blue font-medium mt-1">{event.description}</div>}
              <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <PrivacyIcon type={event.privacy} />
              </div>
            </div>
            {!readonly && (
              <button
                type="button"
                onClick={() => handleEditEvent(event)}
                className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition"
                aria-label={t('btn.edit')}
              >
                <Pen className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        {!readonly &&
          (!showEventForm ? (
            <button
              type="button"
              onClick={() => {
                setNewEvent({ title: '', location: '', description: '', year: '', privacy: 'public' });
                setEditingEventId(null);
                setShowEventForm(true);
              }}
              className="flex items-center gap-2 text-fb-blue hover:underline text-[15px] font-bold"
            >
              <Plus className="w-6 h-6 rounded-full bg-blue-50 p-1" />
              <span>{t('empty.addEvent')}</span>
            </button>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4 fade-in">
              <div className="space-y-3">
                <div>
                  <label htmlFor="event-title" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('event.name')}
                  </label>
                  <input
                    type="text"
                    id="event-title"
                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-fb-blue focus:border-transparent outline-none"
                    placeholder={t('ph.eventExample')}
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="event-location" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('event.address')}
                    </label>
                    <input
                      type="text"
                      id="event-location"
                      className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-fb-blue focus:border-transparent outline-none"
                      placeholder={t('ph.cityOrPlace')}
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="event-year" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('event.year')}
                    </label>
                    <select
                      id="event-year"
                      className="w-full border p-2 rounded text-sm bg-white focus:ring-2 focus:ring-fb-blue focus:border-transparent outline-none"
                      value={newEvent.year}
                      onChange={(e) => setNewEvent({ ...newEvent, year: e.target.value })}
                    >
                      <option value="">{t('ph.selectYear')}</option>
                      {YEARS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="event-description" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('event.description')}
                  </label>
                  <textarea
                    id="event-description"
                    className="w-full border p-2 rounded text-sm h-20 resize-none focus:ring-2 focus:ring-fb-blue focus:border-transparent outline-none"
                    placeholder={t('ph.addMoreDetails')}
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <PrivacySelect
                    id="event-privacy"
                    value={newEvent.privacy}
                    onChange={(val) => setNewEvent({ ...newEvent, privacy: val })}
                  />
                </div>

                <FormActions
                  onCancel={resetEventForm}
                  onSave={handleSaveEvent}
                  onDelete={editingEventId ? () => handleDeleteEvent(editingEventId) : undefined}
                  saveDisabled={!newEvent.title || !newEvent.year}
                  editingId={editingEventId}
                  t={t}
                />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

const ProfileAbout: React.FC<ProfileAboutProps> = ({ currentUser, readonly = false }) => {
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState<SectionType>('overview');

  // --- Initial Empty State for All Sections ---
  const [works, setWorks] = useState<Work[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [schools, setSchools] = useState<School[]>([]);

  const [places, setPlaces] = useState<Place[]>([]);

  const [contactInfo, setContactInfo] = useState({
    mobile: { value: '', privacy: 'public' as PrivacyLevel },
    email: { value: '', privacy: 'public' as PrivacyLevel },
  });

  const [websites, setWebsites] = useState<Website[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  const [basicInfo, setBasicInfo] = useState({
    gender: { value: '', privacy: 'public' as PrivacyLevel },
    birthDate: { day: '', month: '', year: '', privacy: 'public' as PrivacyLevel },
    languages: { value: [] as string[], privacy: 'public' as PrivacyLevel },
  });

  const [relationship, setRelationship] = useState<Relationship>({ status: '', privacy: 'public' });
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

  const [bio, setBio] = useState({ text: '', privacy: 'public' as PrivacyLevel });
  const [pronunciation, setPronunciation] = useState({ text: '', privacy: 'public' as PrivacyLevel });
  const [otherNames, setOtherNames] = useState<OtherName[]>([]);
  const [quotes, setQuotes] = useState({ text: '', privacy: 'public' as PrivacyLevel });
  const [bloodDonor, setBloodDonor] = useState(false);

  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>([]);

  // Effect to initialize state from currentUser data
  useEffect(() => {
    if (currentUser && currentUser.about) {
      const aboutData = currentUser.about as UserAboutData; // Assume currentUser.about matches UserAboutData
      setWorks(aboutData.works || []);
      setUniversities(aboutData.universities || []);
      setSchools(aboutData.schools || []);
      setPlaces(aboutData.places || []);
      if (aboutData.contactInfo) setContactInfo(aboutData.contactInfo);
      setWebsites(aboutData.websites || []);
      setSocialLinks(aboutData.socialLinks || []);
      if (aboutData.basicInfo) setBasicInfo(aboutData.basicInfo);
      if (aboutData.relationship) setRelationship(aboutData.relationship);
      setFamilyMembers(aboutData.familyMembers || []);
      if (aboutData.bio) setBio(aboutData.bio);
      if (aboutData.pronunciation) setPronunciation(aboutData.pronunciation);
      setOtherNames(aboutData.otherNames || []);
      if (aboutData.quotes) setQuotes(aboutData.quotes);
      if (typeof aboutData.bloodDonor === 'boolean') setBloodDonor(aboutData.bloodDonor);
      setLifeEvents(aboutData.lifeEvents || []);
    }
  }, [currentUser]);

  const sections = [
    { id: 'overview', label: t('about.overview'), icon: <Globe className="w-5 h-5" /> },
    { id: 'work', label: t('about.workEdu'), icon: <Briefcase className="w-5 h-5" /> },
    { id: 'places', label: t('about.places'), icon: <MapPin className="w-5 h-5" /> },
    { id: 'contact', label: t('about.contact'), icon: <Phone className="w-5 h-5" /> },
    { id: 'family', label: t('about.family'), icon: <Heart className="w-5 h-5" /> },
    { id: 'details', label: t('about.details'), icon: <Info className="w-5 h-5" /> },
    { id: 'events', label: t('about.events'), icon: <Star className="w-5 h-5" /> },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        const hasDetails = works.length > 0 || universities.length > 0 || schools.length > 0 || places.length > 0 || relationship.status || contactInfo.mobile.value || familyMembers.length > 0 || lifeEvents.length > 0 || otherNames.length > 0 || bio.text;

        return (
          <div className="space-y-6 animate-fadeIn text-gray-800">
            {/* Bio */}
            {bio.text && (
               <div className="text-center mb-6">
                   <div className="text-lg font-bold text-fb-blue leading-relaxed">{bio.text}</div>
               </div>
            )}

            {/* Work */}
            {works.map(work => (
                <div key={work.id} className="flex items-center gap-3">
                  <Briefcase className="w-6 h-6 text-fb-blue" />
                  <div>
                    <span className="text-fb-blue font-medium">{t('work.worksAt')} </span>
                    <span className="font-bold text-fb-blue">{work.role}</span>
                    <span className="text-fb-blue font-medium"> {t('work.roleAt')} </span>
                    <span className="font-bold text-fb-blue">{work.company}</span>
                  </div>
                </div>
            ))}

            {/* Education - Uni */}
            {universities.map(uni => (
                <div key={uni.id} className="flex items-center gap-3">
                  <GraduationCap className="w-6 h-6 text-fb-blue" />
                  <div>
                    <span className="text-fb-blue font-medium">{t('edu.studied')} </span>
                    <span className="font-bold text-fb-blue">{uni.major}</span>
                    <span className="text-fb-blue font-medium"> {t('edu.at')} </span>
                    <span className="font-bold text-fb-blue">{uni.name}</span>
                    {uni.degree && <span className="text-fb-blue font-medium"> ({uni.degree})</span>}
                  </div>
                </div>
            ))}

            {/* Education - School */}
            {schools.map(school => (
                <div key={school.id} className="flex items-center gap-3">
                  <GraduationCap className="w-6 h-6 text-fb-blue" />
                  <div>
                    <span className="text-fb-blue font-medium">{t('edu.school')} </span>
                    <span className="font-bold text-fb-blue">{school.name}</span>
                    {school.year && <span className="text-fb-blue font-medium"> {t('edu.graduated')} {school.year}</span>}
                  </div>
                </div>
            ))}

            {/* Places */}
            {places.map(place => (
                <div key={place.id} className="flex items-center gap-3">
                  {place.type === 'current' ? <Home className="w-6 h-6 text-fb-blue" /> : <MapPin className="w-6 h-6 text-fb-blue" />}
                  <div>
                    <span className="text-fb-blue font-medium">{place.type === 'current' ? t('place.livesIn') : t('place.from')} </span>
                    <span className="font-bold text-fb-blue">{place.city}, {place.country}</span>
                  </div>
                </div>
            ))}

            {/* Relationship */}
            {relationship.status && (
                <div className="flex items-center gap-3">
                    <Heart className="w-6 h-6 text-fb-blue" />
                    <div>
                        <span className="font-bold text-fb-blue">{relationship.status}</span>
                        {relationship.partner && <span className="text-fb-blue font-medium"> {t('relationship.with')} <span className="font-bold text-fb-blue">{relationship.partner}</span></span>}
                        {relationship.year && <span className="text-fb-blue font-medium"> {t('relationship.since')} {relationship.year}</span>}
                    </div>
                </div>
            )}

            {/* Family */}
            {familyMembers.length > 0 && (
               <div className="border-t pt-4 mt-2">
                   <h5 className="font-bold mb-2 text-gray-900">{t('family.members')}</h5>
                   {familyMembers.map(member => (
                       <div key={member.id} className="flex items-center gap-3 mb-2">
                           <UserIcon className="w-5 h-5 text-fb-blue" />
                           <span className="text-fb-blue font-bold">{member.name} ({member.relation})</span>
                       </div>
                   ))}
               </div>
            )}

            {/* Contact Info Group */}
            <div className="border-t pt-4 mt-2">
                <h5 className="font-bold mb-2 text-gray-900">{t('about.contact')}</h5>
                {contactInfo.mobile.value && (
                     <div className="flex items-center gap-3 mb-2">
                        <Phone className="w-5 h-5 text-fb-blue" />
                        <span dir="ltr" className="text-fb-blue font-bold">{contactInfo.mobile.value}</span>
                        <span className="text-xs text-fb-blue font-medium">{t('contact.mobile')}</span>
                    </div>
                )}
                {contactInfo.email.value && (
                     <div className="flex items-center gap-3 mb-2">
                        <Mail className="w-5 h-5 text-fb-blue" />
                        <span className="text-fb-blue font-bold">{contactInfo.email.value}</span>
                    </div>
                )}
                 {websites.map(site => (
                    <div key={site.id} className="flex items-center gap-3 mb-2">
                        <LinkIcon className="w-5 h-5 text-fb-blue" />
                        <a href={site.url} target="_blank" rel="noreferrer" className="text-fb-blue hover:underline font-bold">{site.url}</a>
                    </div>
                 ))}
                 {socialLinks.map(link => (
                    <div key={link.id} className="flex items-center gap-3 mb-2">
                       {getPlatformIcon(link.platform)}
                       <a href={link.url} target="_blank" rel="noreferrer" className="text-fb-blue hover:underline font-bold">{link.platform}</a>
                    </div>
                 ))}
            </div>

            {/* Basic Info Group */}
            <div className="border-t pt-4 mt-2">
                <h5 className="font-bold mb-2 text-gray-900">{t('basic.info')}</h5>
                {basicInfo.gender.value && (
                     <div className="flex items-center gap-3 mb-2">
                        <UserIcon className="w-5 h-5 text-fb-blue" />
                        <span className="text-fb-blue font-bold">{basicInfo.gender.value}</span>
                    </div>
                )}
                {basicInfo.birthDate.year && (
                     <div className="flex items-center gap-3 mb-2">
                        <Calendar className="w-5 h-5 text-fb-blue" />
                        <span className="text-fb-blue font-bold">{basicInfo.birthDate.day} {basicInfo.birthDate.month} {basicInfo.birthDate.year}</span>
                     </div>
                )}
                {basicInfo.languages.value.length > 0 && (
                     <div className="flex items-center gap-3 mb-2">
                        <Languages className="w-5 h-5 text-fb-blue" />
                        <span className="text-fb-blue font-bold">{basicInfo.languages.value.join('، ')}</span>
                     </div>
                )}
            </div>

            {/* Other Details */}
             {(pronunciation.text || otherNames.length > 0 || quotes.text) && (
                  <div className="border-t pt-4 mt-2">
                       <h5 className="font-bold mb-2 text-gray-900">{t('about.details')}</h5>
                       {pronunciation.text && (
                           <div className="flex items-center gap-3 mb-2">
                               <Mic className="w-5 h-5 text-fb-blue" />
                               <span className="text-fb-blue font-bold">{t('details.pronounce')}: {pronunciation.text}</span>
                           </div>
                       )}
                       {otherNames.map(n => (
                           <div key={n.id} className="flex items-center gap-3 mb-2">
                               <PenLine className="w-5 h-5 text-fb-blue" />
                               <span className="text-fb-blue font-bold">{n.name} ({n.type})</span>
                           </div>
                       ))}
                       {quotes.text && (
                            <div className="flex items-center gap-3 mb-2">
                               <Quote className="w-5 h-5 text-fb-blue" />
                               <span className="italic text-fb-blue font-bold">"{quotes.text}"</span>
                           </div>
                       )}
                  </div>
             )}

             {lifeEvents.length > 0 && (
                 <div className="border-t pt-4 mt-2">
                      <h5 className="font-bold mb-2 text-gray-900">{t('about.events')}</h5>
                      {lifeEvents.map(ev => (
                          <div key={ev.id} className="flex items-center gap-3 mb-3">
                               <Star className="w-5 h-5 text-fb-blue" />
                               <div>
                                   <div className="font-bold text-fb-blue">{ev.title}</div>
                                   <div className="text-sm text-fb-blue font-medium">{ev.year} - {ev.location}</div>
                               </div>
                          </div>
                      ))}
                 </div>
             )}

             {!hasDetails && (
                <div className="text-gray-500 text-center py-10 flex flex-col items-center">
                    <Info className="w-10 h-10 mb-2 text-gray-300" />
                    <p>{t('no.details')}</p>
                </div>
            )}
          </div>
        );
      case 'work':
        return (
          <WorkEducationSection
            readonly={readonly}
            works={works}
            setWorks={setWorks}
            universities={universities}
            setUniversities={setUniversities}
            schools={schools}
            setSchools={setSchools}
            t={t}
          />
        );
      case 'places':
        return <PlacesSection readonly={readonly} places={places} setPlaces={setPlaces} t={t} />;
      case 'contact':
        return (
          <ContactBasicInfoSection
            readonly={readonly}
            contactInfo={contactInfo}
            setContactInfo={setContactInfo}
            websites={websites}
            setWebsites={setWebsites}
            socialLinks={socialLinks}
            setSocialLinks={setSocialLinks}
            basicInfo={basicInfo}
            setBasicInfo={setBasicInfo}
            t={t}
          />
        );
      case 'family':
        return (
          <FamilySection
            readonly={readonly}
            relationship={relationship}
            setRelationship={setRelationship}
            familyMembers={familyMembers}
            setFamilyMembers={setFamilyMembers}
            t={t}
          />
        );
      case 'details':
        return (
          <DetailsAboutYouSection
            readonly={readonly}
            bio={bio}
            setBio={setBio}
            pronunciation={pronunciation}
            setPronunciation={setPronunciation}
            otherNames={otherNames}
            setOtherNames={setOtherNames}
            quotes={quotes}
            setQuotes={setQuotes}
            bloodDonor={bloodDonor}
            setBloodDonor={setBloodDonor}
            t={t}
          />
        );
      case 'events':
        return <LifeEventsSection readonly={readonly} lifeEvents={lifeEvents} setLifeEvents={setLifeEvents} t={t} />;
      default:
        return (
            <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                <Info className="w-12 h-12 mb-2 text-gray-300" />
                <p>{t('no.details')}</p>
            </div>
        );
    }
  };

  return (
    <div className="bg-white shadow-sm rounded-lg flex flex-col md:flex-row min-h-[500px] overflow-hidden">
      {/* Sidebar (Right side in RTL) */}
      <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-l border-gray-200 p-2">
        <h2 className="text-xl font-bold p-3 mb-2">{t('profile.about')}</h2>
        <ul className="space-y-1">
          {sections.map((section) => (
            <li
              key={section.id}
              onClick={() => setActiveSection(section.id as SectionType)}
              className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition font-medium text-[15px] ${activeSection === section.id ? 'bg-blue-50 text-fb-blue' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <span>{section.label}</span>
              {activeSection === section.id && (
                  <div className="w-1 h-full bg-transparent"></div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 md:p-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default ProfileAbout;