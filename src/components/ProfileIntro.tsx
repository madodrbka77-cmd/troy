import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Search, X, Check, Loader2, AlertCircle } from 'lucide-react';
import DOMPurify from 'dompurify';
import { Photo as GlobalPhoto, User as GlobalUser } from '../types';

// --- Extended Types Definition ---

// Extend the global User type to include profile-specific fields used in this component
interface ExtendedUser extends GlobalUser {
  bio?: string;
  hobbies?: string[];
  featuredPhotos?: string[];
  friendCount?: number;
  friends?: { id: string; name: string; profilePicUrl: string }[];
}

// Type alias to match the component's expectations
type User = ExtendedUser;

interface ProfileIntroProps {
  currentUser: User;
  isOwnProfile: boolean;
  photos: GlobalPhoto[];
  onTabChange: (tab: 'photos' | 'friends') => void;
  // Architecture Note: This callback allows the parent to persist changes to the backend.
  onUpdateProfile?: (field: keyof User, value: any) => Promise<void>;
}

// --- Constants ---
const HOBBIES_LIST = [
  { id: 'football', name: 'كرة القدم', emoji: '⚽' },
  { id: 'reading', name: 'القراءة', emoji: '📚' },
  { id: 'tech', name: 'التقنية', emoji: '📱' },
  { id: 'travel', name: 'السفر', emoji: '✈️' },
  { id: 'gaming', name: 'الألعاب', emoji: '🎮' },
  { id: 'music', name: 'الموسيقى', emoji: '🎵' },
  { id: 'art', name: 'الفن', emoji: '🎨' },
  { id: 'photography', name: 'التصوير', emoji: '📸' },
  { id: 'coding', name: 'البرمجة', emoji: '💻' },
  { id: 'cooking', name: 'الطبخ', emoji: '🍳' },
];

const BIO_MAX_LENGTH = 160;
const MAX_FEATURED_PHOTOS = 9;
const MAX_FILE_SIZE_MB = 5;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// --- Security Utilities (أدوات الأمان) ---

/**
 * Sanitize text input using DOMPurify to prevent XSS.
 */
const sanitizeInput = (input: string): string => {
  const clean = DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  return clean.trim();
};

/**
 * Validate URL scheme to prevent javascript: or other malicious schemes.
 * Allows http, https, and data URIs (for previews).
 */
const isValidUrl = (url: string): boolean => {
  if (!url) return false;
  return /^(https?:\/\/|data:image\/)/i.test(url);
};

/**
 * Validate image file using Magic Numbers (File Signatures).
 * This prevents extension spoofing (e.g., renaming .exe to .jpg).
 */
const validateImageFile = async (file: File): Promise<boolean> => {
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) return false;
  if (!ALLOWED_MIME_TYPES.includes(file.type)) return false;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = (e) => {
      if (!e.target || !e.target.result) return resolve(false);
      const arr = (new Uint8Array(e.target.result as ArrayBuffer)).subarray(0, 4);
      let header = "";
      for (let i = 0; i < arr.length; i++) {
        header += arr[i].toString(16);
      }
      
      // Check signatures
      // 89504e47 = PNG, ffd8ffe0/ffd8ffe1 = JPG, 47494638 = GIF, 52494646 = WEBP
      let isValid = false;
      if (header.startsWith("89504e47")) isValid = true; // PNG
      else if (header.startsWith("ffd8ff")) isValid = true; // JPEG
      else if (header.startsWith("47494638")) isValid = true; // GIF
      else if (header.startsWith("52494646")) isValid = true; // WEBP
      
      resolve(isValid);
    };
    reader.readAsArrayBuffer(file.slice(0, 4));
  });
};

