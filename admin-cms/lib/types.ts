// Shared TypeScript types matching the Supabase database schema

export interface Project {
  id: string;
  project_number?: string | null;
  title: string;
  description: string | null;
  long_description?: string | null;
  image_url?: string | null;      // Photo 1 (Cover)
  image_url_2?: string | null;    // Photo 2
  pdf_url?: string | null;        // PDF document / Details link
  demo_url?: string | null;
  github_url?: string | null;
  tags?: string[] | null;
  featured?: boolean;
  created_at?: string;
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

export interface VolunteerActivity {
  id: string;
  title: string;
  description: string | null;
  image_url?: string | null;     // Photo 1
  image_url_2?: string | null;   // Photo 2
  created_at?: string;
}

export interface ResearchPaper {
  id: string;
  title: string;
  category?: string | null;      // Small red title (e.g. ENGINEERING PROJECT, RESEARCH PAPER)
  description?: string | null;
  image_url?: string | null;     // Cover photo
  pdf_url?: string | null;       // PDF Document for "READ PAPER"
  created_at?: string;
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
  hero_title?: string | null;
  job_title?: string | null;
  job_title_2?: string | null;
  about_paragraph?: string | null;
  bio?: string | null;
  about_me?: string | null;
  skills?: string[] | null;
  social_links?: SocialLinks | null;
  years_exp_value?: string | null;
  years_exp_label?: string | null;
  projects_val_value?: string | null;
  projects_val_label?: string | null;
  clients_val_value?: string | null;
  clients_val_label?: string | null;
}

export type ProjectInsert = Omit<Project, 'id' | 'created_at'>;
export type CertificateInsert = Omit<Certificate, 'id' | 'created_at'>;
export type VolunteerActivityInsert = Omit<VolunteerActivity, 'id' | 'created_at'>;
export type ResearchPaperInsert = Omit<ResearchPaper, 'id' | 'created_at'>;
export type ProfileInsert = Omit<Profile, 'id'>;
