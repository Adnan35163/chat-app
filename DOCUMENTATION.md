# Chat Application Documentation

## Overview

This is a real-time chat application built with Next.js and Supabase. It provides a modern, responsive interface for users to communicate in real-time, with features like user authentication, group conversations, and profile management.

## Table of Contents

1. [Features](#features)
2. [Technical Stack](#technical-stack)
3. [Project Setup](#project-setup)
4. [Authentication](#authentication)
5. [Database Schema](#database-schema)
6. [Project Structure](#project-structure)
7. [Development Workflow](#development-workflow)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)

## Features

- **User Authentication**

  - Email/password signup and login
  - Google OAuth integration
  - Password reset functionality
  - Email verification

- **User Profiles**

  - Customizable user profiles
  - Profile pictures
  - Online status indicators
  - User settings and preferences

- **Messaging**

  - Real-time messaging using Supabase Realtime
  - One-on-one conversations
  - Group conversations
  - Message editing and deletion
  - Read receipts
  - Typing indicators

- **Media Sharing**

  - File attachments
  - Image sharing
  - Message reactions

- **UI/UX**
  - Responsive design for all devices
  - Light/dark theme support
  - Modern, intuitive interface

## Technical Stack

### Frontend

- **Next.js 14**: React framework for server-rendered applications
- **React 18**: JavaScript library for building user interfaces
- **TypeScript**: Typed JavaScript for better developer experience
- **Tailwind CSS**: Utility-first CSS framework
- **React Hook Form**: Form validation library
- **Zod**: TypeScript-first schema validation
- **React Icons**: Icon library

### Backend

- **Supabase**: Backend-as-a-Service platform providing:
  - PostgreSQL database
  - Authentication services
  - Realtime subscriptions
  - Storage for files and media

### Development Tools

- **ESLint**: JavaScript linting
- **TypeScript**: Static type checking
- **Next.js Development Server**: Hot-reloading development environment

## Project Setup

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository

   ```bash
   git clone <repository-url>
   cd chat-app
   ```

2. Install dependencies

   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up Supabase

   - Create a Supabase account at [https://supabase.com](https://supabase.com)
   - Create a new project
   - Go to the SQL Editor in the Supabase dashboard
   - Copy the contents of the `supabase_schema.sql` file in this repository
   - Paste the SQL into the SQL Editor and run it to create all necessary tables and security policies

4. Configure environment variables

   - Create a `.env.local` file in the root of the project with the following variables:

   ```
   # Supabase configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   - You can find these values in your Supabase project dashboard under Project Settings > API

5. Start the development server

   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Authentication

### Email Authentication

The application supports traditional email/password authentication:

1. Users can sign up with email and password
2. A verification email is sent to the user
3. After verifying their email, users can log in
4. Password reset functionality is available

### Google Authentication

The application also supports Google OAuth:

1. Set up Google OAuth in the Google Cloud Console:

   - Create a new project or select an existing one
   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create Credentials" and select "OAuth client ID"
   - Configure the OAuth consent screen
   - Create an OAuth client ID for a Web application
   - Add your Supabase project URL as an authorized JavaScript origin
   - Add your Supabase authentication callback URL as an authorized redirect URI
   - Note down the Client ID and Client Secret

2. Configure Google Auth Provider in Supabase:
   - Go to Supabase Dashboard and select your project
   - Navigate to "Authentication" > "Providers"
   - Find "Google" in the list and enable it
   - Enter the Client ID and Client Secret from Google Cloud Console
   - Save the configuration

For detailed instructions, refer to the `GOOGLE_AUTH_SETUP.md` file in the repository.

### Authentication Flow

1. When a user registers:

   - Supabase creates an entry in the `auth.users` table
   - A trigger automatically creates a profile for the user in the `profiles` table
   - The user receives a verification email
   - After verifying their email, the user can log in

2. When a user logs in:
   - The application uses Supabase Auth to authenticate the user
   - Upon successful authentication, the user is redirected to the chat interface
   - The user's online status is updated in the database

## Database Schema

The application uses the following tables in the Supabase PostgreSQL database:

### Profiles

Stores user profile information, extending the auth.users table provided by Supabase Auth.

```sql
CREATE TABLE profiles (
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
  auth_provider TEXT DEFAULT 'email',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

### User Settings

Stores user preferences for the application.

```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL UNIQUE,
  theme TEXT DEFAULT 'light',
  notification_enabled BOOLEAN DEFAULT true,
  email_notification_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

### Conversations

Stores chat conversations, which can be one-on-one or group chats.

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  is_group BOOLEAN DEFAULT false,
  avatar_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

### User Conversations

Links users to conversations they're part of.

```sql
CREATE TABLE user_conversations (
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
```

### Messages

Stores chat messages.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT false,
  reply_to_id UUID REFERENCES messages(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

### Message Attachments

Stores files attached to messages.

```sql
CREATE TABLE message_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES messages(id) NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

### Message Reactions

Stores user reactions to messages.

```sql
CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES messages(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  reaction TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(message_id, user_id, reaction)
);
```

## Project Structure

```
├── public/                 # Static assets
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── auth/           # Authentication pages
│   │   ├── chat/           # Chat interface
│   │   ├── profile/        # User profile pages
│   │   ├── globals.css     # Global styles
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Home page
│   ├── components/         # Reusable components
│   │   ├── chat/           # Chat-related components
│   │   └── icons/          # Icon components
├── .env.local              # Environment variables (not in repo)
├── middleware.ts           # Next.js middleware for auth
├── next.config.js          # Next.js configuration
├── package.json            # Project dependencies
├── supabase_schema.sql     # Database schema
├── tailwind.config.js      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## Development Workflow

### Running the Development Server

```bash
npm run dev
# or
yarn dev
```

This starts the Next.js development server with hot-reloading enabled.

### Building for Production

```bash
npm run build
# or
yarn build
```

This creates an optimized production build of the application.

### Starting the Production Server

```bash
npm run start
# or
yarn start
```

This starts the Next.js production server.

### Linting

```bash
npm run lint
# or
yarn lint
```

This runs ESLint to check for code quality issues.

## Deployment

### Deploying to Vercel

The easiest way to deploy the application is using Vercel, the platform built by the creators of Next.js:

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Import the project in Vercel
3. Configure the environment variables
4. Deploy

### Deploying to Other Platforms

To deploy to other platforms:

1. Build the application

   ```bash
   npm run build
   ```

2. Start the production server

   ```bash
   npm run start
   ```

3. Configure your platform to run these commands and set the required environment variables

## Troubleshooting

### Authentication Issues

- **Google Authentication Not Working**: Ensure that the Google provider is enabled in your Supabase project and that the Client ID and Client Secret are correctly configured. Refer to `GOOGLE_AUTH_SETUP.md` for detailed instructions.

- **Email Verification Not Received**: Check your spam folder. If the email is not there, verify that your Supabase project's email settings are correctly configured.

### Database Issues

- **Missing Tables**: Ensure that you've run the SQL schema in the Supabase SQL Editor. The schema is available in the `supabase_schema.sql` file.

- **Permission Errors**: Check that the Row Level Security (RLS) policies are correctly set up. The schema includes all necessary policies.

### Development Issues

- **Next.js Build Errors**: Make sure all dependencies are installed and that your environment variables are correctly set.

- **TypeScript Errors**: Run `npm run lint` to check for TypeScript errors and fix them before building.

### Supabase Realtime Issues

- **Messages Not Updating in Real-time**: Ensure that Realtime is enabled for your Supabase project and that you're correctly subscribing to the relevant channels in your code.

## Support and Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
