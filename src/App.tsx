import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Rightbar from './components/Rightbar';
import Feed from './components/Feed';
import Profile from './components/Profile';
import ChatWindow from './components/ChatWindow';
import SavedItems from './components/SavedItems';
import Watch from './components/Watch';
import type { User, View, Story, Photo, Album, VideoItem, Post } from './types';
import { Check, Info, X, Play, Pause, ChevronRight, ChevronLeft, Heart, Smile, Send } from 'lucide-react';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import DOMPurify from 'dompurify';

// --- Initial Mock Data ---

const initialUser: User = {
  id: 'me',
  name: 'أحمد علي',
  avatar: 'https://picsum.photos/200/200?random=1',
  coverPhoto: 'https://picsum.photos/1200/400?random=99',
  online: true
};

const initialPosts: Post[] = [
  {
    id: '1',
    author: {
      id: '2',
      name: 'مارك زوكربيرج',
      avatar: 'https://picsum.photos/50/50?random=2',
      online: true
    },
    content: 'أطلقنا ميزة جديدة في تواصل! جربوها وأخبروني برأيكم. #تواصل_اجتماعي #تحديث_جديد 🚀',
    timestamp: 'منذ ساعتين',
    likes: 1204,
    comments: [
      {
        id: 'c1',
        author: { id: '3', name: 'سارة محمد', avatar: 'https://picsum.photos/50/50?random=3' } as User,
        content: 'هذا يبدو رائعاً! عمل ممتاز يا فريق.',
        timestamp: 'منذ ساعة',
        likes: 5
      }
    ],
    shares: 45,
    image: 'https://picsum.photos/600/400?random=10',
    isPinned: false
  },
  {
    id: '2',
    author: {
      id: '4',
      name: 'عاشق التصوير',
      avatar: 'https://picsum.photos/50/50?random=4',
      online: false
    },
    content: 'غروب الشمس أمس كان خيالياً.. الألوان لا تصدق! 🌅📸',
    timestamp: 'منذ 5 ساعات',
    likes: 89,
    comments: [],
    shares: 2,
    image: 'https://picsum.photos/600/400?random=11',
    isPinned: false
  }
];

const initialStories: Story[] = [];
const initialYourPhotos: Photo[] = [
  { id: 'p1', url: 'https://picsum.photos/600/600?random=20', likes: 10, comments: 2, description: 'صورة شخصية' },
  { id: 'p2', url: 'https://picsum.photos/600/600?random=21', likes: 25, comments: 5, description: 'رحلة الصيف' }
];

const initialAlbums: Album[] = [
  {
    id: 'a1',
    title: 'صور الملف الشخصي',
    coverUrl: 'https://picsum.photos/200/200?random=1',
    type: 'profile',
    photos: []
  },
  {
    id: 'a2',
    title: 'صور الغلاف',
    coverUrl: 'https://picsum.photos/1200/400?random=99',
    type: 'cover',
    photos: []
  }
];

const generatedOnlineUsers: User[] = Array.from({ length: 15 }).map((_, i) => ({
  id: `u${i}`,
  name: `مستخدم ${i + 1}`,
  avatar: `https://picsum.photos/50/50?random=${i + 10}`,
  online: Math.random() > 0.3
}));

// --- Custom Hooks ---

const useStoryViewer = (stories: Story[]) => {
  const [viewingStoryIndex, setViewingStoryIndex] = useState<number | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isStoryPaused, setIsStoryPaused] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (viewingStoryIndex !== null && !isStoryPaused) {
      interval = setInterval(() => {
        setStoryProgress(prev => {
          if (prev >= 100) {
            if (viewingStoryIndex < stories.length - 1) {
              setViewingStoryIndex(viewingStoryIndex + 1);
              return 0;
            } else {
              setViewingStoryIndex(null);
              return 0;
            }
          }
          return prev + 1;
        });
      }, 50);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [viewingStoryIndex, stories.length, isStoryPaused]);

  useEffect(() => {
    setStoryProgress(0);
  }, [viewingStoryIndex]);

  const handleNextStory = useCallback(() => {
    if (viewingStoryIndex !== null) {
      if (viewingStoryIndex < stories.length - 1) {
        setViewingStoryIndex(viewingStoryIndex + 1);
      } else {
        setViewingStoryIndex(null);
      }
    }
  }, [viewingStoryIndex, stories.length]);

  const handlePrevStory = useCallback(() => {
    if (viewingStoryIndex !== null && viewingStoryIndex > 0) {
      setViewingStoryIndex(viewingStoryIndex - 1);
    }
  }, [viewingStoryIndex]);

  const handleViewUserStory = useCallback((userId: string) => {
    // Match story based on userId (flattened or nested author)
    const index = stories.findIndex(s => s.userId === userId || s.author?.id === userId);
    if (index !== -1) {
      setViewingStoryIndex(index);
      setIsStoryPaused(false);
    }
  }, [stories]);

  return {
    viewingStoryIndex,
    setViewingStoryIndex,
    storyProgress,
    isStoryPaused,
    setIsStoryPaused,
    handleNextStory,
    handlePrevStory,
    handleViewUserStory
  };
};