const ProfileIntro: React.FC<ProfileIntroProps> = ({ 
  currentUser, 
  isOwnProfile, 
  photos, 
  onTabChange,
  onUpdateProfile 
}) => {
  const [isSaving, setIsSaving] = useState(false);

  // Bio State
  const [bio, setBio] = useState(currentUser.bio || '');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [tempBio, setTempBio] = useState(bio);

  // Hobbies State
  const [hobbies, setHobbies] = useState<string[]>(currentUser.hobbies || []);
  const [isHobbiesModalOpen, setIsHobbiesModalOpen] = useState(false);
  const [searchHobby, setSearchHobby] = useState('');
  const [selectedHobbiesTemp, setSelectedHobbiesTemp] = useState<string[]>([]);

  // Featured Photos State
  const [featuredPhotos, setFeaturedPhotos] = useState<string[]>(currentUser.featuredPhotos || []);
  const [isFeaturedModalOpen, setIsFeaturedModalOpen] = useState(false);
  
  // SECURITY OPTIMIZATION: Use Object URLs for preview instead of Base64 strings to save memory
  const [tempFeaturedPhotos, setTempFeaturedPhotos] = useState<{url: string, file?: File}[]>([]);
  const featuredInputRef = useRef<HTMLInputElement>(null);

  // Sync state with props
  useEffect(() => {
    setBio(sanitizeInput(currentUser.bio || ''));
    setHobbies(currentUser.hobbies || []);
    // Filter out unsafe URLs from incoming props for security
    const safePhotos = (currentUser.featuredPhotos || []).filter(isValidUrl);
    setFeaturedPhotos(safePhotos);
  }, [currentUser]);

  // Cleanup Object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      tempFeaturedPhotos.forEach(p => {
        if (p.file) URL.revokeObjectURL(p.url);
      });
    };
  }, [tempFeaturedPhotos]);

  // --- Bio Handlers ---
  const handleSaveBio = async () => {
    const sanitizedBio = sanitizeInput(tempBio).substring(0, BIO_MAX_LENGTH);
    
    if (onUpdateProfile) {
      setIsSaving(true);
      try {
        await onUpdateProfile('bio', sanitizedBio);
        setBio(sanitizedBio);
        setIsEditingBio(false);
      } catch (error) {
        console.error("Failed to save bio", error);
        alert("حدث خطأ أثناء حفظ النبذة.");
      } finally {
        setIsSaving(false);
      }
    } else {
      // Fallback for local update if no update handler is provided
      setBio(sanitizedBio);
      setIsEditingBio(false);
    }
  };

  // --- Hobbies Handlers ---
  const openHobbiesModal = () => {
    setSelectedHobbiesTemp(hobbies);
    setSearchHobby('');
    setIsHobbiesModalOpen(true);
  };

  const toggleHobbySelection = (hobbyId: string) => {
    setSelectedHobbiesTemp(prev =>
      prev.includes(hobbyId) ? prev.filter(id => id !== hobbyId) : [...prev, hobbyId]
    );
  };

  const handleSaveHobbies = async () => {
    if (onUpdateProfile) {
      setIsSaving(true);
      try {
        await onUpdateProfile('hobbies', selectedHobbiesTemp);
        setHobbies(selectedHobbiesTemp);
        setIsHobbiesModalOpen(false);
      } catch (error) {
        console.error("Failed to save hobbies", error);
        alert("حدث خطأ أثناء حفظ الهوايات.");
      } finally {
        setIsSaving(false);
      }
    } else {
      setHobbies(selectedHobbiesTemp);
      setIsHobbiesModalOpen(false);
    }
  };

  const filteredHobbies = useMemo(() => {
    const sanitizedSearch = sanitizeInput(searchHobby).toLowerCase();
    return HOBBIES_LIST.filter(h =>
      h.name.includes(sanitizedSearch)
    );
  }, [searchHobby]);

  // --- Featured Photos Handlers ---
  const openFeaturedModal = () => {
      // Convert existing string URLs to object structure for the modal state
      setTempFeaturedPhotos(featuredPhotos.map(url => ({ url })));
      setIsFeaturedModalOpen(true);
  };

  const handleFeaturedFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          const selectedFiles = Array.from(e.target.files);
          const validNewPhotos: {url: string, file: File}[] = [];

          for (const file of selectedFiles) {
            if (tempFeaturedPhotos.length + validNewPhotos.length >= MAX_FEATURED_PHOTOS) {
              alert(`لا يمكنك إضافة أكثر من ${MAX_FEATURED_PHOTOS} صور مميزة.`);
              break;
            }

            // SECURITY CHECK: Validate File Signature (Magic Numbers)
            const isValidImage = await validateImageFile(file);
            if (!isValidImage) {
                alert(`الملف ${file.name} غير صالح أو تالف. يرجى رفع صور (JPG, PNG, WEBP) فقط.`);
                continue;
            }

            // PERFORMANCE: Use createObjectURL instead of FileReader (Base64)
            const objectUrl = URL.createObjectURL(file);
            validNewPhotos.push({ url: objectUrl, file: file });
          }
          
          setTempFeaturedPhotos(prev => [...prev, ...validNewPhotos]);
      }
      if (featuredInputRef.current) {
          featuredInputRef.current.value = '';
      }
  };

  const removeTempFeaturedPhoto = (index: number) => {
      setTempFeaturedPhotos(prev => {
        const photoToRemove = prev[index];
        // Revoke URL if it was a local file to free memory
        if (photoToRemove.file) URL.revokeObjectURL(photoToRemove.url);
        return prev.filter((_, i) => i !== index);
      });
  };

  const handleSaveFeatured = async () => {
      if (onUpdateProfile) {
        setIsSaving(true);
        try {
          const finalUrls: string[] = [];
          
          for (const item of tempFeaturedPhotos) {
              if (item.file) {
                  // Convert to Base64 only if it's a new file (Legacy support)
                  // Ideally this should upload to a server and return a URL
                  const base64 = await new Promise<string>((resolve) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(reader.result as string);
                      reader.readAsDataURL(item.file!);
                  });
                  finalUrls.push(base64);
              } else {
                  finalUrls.push(item.url);
              }
          }

          await onUpdateProfile('featuredPhotos', finalUrls);
          setFeaturedPhotos(finalUrls);
          setIsFeaturedModalOpen(false);
        } catch (error) {
          console.error("Failed to save featured photos", error);
          alert("حدث خطأ أثناء حفظ الصور.");
        } finally {
          setIsSaving(false);
        }
      } else {
        setFeaturedPhotos(tempFeaturedPhotos.map(p => p.url));
        setIsFeaturedModalOpen(false);
      }
  };

  const isSaveBioDisabled = tempBio.trim().length === 0 || tempBio.length > BIO_MAX_LENGTH || isSaving;

  return (
    <>
      <div className="w-full space-y-4 h-fit sticky top-20">
        
        {/* Bio Section */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <h3 className="font-bold text-xl mb-3 text-gray-900">نبذة مختصرة</h3>
          
          {!isEditingBio ? (
            <div className="space-y-3">
              <div className="text-center text-[15px] mb-4 text-gray-800 leading-relaxed whitespace-pre-line break-words">
                {bio || (isOwnProfile ? <span className="text-gray-400 italic">أضف نبذة مختصرة عن نفسك...</span> : <span className="text-gray-400 italic">لا توجد نبذة مختصرة.</span>)}
              </div>
              {isOwnProfile && (
                <button 
                  onClick={() => { setTempBio(bio); setIsEditingBio(true); }}
                  className="w-full bg-gray-100 py-2 rounded-md font-semibold text-sm hover:bg-gray-200 transition text-gray-700"
                >
                  {bio ? 'تعديل النبذة المختصرة' : 'إضافة نبذة مختصرة'}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <textarea 
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-center outline-none focus:ring-2 focus:ring-fb-blue focus:border-transparent text-sm resize-none h-24 transition-all"
                placeholder="وصف قصير عن نفسك..."
                value={tempBio}
                onChange={(e) => setTempBio(e.target.value)}
                autoFocus
                maxLength={BIO_MAX_LENGTH}
                disabled={isSaving}
              />
              <div className="flex gap-2 text-xs text-gray-500 justify-end">
                 <span>{BIO_MAX_LENGTH - tempBio.length} حرف متبقي</span>
              </div>
              <div className="flex gap-2">
                 <button 
                    onClick={() => setIsEditingBio(false)}
                    className="flex-1 bg-gray-200 py-2 rounded-md font-semibold text-sm hover:bg-gray-300 transition text-gray-700"
                    disabled={isSaving}
                 >
                    إلغاء
                 </button>
                 <button 
                    onClick={handleSaveBio}
                    className={`flex-1 bg-fb-blue text-white py-2 rounded-md font-semibold text-sm hover:opacity-90 transition flex justify-center items-center ${isSaveBioDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isSaveBioDisabled}
                 >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ'}
                 </button>
              </div>
            </div>
          )}

          {/* Hobbies Display */}
          <div className="mt-6">
             {hobbies.length > 0 && (
               <div className="flex flex-wrap gap-2 mb-4 justify-center">
                  {hobbies.map(hobbyId => {
                    const h = HOBBIES_LIST.find(item => item.id === hobbyId);
                    if (!h) return null;
                    return (
                      <div key={hobbyId} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-gray-50 rounded-full text-sm hover:bg-gray-100 cursor-default transition-colors">
                         <span>{h.emoji}</span>
                         <span className="font-medium text-gray-700">{h.name}</span>
                      </div>
                    );
                  })}
               </div>
             )}

             {isOwnProfile && (
                <button 
                  onClick={openHobbiesModal}
                  className="w-full bg-gray-100 py-2 rounded-md font-semibold text-sm hover:bg-gray-200 transition text-gray-700 mt-2"
                >
                   {hobbies.length > 0 ? 'تعديل الهوايات' : 'إضافة هوايات'}
                </button>
             )}
          </div>

          {/* Featured Photos Display */}
          <div className="mt-6">
              {featuredPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-4">
                      {featuredPhotos.map((photo, idx) => (
                          // SECURITY: Ensure URL is safe before rendering
                          isValidUrl(photo) ? (
                            <div key={idx} className="aspect-[3/4] rounded-lg overflow-hidden border border-gray-100">
                                <img src={photo} alt={`صورة مميزة ${idx + 1}`} className="w-full h-full object-cover hover:scale-105 transition duration-300" />
                            </div>
                          ) : null
                      ))}
                  </div>
              )}

              {isOwnProfile && (
                 <button 
                   onClick={openFeaturedModal}
                   className="w-full bg-gray-100 py-2 rounded-md font-semibold text-sm hover:bg-gray-200 transition text-gray-700 mt-2"
                 >
                    {featuredPhotos.length > 0 ? 'تعديل العناصر المميزة' : 'إضافة صور مميزة'}
                 </button>
              )}
          </div>
        </div>

        {/* Photos Preview Section */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-xl text-gray-900">الصور</h3>
            <button 
                className="text-fb-blue text-[15px] cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition font-medium" 
                onClick={() => onTabChange('photos')}
            >
                عرض الكل
            </button>
          </div>
          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden">
              {photos.slice(0, 9).map(p => (
                isValidUrl(p.url) ? (
                    <div key={p.id} className="aspect-square overflow-hidden bg-gray-100">
                        <img 
                        src={p.url} 
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition"
                        alt={p.description || 'صورة'}
                        onClick={() => onTabChange('photos')}
                        />
                    </div>
                ) : null
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-6 text-sm bg-gray-50 rounded-lg">لا توجد صور بعد.</div>
          )}
        </div>

        {/* Friends Preview Section */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-bold text-xl text-gray-900">الأصدقاء</h3>
            <button 
                className="text-fb-blue text-[15px] cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition font-medium" 
                onClick={() => onTabChange('friends')}
            >
                عرض الكل
            </button>
          </div>
          <div className="text-gray-500 text-[15px] mb-3">{currentUser.friendCount || 0} صديق</div>
          
          <div className="grid grid-cols-3 gap-3">
            {currentUser.friends && currentUser.friends.length > 0 ? (
                currentUser.friends.slice(0, 9).map((friend) => (
                    isValidUrl(friend.profilePicUrl) ? (
                        <div key={friend.id} className="cursor-pointer group">
                            <div className="aspect-square rounded-lg overflow-hidden mb-1 bg-gray-200">
                                <img 
                                    src={friend.profilePicUrl} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300" 
                                    alt={friend.name} 
                                />
                            </div>
                            <span className="text-xs font-semibold leading-tight block group-hover:text-fb-blue transition text-gray-800 truncate">
                                {friend.name}
                            </span>
                        </div>
                    ) : null
                ))
            ) : (
                <div className="col-span-3 text-gray-500 text-center py-6 text-sm bg-gray-50 rounded-lg">
                    لا يوجد أصدقاء لعرضهم.
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Hobbies Modal */}
      {isHobbiesModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-scaleIn">
            
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
               <h3 className="font-bold text-xl text-center flex-1">إضافة هوايات</h3>
               <button 
                 onClick={() => setIsHobbiesModalOpen(false)}
                 className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition"
               >
                 <X className="w-5 h-5 text-gray-600" />
               </button>
            </div>

            <div className="p-4 bg-white">
                <div className="relative">
                   <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                   <input 
                     type="text"
                     placeholder="ابحث عن هواية..."
                     className="w-full bg-gray-100 border-none rounded-full py-2 pr-10 pl-4 outline-none focus:ring-2 focus:ring-fb-blue/50 transition"
                     value={searchHobby}
                     onChange={(e) => setSearchHobby(e.target.value)}
                   />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-white custom-scrollbar">
               <h4 className="text-sm font-bold text-gray-500 mb-3">هوايات مقترحة</h4>
               <div className="flex flex-wrap gap-2">
                  {filteredHobbies.map(hobby => {
                    const isSelected = selectedHobbiesTemp.includes(hobby.id);
                    return (
                      <button
                        key={hobby.id}
                        onClick={() => toggleHobbySelection(hobby.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition text-sm font-medium ${isSelected 
                            ? 'border-fb-blue bg-blue-50 text-fb-blue' 
                            : 'border-gray-300 hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                         <span>{hobby.emoji}</span>
                         <span>{hobby.name}</span>
                         {isSelected && <Check className="w-4 h-4" />}
                      </button>
                    );
                  })}
               </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-3">
               <button 
                  onClick={() => setIsHobbiesModalOpen(false)} 
                  className="px-5 py-2 text-gray-600 font-semibold hover:bg-gray-100 rounded-md transition"
                  disabled={isSaving}
               >
                 إلغاء
               </button>
               <button 
                  onClick={handleSaveHobbies}
                  className="px-6 py-2 bg-fb-blue text-white font-semibold rounded-md hover:opacity-90 transition shadow-sm flex items-center gap-2"
                  disabled={isSaving}
               >
                 {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                 حفظ الهوايات
               </button>
            </div>

          </div>
        </div>
      )}

      {/* Featured Photos Modal */}
      {isFeaturedModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-scaleIn">
                  
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                      <h3 className="font-bold text-xl text-center flex-1">تعديل العناصر المميزة</h3>
                      <button 
                          onClick={() => setIsFeaturedModalOpen(false)}
                          className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition"
                      >
                          <X className="w-5 h-5 text-gray-600" />
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 bg-white custom-scrollbar">
                      <div className="bg-blue-50 p-3 rounded-md mb-4 flex gap-2 items-start">
                        <AlertCircle className="w-5 h-5 text-fb-blue shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-800">
                          لأمان أفضل، تأكد من رفع صور بصيغ (JPG, PNG) فقط. الحد الأقصى {MAX_FEATURED_PHOTOS} صور.
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                          {tempFeaturedPhotos.map((photo, index) => (
                              <div key={index} className="aspect-[3/4] relative rounded-lg overflow-hidden border border-gray-200 group">
                                  <img src={photo.url} alt={`صورة مميزة ${index + 1}`} className="w-full h-full object-cover" />
                                  <button 
                                      onClick={() => removeTempFeaturedPhoto(index)}
                                      className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-red-50 transition opacity-0 group-hover:opacity-100"
                                  >
                                      <X className="w-4 h-4 text-gray-700 hover:text-red-600" />
                                  </button>
                              </div>
                          ))}

                          {tempFeaturedPhotos.length < MAX_FEATURED_PHOTOS && (
                            <div 
                                onClick={() => featuredInputRef.current?.click()}
                                className="aspect-[3/4] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 hover:border-fb-blue transition group"
                            >
                                <input 
                                    type="file" 
                                    multiple 
                                    accept="image/png, image/jpeg, image/webp" 
                                    className="hidden" 
                                    ref={featuredInputRef} 
                                    onChange={handleFeaturedFilesSelect}
                                />
                                <div className="bg-gray-100 p-3 rounded-full group-hover:bg-white transition mb-2">
                                    <Plus className="w-6 h-6 text-fb-blue" />
                                </div>
                                <span className="text-sm font-semibold text-fb-blue">إضافة المزيد</span>
                            </div>
                          )}
                      </div>
                  </div>

                  <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-3">
                      <button 
                          onClick={() => setIsFeaturedModalOpen(false)} 
                          className="px-5 py-2 text-gray-600 font-semibold hover:bg-gray-100 rounded-md transition"
                          disabled={isSaving}
                      >
                          إلغاء
                      </button>
                      <button 
                          onClick={handleSaveFeatured}
                          className="px-6 py-2 bg-fb-blue text-white font-semibold rounded-md hover:opacity-90 transition shadow-sm flex items-center gap-2"
                          disabled={isSaving}
                      >
                          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                          حفظ
                      </button>
                  </div>
              </div>
          </div>
      )}
    </>
  );
};

export default ProfileIntro;