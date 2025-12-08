/**
 * @file types.ts
 * @description Centralized Type Definitions for the Tourloop Application.
 * Defines core data structures, enums, and interfaces used across all components.
 * Ensures strict type safety and consistency between Feed, Profile, Chat, and Media features.
 */

// ==========================================
// 1. Global Enums & Literals
// ==========================================

/**
 * Navigation views available in the application sidebar and routing logic.
 */
export type View = 
  | 'home' 
  | 'profile' 
  | 'friends' 
  | 'watch' 
  | 'marketplace' 
  | 'saved' 
  | 'profile_videos' 
  | 'gaming' 
  | 'groups' 
  | 'events' 
  | 'memories' 
  | 'pages';

/**
 * Tab categories used within the Profile component.
 */
export type TabType = 
  | 'posts' 
  | 'about' 
  | 'friends' 
  | 'photos' 
  | 'videos' 
  | 'groups' 
  | 'pages' 
  | 'events';

/**
 * Privacy levels for posts, photos, and personal information.
 */
export type PrivacyLevel = 'public' | 'friends' | 'friends_of_friends' | 'only_me';

/**
 * Specific audience targeting for posts.
 */
export type AudienceType = 'public' | 'friends' | 'friends_of_friends' | 'only_me';

/**
 * Restrictions on who can comment on a post.
 */
export type CommentAudienceType = 'public' | 'friends' | 'mentions';

/**
 * Friend request statuses between the current user and another user.
 */
export type FriendshipStatus = 'friends' | 'not_friends' | 'request_sent' | 'own_profile';

/**
 * Type of media content in mixed feeds.
 */
export type MediaType = 'image' | 'video' | 'text' | 'system';

// ==========================================
// 2. Profile & User Information Structures
// ==========================================

/**
 * Detailed structure for the 'About' section of a user profile.
 * Used in ProfileAbout.tsx.
 */
export interface UserAboutData {
  works?: Work[];
  universities?: University[];
  schools?: School[];
  places?: Place[];
  contactInfo?: {
    mobile: { value: string; privacy: PrivacyLevel };
    email: { value: string; privacy: PrivacyLevel };
  };
  websites?: Website[];
  socialLinks?: SocialLink[];
  basicInfo?: {
    gender: { value: string; privacy: PrivacyLevel };
    birthDate: { day: string; month: string; year: string; privacy: PrivacyLevel };
    languages: { value: string[]; privacy: PrivacyLevel };
  };
  relationship?: Relationship;
  familyMembers?: FamilyMember[];
  bio?: { text: string; privacy: PrivacyLevel };
  pronunciation?: { text: string; privacy: PrivacyLevel };
  otherNames?: OtherName[];
  quotes?: { text: string; privacy: PrivacyLevel };
  bloodDonor?: boolean;
  lifeEvents?: LifeEvent[];
}

// -- Sub-interfaces for UserAboutData --
export interface Work {
  id: string;
  role: string;
  company: string;
  privacy: PrivacyLevel;
}

export interface University {
  id: string;
  name: string;
  degree: string;
  major: string;
  year: string;
  privacy: PrivacyLevel;
}

export interface School {
  id: string;
  name: string;
  year: string;
  privacy: PrivacyLevel;
}

export interface Place {
  id: string;
  type: 'current' | 'hometown';
  country: string;
  city: string;
  privacy: PrivacyLevel;
}

export interface Website {
  id: string;
  url: string;
  privacy: PrivacyLevel;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  privacy: PrivacyLevel;
}

export interface Relationship {
  status: string;
  partner?: string;
  year?: string;
  month?: string;
  day?: string;
  privacy: PrivacyLevel;
}

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  privacy: PrivacyLevel;
}

export interface OtherName {
  id: string;
  name: string;
  type: string;
  privacy: PrivacyLevel;
}

export interface LifeEvent {
  id: string;
  title: string;
  location: string;
  description: string;
  year: string;
  privacy: PrivacyLevel;
}

// ==========================================
// 3. Core Entity Interfaces
// ==========================================

/**
 * Represents a User in the system.
 * Consolidated from usage in App.tsx, Profile.tsx, and ChatWindow.tsx.
 */
export interface User {
  id: string;
  name: string;
  avatar: string; // URL to profile picture
  coverPhoto?: string; // URL to cover photo
  online?: boolean;
  
