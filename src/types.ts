export interface User {
  id: string;
  name: string;
  avatar: string;
  coverPhoto?: string;
  online?: boolean;
}

export interface Post {
  id: string;
  author: User;
  content: string;
  image?: string;
  timestamp: string;
  likes: number;
  comments: Comment[];
  shares: number;
  isPinned: boolean;
}

export interface Comment {
  id: string;
  author: User;
  content: string;
  timestamp: string;
  likes: number;
}

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  author?: User;
  mediaUrl: string;
  type: 'image' | 'video';
  timestamp: string;
  viewed: boolean;
  seen: boolean;
}

export interface Photo {
  id: string;
  url: string;
  likes: number;
  comments: number;
  description?: string;
}

export interface Album {
  id: string;
  title: string;
  coverUrl: string;
  type?: 'profile' | 'cover' | 'custom';
  photos: Photo[];
}

export interface VideoItem {
  id: string;
  url: string;
  title: string;
  views: number;
  timestamp: string;
  duration: string;
  type: 'video' | 'reel';
  likes: number;
  comments: number;
  commentCount: number;
}

export type View = 
  | 'home' 
  | 'watch' 
  | 'saved' 
  | 'gaming' 
  | 'marketplace' 
  | 'groups' 
  | 'events' 
  | 'memories' 
  | 'pages' 
  | 'profile' 
  | 'friends' 
  | 'profile_videos';
