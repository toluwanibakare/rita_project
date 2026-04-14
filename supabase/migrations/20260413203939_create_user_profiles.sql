/*
  # Create User Profiles Table

  ## Summary
  Creates the core user profiles table for the IoMT Shield platform.
  This table stores extended user information beyond what Supabase Auth provides.

  ## New Tables
  - `profiles`
    - `id` (uuid, primary key) - matches auth.users.id
    - `full_name` (text) - user's display name
    - `email` (text, unique) - user's email address
    - `phone` (text) - optional phone number
    - `organization` (text) - user's organization
    - `role` (text) - user's role/title
    - `bio` (text) - user's biography
    - `created_at` (timestamptz) - account creation timestamp
    - `updated_at` (timestamptz) - last profile update timestamp

  ## Security
  - RLS enabled on profiles table
  - Users can only read their own profile
  - Users can only insert their own profile (id must match auth.uid())
  - Users can only update their own profile
  - No delete policy (profiles are retained)

  ## Notes
  1. The `id` column references `auth.users(id)` to tie profiles to Supabase Auth accounts
  2. A trigger auto-updates `updated_at` on every row modification
  3. An after-insert trigger on `auth.users` creates a profile row automatically
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text UNIQUE NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  organization text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'set_profiles_updated_at'
  ) THEN
    CREATE TRIGGER set_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'on_auth_user_created'
      AND event_object_table = 'users'
      AND event_object_schema = 'auth'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_user();
  END IF;
END $$;
