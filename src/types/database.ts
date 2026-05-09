export type UserRole = 'superadmin' | 'owner'

export interface Owner {
  id: string
  email: string
  full_name: string | null
  is_superadmin: boolean
  created_at: string
}

export interface Business {
  id: string
  owner_id: string
  name: string
  slug: string
  category: string
  description: string | null
  primary_color: string | null
  logo_url: string | null
  cover_url: string | null
  is_published: boolean
  created_at: string
}

export interface SiteReview {
  author: string
  rating: number
  text: string
}

export interface SiteContent {
  hero: {
    title: string
    subtitle: string
    cta: string
  }
  about: {
    text: string
  }
  services: {
    name: string
    description: string
    price: string
  }[]
  reviews?: SiteReview[]
  gallery?: string[]
  contact: {
    cta: string
    phone?: string
    address?: string
    whatsapp?: string
    instagram?: string
  }
  footer: {
    tagline: string
  }
  nav?: {
    label: string
    anchor: string
    visible: boolean
  }[]
  theme?: {
    headingColor?: string
    textColor?: string
    bgColor?: string
    galleryFrame?: 'rounded' | 'square' | 'circle' | 'shadow' | 'border' | 'polaroid'
    logoShape?: 'default' | 'rounded' | 'circle' | 'square'
    logoSize?: 'sm' | 'md' | 'lg' | 'xl'
  }
}

export interface Site {
  id: string
  business_id: string
  template_id: string | null
  content: SiteContent | null
  raw_html: string | null
  status: 'draft' | 'published' | 'archived'
  published_at: string | null
  created_at: string
}

export interface Template {
  id: string
  name: string
  preview_url: string | null
  category: string | null
  is_premium: boolean
  created_at: string
}

export interface Product {
  id: string
  business_id: string
  name: string
  description: string | null
  price: number | null
  image_url: string | null
  created_at: string
}

export interface Booking {
  id: string
  business_id: string
  customer_name: string
  customer_email: string
  service: string
  date: string
  status: 'pending' | 'confirmed' | 'cancelled'
  created_at: string
}

export interface License {
  id: string
  business_id: string
  plan: 'free' | 'pro' | 'premium'
  expires_at: string | null
  created_at: string
}

export interface SiteSettings {
  id: string
  business_id: string
  primary_color: string
  secondary_color: string | null
  logo_url: string | null
  cover_url: string | null
  theme: 'light' | 'dark'
  template_id: string | null
  created_at: string
}