  // Profile specific extended fields
  bio?: string;
  hobbies?: string[];
  featuredPhotos?: string[];
  friendCount?: number;
  friends?: User[]; // Array of friends (can be shallow copies)
  about?: UserAboutData; // Detailed about info
}

/**
 * Represents a Story (24h ephemeral content).
 * Aligned with usage in App.tsx and StoryViewer.
 */
export interface Story {
  id: string;
  userId: string; // Flattened author reference
  userName: string;
  userAvatar: string;
  mediaUrl: string;
  type?: MediaType;
  timestamp: string;
  viewed?: boolean;
  seen?: boolean; // Alias for viewed used in some components
  author?: User; // Optional backward compatibility if needed, but flattened fields preferred
}

/**
 * Represents a Comment on a Post, Photo, or Video.
 */
export interface Comment {
  id: string;
  author: User;
  content: string;
  timestamp: string;
  likes: number;
  replies?: Comment[]; // Nested replies support
  user?: string; // Legacy/Local usage alias for author.name in some local components
  text?: string; // Legacy/Local usage alias for content
  avatar?: string; // Legacy/Local usage alias for author.avatar
}

/**
 * Represents a social media Post.
 * Comprehensive definition covering Feed and Profile usage.
 */
export interface Post {
  id: string;
  author: User;
  content: string;
  timestamp: string;
  
  // Media
  image?: string; // URL to image/video attachment
  
  // Stats
  likes: number;
  shares: number;
  comments: Comment[]; // Can be a count in summary views, or array in detail views
  
  // State
  isLiked?: boolean;
  isPinned?: boolean;
  isSaved?: boolean;
  
  // Configuration
  audienceType?: AudienceType;
  commentAudienceType?: CommentAudienceType;
  
  // Reactions (Feed.tsx)
  reactions?: { emoji: string; users: string[] }[];
}

/**
 * Represents a Photo item.
 * Used in ProfilePhotos and Album views.
 */
export interface Photo {
  id: string;
  url: string;
  title?: string;
  description?: string;
  likes: number;
  comments: number; // Normalized to number from 'commentCount' to match App.tsx
  privacy?: PrivacyLevel;
  caption?: string;
}

/**
 * Represents a Video or Reel item.
 * Used in ProfileVideos and Watch.
 */
export interface VideoItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  title: string;
  views: number;
  timestamp: string;
  duration: string; // Formatted string 'MM:SS'
  type: 'video' | 'reel';
  
  likes: number;
  comments: number;
  
  privacy?: PrivacyLevel;
  commentAudience?: CommentAudienceType;
  
  author?: { name: string; avatarUrl: string }; // For Watch feed items
  uploadedTime?: string; // Alias for timestamp in Watch feed
  
  isLocal?: boolean; // Flag for locally created blobs needing cleanup
}

/**
 * Represents a Photo Album.
 */
export interface Album {
  id: string;
  title: string;
  coverUrl: string;
  type?: 'profile' | 'cover' | 'user';
  photos: Photo[];
}

// ==========================================
// 4. Auxiliary Interfaces
// ==========================================

/**
 * Represents a Group (ProfileGroups.tsx).
 */
export interface Group {
  id: string;
  name: string;
  coverUrl: string;
  membersCount: string;
  role: 'admin' | 'member';
  lastActive: string;
}

/**
 * Represents a Public Page (ProfilePages.tsx).
 */
export interface Page {
  id: string;
  name: string;
  avatar: string;
  category: string;
  likesCount: string;
  isLiked: boolean;
}

/**
 * Represents a User Notification (Feed.tsx).
 */
export interface Notification {
  id: string;
  type: string;
  text: string;
  postId?: string;
  reason?: string;
}

/**
 * Represents a Chat Message (ChatWindow.tsx).
 */
export type MsgType = "text" | "image" | "voice" | "system";

export interface Message {
  id: string;
  text?: string;
  sender: "me" | "them" | "system";
  timestamp: string;
  type?: MsgType;
  mediaUrl?: string;
  duration?: string;
  seen?: boolean;
  delivered?: boolean;
  edited?: boolean;
  reactions?: Record<string, string[]>;
  replyTo?: string | null;
  pinned?: boolean;
}