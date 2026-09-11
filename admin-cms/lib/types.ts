// Shared TypeScript types matching the Supabase database schema

export interface Project {
  id: string;
  title: string;
  description: string | null;
  long_description: string | null;
  image_url: string | null;
  tags: string[] | null;
  demo_url: string | null;
  github_url: string | null;
  featured: boolean;
  created_at: string;
}

export interface Certificate {
  id: string;
  title: string;
  issuing_organization: string | null;
  issue_date: string | null;
  credential_url: string | null;
  image_url: string | null;
  created_at: string;
}

export interface SocialLinks {
  github?: string;
  linkedin?: string;
  twitter?: string;
  email?: string;
  [key: string]: string | undefined;
}

export interface Profile {
  id: string;
  hero_title: string | null;
  bio: string | null;
  about_me: string | null;
  skills: string[] | null;
  social_links: SocialLinks | null;
}

export type ProjectInsert = Omit<Project, 'id' | 'created_at'>;
export type CertificateInsert = Omit<Certificate, 'id' | 'created_at'>;
export type ProfileInsert = Omit<Profile, 'id'>;