// --- App Content Component ---

const AppContent: React.FC = () => {
  const [currentView, setView] = useState<View>('home');

  const [currentUser, setCurrentUser] = useState<User>(initialUser);
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [stories, setStories] = useState<Story[]>(initialStories);

  const [yourPhotos, setYourPhotos] = useState<Photo[]>(initialYourPhotos);
  const [albums, setAlbums] = useState<Album[]>(initialAlbums);

  const [savedPhotos, setSavedPhotos] = useState<Photo[]>([]);
  const [savedVideos, setSavedVideos] = useState<VideoItem[]>([]);

  const [userVideos, setUserVideos] = useState<VideoItem[]>([]);

  const [viewingProfile, setViewingProfile] = useState<User>(currentUser);

  const [activeChats, setActiveChats] = useState<User[]>([]);

  const [appNotification, setAppNotification] = useState<{ message: string, type: 'success' | 'info' } | null>(null);

  const {
    viewingStoryIndex,
    setViewingStoryIndex,
    storyProgress,
    isStoryPaused,
    setIsStoryPaused,
    handleNextStory,
    handlePrevStory,
    handleViewUserStory: viewUserStoryLogic
  } = useStoryViewer(stories);

  const showNotification = useCallback((message: string, type: 'success' | 'info' = 'success') => {
    setAppNotification({ message, type });
  }, []);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (appNotification) {
      timeoutId = setTimeout(() => {
        setAppNotification(null);
      }, 4000);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [appNotification]);

  // Utility to format duration from seconds to MM:SS string
  const formatDuration = useCallback((seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  }, []);

  const handleCreatePost = useCallback((content: string, image?: string) => {
    // Security: Sanitize user content before state update
    const safeContent = DOMPurify.sanitize(content);
    
    const newPost: Post = {
      id: Date.now().toString(),
      author: currentUser,
      content: safeContent,
      ...(image ? { image } : {}),
      timestamp: 'الآن',
      likes: 0,
      comments: [],
      shares: 0,
      isPinned: false
    };

    setPosts(prev => {
      const pinned = prev.filter(p => p.isPinned);
      const unpinned = prev.filter(p => !p.isPinned);
      return [...pinned, newPost, ...unpinned];
    });

    // Handle logic if post contains a data URI for video
    if (image && image.startsWith('data:video')) {
      const videoElement = document.createElement('video');
      videoElement.src = image;
      videoElement.onloadedmetadata = () => {
        const isReel = videoElement.videoHeight > videoElement.videoWidth;
        const newItem: VideoItem = {
          id: `vid_post_${Date.now()}`,
          url: image,
          title: safeContent ? safeContent.substring(0, 50) : (isReel ? 'ريلز جديد' : 'فيديو جديد'),
          views: 0,
          timestamp: 'الآن',
          duration: formatDuration(videoElement.duration), // Ensure string format
          type: isReel ? 'reel' : 'video',
          likes: 0,
          comments: 0,
          commentCount: 0
        };
        setUserVideos(prev => [newItem, ...prev]);
        videoElement.remove();
      };
    } else if (image) {
      setYourPhotos(prev => {
        const exists = prev.some(p => p.url === image);
        if (exists) return prev;

        const newPhoto: Photo = {
          id: `post_img_${Date.now()}`,
          url: image,
          likes: 0,
          comments: 0 // Corrected to use 'comments' property
        };
        return [newPhoto, ...prev];
      });
    }
    showNotification('تم نشر المنشور بنجاح');
  }, [currentUser, showNotification, formatDuration]);

  const handleAddVideoDirectly = useCallback((video: VideoItem) => {
    setUserVideos(prev => [video, ...prev]);
    showNotification('تم إضافة الفيديو بنجاح');
  }, [showNotification]);

  const handleDeleteVideo = useCallback((videoId: string) => {
    setUserVideos(prev => prev.filter(v => v.id !== videoId));
    setSavedVideos(prev => prev.filter(v => v.id !== videoId));
    showNotification('تم حذف الفيديو بنجاح', 'info');
  }, [showNotification]);

  const handleTogglePinPost = useCallback((postId: string) => {
    let notificationMessage = '';
    setPosts(prev => {
      const updated = prev.map(post => {
        if (post.id === postId) {
          notificationMessage = !post.isPinned ? 'تم تثبيت المنشور في الأعلى 📌' : 'تم إلغاء تثبيت المنشور';
          return { ...post, isPinned: !post.isPinned };
        }
        return post;
      });
      const pinned = updated.filter(p => p.isPinned);
      const unpinned = updated.filter(p => !p.isPinned);
      return [...pinned, ...unpinned];
    });

    if (notificationMessage) showNotification(notificationMessage);
  }, [showNotification]);

  const handleDeletePost = useCallback((postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    showNotification('تم حذف المنشور بنجاح', 'info');
  }, [showNotification]);

  const handleUpdateProfilePhoto = useCallback((newUrl: string) => {
    const newPhoto: Photo = {
      id: `profile_${Date.now()}`,
      url: newUrl,
      likes: 0,
      comments: 0,
      description: 'تحديث صورة الملف الشخصي'
    };

    setYourPhotos(prev => {
        const exists = prev.some(p => p.url === newUrl);
        return exists ? prev : [newPhoto, ...prev];
    });
    setAlbums(prevAlbums => prevAlbums.map(album => {
      if (album.type === 'profile') {
        const existingPhotoInAlbum = album.photos.some(p => p.url === newUrl);
        return { ...album, coverUrl: newUrl, photos: existingPhotoInAlbum ? album.photos : [newPhoto, ...album.photos] };
      }
      return album;
    }));
    const updatedUser = { ...currentUser, avatar: newUrl };
    setCurrentUser(updatedUser);
    if (viewingProfile.id === currentUser.id) {
      setViewingProfile(updatedUser);
    }
    handleCreatePost(`قام ${currentUser.name} بتحديث صورة الملف الشخصي.`, newUrl);
    showNotification('تم تحديث صورة الملف الشخصي بنجاح');
  }, [currentUser, viewingProfile.id, handleCreatePost, showNotification]);

  const handleUpdateCoverPhoto = useCallback((newUrl: string) => {
    const newPhoto: Photo = {
      id: `cover_${Date.now()}`,
      url: newUrl,
      likes: 0,
      comments: 0,
      description: 'تحديث صورة الغلاف'
    };

    setYourPhotos(prev => {
        const exists = prev.some(p => p.url === newUrl);
        return exists ? prev : [newPhoto, ...prev];
    });
    setAlbums(prevAlbums => prevAlbums.map(album => {
      if (album.type === 'cover') {
          const existingPhotoInAlbum = album.photos.some(p => p.url === newUrl);
          return { ...album, coverUrl: newUrl, photos: existingPhotoInAlbum ? album.photos : [newPhoto, ...album.photos] };
      }
      return album;
    }));
    const updatedUser = { ...currentUser, coverPhoto: newUrl };
    setCurrentUser(updatedUser);
    if (viewingProfile.id === currentUser.id) {
      setViewingProfile(updatedUser);
    }
    handleCreatePost(`قام ${currentUser.name} بتحديث صورة الغلاف.`, newUrl);
    showNotification('تم تحديث صورة الغلاف بنجاح');
  }, [currentUser, viewingProfile.id, handleCreatePost, showNotification]);

  const handleUpdateName = useCallback((newName: string) => {
    // Security: Sanitize name input
    const safeName = DOMPurify.sanitize(newName);
    if (!safeName) return;

    const updatedUser = { ...currentUser, name: safeName };
    setCurrentUser(updatedUser);
    if (viewingProfile.id === currentUser.id) {
      setViewingProfile(updatedUser);
    }
    showNotification('تم تغيير الاسم بنجاح');
  }, [currentUser, viewingProfile.id, showNotification]);

  const handleAddStory = useCallback((mediaUrl: string) => {
    // Ensure complete Story object structure as per types.ts
    const newStory: Story = {
      id: `ns_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      author: currentUser,
      mediaUrl: mediaUrl,
      type: 'image',
      timestamp: 'الآن',
      viewed: false,
      seen: false
    };
    setStories(prev => [newStory, ...prev]);
    showNotification('تم إضافة القصة بنجاح');
  }, [currentUser, showNotification]);

  const handleAddGenericPhoto = useCallback((photo: Photo) => {
    setYourPhotos(prev => [photo, ...prev]);
    showNotification('تم إضافة الصورة بنجاح');
  }, [showNotification]);

  const handleCreateAlbum = useCallback((newAlbum: Album) => {
    setAlbums(prev => [newAlbum, ...prev]);
    setYourPhotos(prev => [...newAlbum.photos, ...prev]);
    showNotification('تم إنشاء الألبوم بنجاح');
  }, [showNotification]);

  const handleAddPhotoToSpecificAlbum = useCallback((albumId: string, photo: Photo) => {
    setAlbums(prev => prev.map(album => {
      if (album.id === albumId) {
        const existingPhoto = album.photos.some(p => p.id === photo.id);
        return { ...album, photos: existingPhoto ? album.photos : [photo, ...album.photos], coverUrl: photo.url };
      }
      return album;
    }));
    setYourPhotos(prev => {
        const exists = prev.some(p => p.id === photo.id);
        return exists ? prev : [photo, ...prev];
    });
    showNotification('تم إضافة الصورة إلى الألبوم');
  }, [showNotification]);

  const handleDeletePhoto = useCallback((photoId: string) => {
    setYourPhotos(prev => prev.filter(p => p.id !== photoId));
    setAlbums(prev => prev.map(album => ({
      ...album,
      photos: album.photos.filter(p => p.id !== photoId)
    })));
    setSavedPhotos(prev => prev.filter(p => p.id !== photoId));
    showNotification('تم حذف الصورة بنجاح', 'info');
  }, [showNotification]);

  const handleToggleSaveVideo = useCallback((video: VideoItem) => {
    const exists = savedVideos.some(v => v.id === video.id);
    if (exists) {
      setSavedVideos(prev => prev.filter(v => v.id !== video.id));
      showNotification('تمت إزالة الفيديو من العناصر المحفوظة', 'info');
    } else {
      setSavedVideos(prev => [video, ...prev]);
      showNotification('تم حفظ الفيديو في العناصر المحفوظة');
    }
  }, [savedVideos, showNotification]);

  const handleToggleSave = useCallback((item: Photo | VideoItem) => {
    // Check if item has 'duration' property to distinguish VideoItem from Photo
    if ('duration' in item) {
      handleToggleSaveVideo(item as VideoItem);
    } else {
      const photo = item as Photo;
      const exists = savedPhotos.some(p => p.id === photo.id);
      if (exists) {
        setSavedPhotos(prev => prev.filter(p => p.id !== photo.id));
        showNotification('تمت إزالة المنشور من العناصر المحفوظة', 'info');
      } else {
        setSavedPhotos(prev => [photo, ...prev]);
        showNotification('تم حفظ المنشور في العناصر المحفوظة');
      }
    }
  }, [savedPhotos, handleToggleSaveVideo, showNotification]);

  const handleToggleSavePost = useCallback((post: Post) => {
    if (post.image) {
      const isVideo = post.image.startsWith('data:video');
      if (isVideo) {
        const video = userVideos.find(v => v.url === post.image);
        if (video) {
          handleToggleSaveVideo(video);
        }
      } else {
        const photo = yourPhotos.find(p => p.url === post.image);
        if (photo) {
          handleToggleSave(photo);
        }
      }
    }
  }, [userVideos, yourPhotos, handleToggleSave, handleToggleSaveVideo]);

  const handleProfileClick = useCallback(() => {
    setViewingProfile(currentUser);
    setView('profile');
  }, [currentUser]);

  const handleFriendClick = useCallback((friend: User) => {
    setViewingProfile(friend);
    setView('profile');
  }, []);

  const handleOpenChat = useCallback((user: User) => {
    if (!activeChats.some(c => c.id === user.id)) {
      setActiveChats(prev => {
        const newState = [...prev, user];
        if (newState.length > 3) return newState.slice(1);
        return newState;
      });
    }
  }, [activeChats]);

  const handleCloseChat = useCallback((userId: string) => {
    setActiveChats(prev => prev.filter(c => c.id !== userId));
  }, []);

  const handleFriendAction = useCallback((action: 'unfriend' | 'block', user: User) => {
    if (action === 'unfriend') {
      showNotification(`تم إلغاء الصداقة مع ${user.name}.`, 'success');
    } else if (action === 'block') {
      showNotification(`تم حظر ${user.name} بنجاح.`, 'info');
      setView('home');
    }
  }, [showNotification]);

  const handleViewUserStory = useCallback((userId: string) => {
      viewUserStoryLogic(userId);
      const storyExists = stories.some(s => s.userId === userId || s.author?.id === userId);
      if (!storyExists) {
          showNotification('لا توجد قصة لهذا المستخدم حالياً', 'info');
      }
  }, [viewUserStoryLogic, stories, showNotification]);

  const renderMainContent = useMemo(() => {
    switch (currentView) {
      case 'home':
        return (
          <Feed
            currentUser={currentUser}
            stories={stories}
            posts={posts}
            onAddStory={handleAddStory}
            onPostCreate={handleCreatePost}
            onTogglePin={handleTogglePinPost}
            onDeletePost={handleDeletePost}
            onToggleSave={handleToggleSavePost}
          />
        );
      case 'watch':
        return <Watch />;
      case 'saved':
        return (
          <SavedItems
            currentUser={currentUser}
            savedPhotos={savedPhotos}
            savedVideos={savedVideos}
            onUnsave={handleToggleSave}
          />
        );
      case 'gaming':
      case 'marketplace':
      case 'groups':
      case 'events':
      case 'memories':
      case 'pages':
        const title = currentView === 'gaming' ? 'ألعاب (Gaming)' : currentView === 'marketplace' ? 'المتجر' : 'هذا القسم';
        return (
          <div className="flex items-center justify-center h-[calc(100vh-64px)] w-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <h2 className="text-2xl font-bold mb-2 capitalize">{title}</h2>
              <p>هذا القسم قيد التطوير حالياً.</p>
              <button onClick={() => setView('home')} className="mt-4 text-fb-blue hover:underline">العودة للرئيسية</button>
            </div>
          </div>
        );
      case 'profile':
      case 'friends':
      case 'profile_videos':
        return (
          <Profile
            currentUser={currentUser}
            viewingUser={currentView === 'friends' ? currentUser : viewingProfile}
            onFriendClick={handleFriendClick}
            onMessageClick={handleOpenChat}
            onFriendAction={handleFriendAction}
            defaultTab={currentView === 'friends' ? 'friends' : currentView === 'profile_videos' ? 'videos' : undefined}

            posts={posts}
            stories={stories}
            onPostCreate={handleCreatePost}
            onTogglePin={handleTogglePinPost}
            onDeletePost={handleDeletePost}

            onUpdateAvatar={handleUpdateProfilePhoto}
            onUpdateCover={handleUpdateCoverPhoto}
            onUpdateName={handleUpdateName}
            onAddStory={handleAddStory}
            onViewStory={handleViewUserStory}

            photos={yourPhotos}
            albums={albums}
            onAddPhoto={handleAddGenericPhoto}
            onCreateAlbum={handleCreateAlbum}
            onAddPhotoToAlbum={handleAddPhotoToSpecificAlbum}
            onDeletePhoto={handleDeletePhoto}

            userVideos={userVideos}
            onAddVideo={handleAddVideoDirectly}
            onDeleteVideo={handleDeleteVideo}

            savedPhotos={savedPhotos}
            onToggleSave={handleToggleSave}
            savedVideos={savedVideos}
            onToggleSaveVideo={handleToggleSaveVideo}
          />
        );
      default:
        return (
          <div className="flex items-center justify-center h-[calc(100vh-64px)] w-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <h2 className="text-2xl font-bold mb-2 capitalize">{currentView}</h2>
              <p>هذا القسم غير معروف أو قيد التطوير حالياً.</p>
              <button onClick={() => setView('home')} className="mt-4 text-fb-blue hover:underline">العودة للرئيسية</button>
            </div>
          </div>
        );
    }
  }, [
    currentView, currentUser, stories, posts, savedPhotos, savedVideos, yourPhotos, albums, userVideos, viewingProfile,
    handleAddStory, handleCreatePost, handleTogglePinPost, handleDeletePost, handleToggleSave, handleToggleSavePost, handleFriendClick,
    handleOpenChat, handleFriendAction, handleUpdateProfilePhoto, handleUpdateCoverPhoto, handleUpdateName,
    handleViewUserStory, handleAddGenericPhoto, handleCreateAlbum, handleAddPhotoToSpecificAlbum, handleDeletePhoto,
    handleAddVideoDirectly, handleDeleteVideo, handleToggleSaveVideo, setView
  ]);

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-gray-900 text-[#050505] dark:text-white transition-colors duration-300">
      <Navbar currentView={currentView} setView={setView} />

      <div className="flex justify-between">
        <Sidebar
          currentUser={currentUser}
          onProfileClick={handleProfileClick}
          onNavigate={(view) => setView(view)}
          currentView={currentView}
        />

        <div className="flex-1 flex justify-center w-full">
          {renderMainContent}
        </div>

        {!['profile', 'friends', 'saved', 'profile_videos'].includes(currentView) && (
          <Rightbar onlineUsers={generatedOnlineUsers} onChatClick={handleOpenChat} />
        )}
      </div>

      {/* Global Chat Windows */}
      {activeChats.map((user, index) => (
        <ChatWindow
          key={user.id}
          user={user}
          currentUser={currentUser}
          index={index}
          onClose={() => handleCloseChat(user.id)}
        />
      ))}

      {/* Global Notification Toast */}
      {appNotification && (
        <div className="fixed bottom-6 right-6 z-[100] animate-bounce-in">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white ${appNotification.type === 'success' ? 'bg-gray-800' : 'bg-gray-700'}`}>
            {appNotification.type === 'success' ? <Check className="w-5 h-5 text-green-400" /> : <Info className="w-5 h-5 text-blue-400" />}
            <span className="font-medium text-sm">{appNotification.message}</span>
            <button onClick={() => setAppNotification(null)} className="mr-2 text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Global Story Viewer Overlay */}
      {viewingStoryIndex !== null && stories[viewingStoryIndex] && (
        <div className="fixed inset-0 z-[200] bg-black text-white flex flex-col animate-fadeIn">
          <div className="absolute top-0 left-0 w-full p-4 bg-gradient-to-b from-black/60 to-transparent z-20">
            <div className="flex gap-1 mb-3">
              <div className="h-1 w-full bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white transition-all duration-100 ease-linear" style={{ width: `${storyProgress}%` }}></div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <img 
                  src={stories[viewingStoryIndex].userAvatar || stories[viewingStoryIndex].author?.avatar} 
                  className="w-10 h-10 rounded-full border border-white/50" 
                  alt="avatar" 
                />
                <div className="flex flex-col">
                  <span className="font-bold text-sm">{stories[viewingStoryIndex].userName || stories[viewingStoryIndex].author?.name}</span>
                  <span className="text-xs text-white/80">{stories[viewingStoryIndex].timestamp}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => setIsStoryPaused(!isStoryPaused)}>{isStoryPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}</button>
                <button onClick={() => setViewingStoryIndex(null)}><X className="w-8 h-8" /></button>
              </div>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center relative bg-gray-900 overflow-hidden">
            <img src={stories[viewingStoryIndex].mediaUrl} alt="Story" className="w-full h-full object-contain" />

            <div className="absolute inset-0 flex">
              <div className="w-1/4 h-full cursor-pointer z-10" onClick={handlePrevStory}>
                {viewingStoryIndex > 0 && (
                  <button className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/40 rounded-full"><ChevronLeft className="w-8 h-8" /></button>
                )}
              </div>
              <div className="w-2/4 h-full cursor-pointer z-10" onClick={() => setIsStoryPaused(!isStoryPaused)}></div>
              <div className="w-1/4 h-full cursor-pointer z-10" onClick={handleNextStory}>
                {viewingStoryIndex < stories.length - 1 && (
                    <button className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/20 hover:bg-black/40 rounded-full"><ChevronRight className="w-8 h-8" /></button>
                )}
              </div>
            </div>
          </div>

          <div className="w-full bg-gradient-to-t from-black via-black/80 to-transparent pt-10 pb-4 px-4 z-40 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <input type="text" placeholder="رد على القصة..." className="w-full bg-black/40 border border-white/30 rounded-full px-4 py-3 text-white placeholder-white/60 focus:border-white focus:bg-black/60 outline-none" />
                <Smile className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/70 cursor-pointer hover:text-white" />
              </div>
              <button className="p-2 rounded-full text-white hover:bg-white/10"><Heart className="w-7 h-7" /></button>
              <button className="p-2 rounded-full text-white hover:bg-white/10"><Send className="w-6 h-6 rotate-180" /></button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;