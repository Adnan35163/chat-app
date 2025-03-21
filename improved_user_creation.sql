-- Improved fix for user creation issues

-- First, enable the uuid-ossp extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop the existing trigger if it exists to recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the existing function if it exists to recreate it
DROP FUNCTION IF EXISTS create_profile_for_user();

-- Recreate the function with proper error handling and more comprehensive data handling
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
DECLARE
  provider TEXT;
BEGIN
  -- Determine the auth provider
  SELECT raw_app_meta_data->>'provider' INTO provider FROM auth.users WHERE id = new.id;
  
  -- If provider is null, default to 'email'
  IF provider IS NULL THEN
    provider := 'email';
  END IF;
  
  -- Insert the profile with appropriate data
  INSERT INTO public.profiles (
    id, 
    username, 
    email, 
    full_name, 
    avatar_url,
    auth_provider,
    created_at,
    updated_at
  )
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'preferred_username', new.email), 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', NULL),
    provider,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log the error (in a real environment, you might want to log to a table)
  RAISE NOTICE 'Error creating profile for user: %', SQLERRM;
  RETURN new; -- Still return new to allow the user creation to proceed
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_for_user();

-- Ensure the profiles table exists with the correct structure
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  phone_number TEXT,
  location TEXT,
  website TEXT,
  date_of_birth DATE,
  gender TEXT,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE,
  auth_provider TEXT DEFAULT 'email',  -- 'email', 'google', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Ensure Row Level Security is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Recreate the policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Add a policy to allow users to view other profiles (for chat functionality)
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
CREATE POLICY "Anyone can view profiles" 
  ON profiles FOR SELECT 
  USING (true);