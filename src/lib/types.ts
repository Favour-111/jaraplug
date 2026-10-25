export type Role = 'UNASSIGNED' | 'CLIENT' | 'PROVIDER' | 'ADMIN'

export interface Me {
  id: string
  username: string | null
  displayName: string | null
  email: string | null
  role: Role
  accountStatus: string
  ageVerificationStatus: 'NOT_STARTED' | 'PENDING' | 'VERIFIED' | 'REJECTED'
  city: string | null
  onboarded: boolean
  isDemo: boolean
  creditBalance: number
  avatarUrl: string | null
  providerProfile: { verificationStatus: string; visibility: string; availabilityStatus: string; submittedAt: string | null } | null
  counts: { unreadMessages: number; unreadNotifications: number; pendingBookings: number }
}

export interface ProviderCardData {
  id: string
  username: string
  displayName: string
  age: number | null
  city: string
  area: string | null
  availabilityStatus: 'AVAILABLE_NOW' | 'BY_APPOINTMENT' | 'OFFLINE'
  online: boolean
  verified: boolean
  avatarUrl: string | null
  isFavorite: boolean
  isDemo?: boolean
  memberSince?: string
}

export interface ContentItem {
  id: string
  providerId: string
  title: string
  description: string
  mediaType: 'IMAGE' | 'VIDEO'
  visibility: 'PUBLIC' | 'FREE_MEMBERS' | 'PAID'
  price: number
  durationSeconds: number | null
  status: 'DRAFT' | 'PUBLISHED'
  moderationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW' | 'REMOVED'
  moderationNote?: string | null
  createdAt: string
  locked: boolean
  thumbnailUrl: string | null
  url: string | null
  purchaseCount?: number
}

export interface ProviderProfileData extends ProviderCardData {
  biography: string
  content: ContentItem[]
  isSelf: boolean
}

export interface AppConfig {
  authMode: 'clerk' | 'dev'
  cities: string[]
  maxImageMb: number
  maxVideoMb: number
  minPaidPriceKobo: number
  maxPaidPriceKobo: number
  creditPriceKobo: number
  commissionBps: number
  payoutHoldDays: number
  minPayoutKobo: number
}

export interface UserSummary { id: string; username: string | null; displayName: string; role: Role; avatarUrl: string | null; online: boolean }

export interface Conversation {
  id: string
  other: UserSummary
  blocked: boolean
  lastMessage: { body: string; createdAt: string; fromMe: boolean } | null
  unread: number
  lastMessageAt: string
}
export interface Message {
  id: string; conversationId: string; senderId: string; messageType: 'TEXT' | 'IMAGE' | 'AUDIO'; body: string
  attachmentUrl: string | null; durationSeconds: number | null; createdAt: string; deliveredAt: string | null; readAt: string | null
}

export interface Booking {
  id: string; scheduledAt: string; durationMins: number
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'COMPLETED'
  message: string | null; declineReason: string | null; role: 'client' | 'provider'; other: UserSummary | null
}

export interface Notification { id: string; type: string; title: string; body: string; link: string | null; readAt: string | null; createdAt: string }
