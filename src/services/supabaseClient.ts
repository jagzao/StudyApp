import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Configuración de Supabase
const supabaseUrl = 'https://tsgthrfgm3rbblblz.supabase.co'; // Tu URL de Supabase
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzZ3RocmZnbTNyYmJsYmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM1MDUxMjYsImV4cCI6MjA0OTA4MTEyNn0.mQvKGnQ1QwJXa8YQNjXxK4XKJzHJp1xWgvB1Ey8kP2c'; // Tu clave anón

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types (generados por Supabase CLI)
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          full_name: string | null;
          email: string;
          level: number;
          xp: number;
          streak: number;
          created_at: string;
          updated_at: string;
          avatar_url: string | null;
          study_goal_minutes: number;
          total_study_time: number;
          questions_answered: number;
          correct_answers: number;
          max_streak: number;
          preferred_categories: string[];
        };
        Insert: {
          id: string;
          username: string;
          full_name?: string | null;
          email: string;
          level?: number;
          xp?: number;
          streak?: number;
          avatar_url?: string | null;
          study_goal_minutes?: number;
          total_study_time?: number;
          questions_answered?: number;
          correct_answers?: number;
          max_streak?: number;
          preferred_categories?: string[];
        };
        Update: {
          id?: string;
          username?: string;
          full_name?: string | null;
          email?: string;
          level?: number;
          xp?: number;
          streak?: number;
          updated_at?: string;
          avatar_url?: string | null;
          study_goal_minutes?: number;
          total_study_time?: number;
          questions_answered?: number;
          correct_answers?: number;
          max_streak?: number;
          preferred_categories?: string[];
        };
      };
      flashcards_cloud: {
        Row: {
          id: string;
          user_id: string;
          question: string;
          answer: string;
          category: string;
          difficulty: string;
          tags: string[];
          created_at: string;
          updated_at: string;
          is_public: boolean;
          upvotes: number;
          times_seen: number;
          times_correct: number;
          last_seen: string | null;
          difficulty_score: number;
          source: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          question: string;
          answer: string;
          category: string;
          difficulty?: string;
          tags?: string[];
          is_public?: boolean;
          upvotes?: number;
          times_seen?: number;
          times_correct?: number;
          last_seen?: string | null;
          difficulty_score?: number;
          source?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          question?: string;
          answer?: string;
          category?: string;
          difficulty?: string;
          tags?: string[];
          updated_at?: string;
          is_public?: boolean;
          upvotes?: number;
          times_seen?: number;
          times_correct?: number;
          last_seen?: string | null;
          difficulty_score?: number;
          source?: string;
        };
      };
      study_sessions: {
        Row: {
          id: string;
          user_id: string;
          start_time: string;
          end_time: string | null;
          questions_answered: number;
          correct_answers: number;
          xp_gained: number;
          session_type: string;
          categories_studied: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          start_time?: string;
          end_time?: string | null;
          questions_answered?: number;
          correct_answers?: number;
          xp_gained?: number;
          session_type?: string;
          categories_studied?: string[];
        };
        Update: {
          id?: string;
          user_id?: string;
          start_time?: string;
          end_time?: string | null;
          questions_answered?: number;
          correct_answers?: number;
          xp_gained?: number;
          session_type?: string;
          categories_studied?: string[];
        };
      };
      achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_type: string;
          title: string;
          description: string;
          icon: string;
          unlocked_at: string;
          progress: number;
          max_progress: number;
          reward_xp: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_type: string;
          title: string;
          description: string;
          icon: string;
          unlocked_at?: string;
          progress?: number;
          max_progress?: number;
          reward_xp?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          achievement_type?: string;
          title?: string;
          description?: string;
          icon?: string;
          unlocked_at?: string;
          progress?: number;
          max_progress?: number;
          reward_xp?: number;
        };
      };
      leaderboard: {
        Row: {
          id: string;
          user_id: string;
          username: string;
          level: number;
          xp: number;
          streak: number;
          weekly_xp: number;
          monthly_xp: number;
          questions_answered: number;
          accuracy: number;
          rank: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          username: string;
          level?: number;
          xp?: number;
          streak?: number;
          weekly_xp?: number;
          monthly_xp?: number;
          questions_answered?: number;
          accuracy?: number;
          rank?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          username?: string;
          level?: number;
          xp?: number;
          streak?: number;
          weekly_xp?: number;
          monthly_xp?: number;
          questions_answered?: number;
          accuracy?: number;
          rank?: number;
          updated_at?: string;
        };
      };
      challenges: {
        Row: {
          id: string;
          title: string;
          description: string;
          type: string;
          start_time: string;
          end_time: string;
          max_participants: number;
          current_participants: number;
          questions: string[];
          reward_xp: number;
          created_by: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          type: string;
          start_time: string;
          end_time: string;
          max_participants?: number;
          current_participants?: number;
          questions?: string[];
          reward_xp?: number;
          created_by: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          type?: string;
          start_time?: string;
          end_time?: string;
          max_participants?: number;
          current_participants?: number;
          questions?: string[];
          reward_xp?: number;
          created_by?: string;
          is_active?: boolean;
        };
      };
      challenge_participants: {
        Row: {
          id: string;
          challenge_id: string;
          user_id: string;
          score: number;
          completed_at: string | null;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          user_id: string;
          score?: number;
          completed_at?: string | null;
          position?: number;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          user_id?: string;
          score?: number;
          completed_at?: string | null;
          position?: number;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type FlashcardCloud = Database['public']['Tables']['flashcards_cloud']['Row'];
export type StudySession = Database['public']['Tables']['study_sessions']['Row'];
export type Achievement = Database['public']['Tables']['achievements']['Row'];
export type LeaderboardEntry = Database['public']['Tables']['leaderboard']['Row'];
export type Challenge = Database['public']['Tables']['challenges']['Row'];
export type ChallengeParticipant = Database['public']['Tables']['challenge_participants']['Row'];