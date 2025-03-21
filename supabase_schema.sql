-- Supabase SQL Schema for Chat App

-- This schema defines the database structure for the chat application
-- It includes tables for user profiles, conversations, user-conversation relationships, and messages
-- Supports Google authentication and comprehensive profile management

-- Enable UUID extension for uuid_generate_v4() function
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table to store user information
-- This table extends the auth.users table provided by Supabase Auth
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Add constraints
  CONSTRAINT username_length CHECK (char_length(username) >= 3),
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create a function to handle profile creation for both email and Google sign-ups
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
  INSERT INTO profiles (
    id, 
    username, 
    email, 
    full_name, 
    avatar_url,
    auth_provider
  )
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'preferred_username', new.email), 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', NULL),
    provider
  );
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_for_user();

-- User settings table for app preferences
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL UNIQUE,
  theme TEXT DEFAULT 'light',
  notification_enabled BOOLEAN DEFAULT true,
  email_notification_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create a trigger to automatically create user settings when a profile is created
CREATE OR REPLACE FUNCTION create_settings_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (user_id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a profile is created
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_settings_for_user();

-- Conversations table to store chat conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  is_group BOOLEAN DEFAULT false,
  avatar_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- User-conversation relationship table
CREATE TABLE IF NOT EXISTS user_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  conversation_id UUID REFERENCES conversations(id) NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT false,
  last_read_message_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, conversation_id)
);

-- Messages table to store chat messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT false,
  reply_to_id UUID REFERENCES messages(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Message attachments table
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES messages(id) NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Message reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES messages(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  reaction TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(message_id, user_id, reaction)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_user_conversations_user_id ON user_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_conversations_conversation_id ON user_conversations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Create policies for secure access
-- Profiles: Users can view any profile but only update their own
CREATE POLICY "Anyone can view profiles" 
  ON profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- User settings: Users can only access their own settings
CREATE POLICY "Users can view their own settings" 
  ON user_settings FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own settings" 
  ON user_settings FOR UPDATE 
  USING (user_id = auth.uid());

-- Conversations: Users can only access conversations they are part of
CREATE POLICY "Users can view conversations they are in" 
  ON conversations FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_conversations 
      WHERE user_conversations.conversation_id = conversations.id 
      AND user_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations" 
  ON conversations FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update conversations they created or are admin of" 
  ON conversations FOR UPDATE 
  USING (
    created_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM user_conversations 
      WHERE user_conversations.conversation_id = conversations.id 
      AND user_conversations.user_id = auth.uid()
      AND user_conversations.is_admin = true
    )
  );

-- User_conversations: Users can see their own conversation relationships
CREATE POLICY "Users can view their own conversation relationships" 
  ON user_conversations FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own conversation relationships" 
  ON user_conversations FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own conversation relationships" 
  ON user_conversations FOR UPDATE 
  USING (user_id = auth.uid());

-- Messages: Users can only see messages from conversations they are part of
CREATE POLICY "Users can view messages from their conversations" 
  ON messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_conversations 
      WHERE user_conversations.conversation_id = messages.conversation_id 
      AND user_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to their conversations" 
  ON messages FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_conversations 
      WHERE user_conversations.conversation_id = messages.conversation_id 
      AND user_conversations.user_id = auth.uid()
    ) AND user_id = auth.uid()
  );

CREATE POLICY "Users can update their own messages" 
  ON messages FOR UPDATE 
  USING (user_id = auth.uid());

-- Message attachments: Users can see attachments from conversations they are part of
CREATE POLICY "Users can view attachments from their conversations" 
  ON message_attachments FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM messages
      JOIN user_conversations ON user_conversations.conversation_id = messages.conversation_id
      WHERE message_attachments.message_id = messages.id
      AND user_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert attachments to their messages" 
  ON message_attachments FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages
      WHERE message_attachments.message_id = messages.id
      AND messages.user_id = auth.uid()
    )
  );

-- Message reactions: Users can see reactions from conversations they are part of
CREATE POLICY "Users can view reactions from their conversations" 
  ON message_reactions FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM messages
      JOIN user_conversations ON user_conversations.conversation_id = messages.conversation_id
      WHERE message_reactions.message_id = messages.id
      AND user_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own reactions" 
  ON message_reactions FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own reactions" 
  ON message_reactions FOR DELETE 
  USING (user_id = auth.uid());

-- Create functions for common operations

-- Function to create a direct message conversation between two users
CREATE OR REPLACE FUNCTION create_direct_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
  new_conversation_id UUID;
  user1_name TEXT;
  user2_name TEXT;
  conversation_name TEXT;
BEGIN
  -- Check if conversation already exists
  SELECT c.id INTO new_conversation_id
  FROM conversations c
  JOIN user_conversations uc1 ON c.id = uc1.conversation_id AND uc1.user_id = user1_id
  JOIN user_conversations uc2 ON c.id = uc2.conversation_id AND uc2.user_id = user2_id
  WHERE c.is_group = false
  LIMIT 1;
  
  -- If conversation doesn't exist, create it
  IF new_conversation_id IS NULL THEN
    -- Get usernames for conversation name
    SELECT username INTO user1_name FROM profiles WHERE id = user1_id;
    SELECT username INTO user2_name FROM profiles WHERE id = user2_id;
    
    -- Create conversation name from usernames
    conversation_name := user1_name || ' & ' || user2_name;
    
    -- Insert new conversation
    INSERT INTO conversations (name, is_group, created_by)
    VALUES (conversation_name, false, user1_id)
    RETURNING id INTO new_conversation_id;
    
    -- Add both users to the conversation
    INSERT INTO user_conversations (user_id, conversation_id)
    VALUES (user1_id, new_conversation_id), (user2_id, new_conversation_id);
  END IF;
  
  RETURN new_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a group conversation
CREATE OR REPLACE FUNCTION create_group_conversation(creator_id UUID, group_name TEXT, description TEXT, member_ids UUID[])
RETURNS UUID AS $$
DECLARE
  new_conversation_id UUID;
  member_id UUID;
BEGIN
  -- Insert new group conversation
  INSERT INTO conversations (name, description, is_group, created_by)
  VALUES (group_name, description, true, creator_id)
  RETURNING id INTO new_conversation_id;
  
  -- Add creator as admin
  INSERT INTO user_conversations (user_id, conversation_id, is_admin)
  VALUES (creator_id, new_conversation_id, true);
  
  -- Add members to the conversation
  FOREACH member_id IN ARRAY member_ids
  LOOP
    -- Skip if member_id is the creator (already added)
    IF member_id <> creator_id THEN
      INSERT INTO user_conversations (user_id, conversation_id)
      VALUES (member_id, new_conversation_id);
    END IF;
  END LOOP;
  
  RETURN new_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;