"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FiUsers,
  FiMessageSquare,
  FiLogOut,
  FiPlus,
  FiSearch,
  FiX,
} from "react-icons/fi";
import { v4 as uuidv4 } from "uuid";

type Conversation = {
  id: string;
  name: string;
  created_at: string;
  is_group: boolean;
  last_message: {
    content: string;
    created_at: string;
    user_id: string;
  }[];
};

type User = {
  id: string;
  email: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
};

type ChatSidebarProps = {
  conversations: Conversation[];
  userId: string;
};

export default function ChatSidebar({
  conversations,
  userId,
}: ChatSidebarProps) {
  const [activeConversations, setActiveConversations] =
    useState<Conversation[]>(conversations);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchUserTerm, setSearchUserTerm] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientComponentClient();

  // Subscribe to new conversations
  useEffect(() => {
    const channel = supabase
      .channel("conversation-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        (payload) => {
          // Refresh conversations when changes occur
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  const fetchConversations = async () => {
    const { data } = await supabase
      .from("conversations")
      .select(
        `
        id,
        name,
        created_at,
        is_group,
        user_conversations!inner(user_id),
        last_message:messages(content, created_at, user_id)
      `
      )
      .eq("user_conversations.user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1, { foreignTable: "messages" });

    if (data) {
      setActiveConversations(data);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const searchUsers = async () => {
    if (!searchUserTerm.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, username, avatar_url")
        .or(
          `email.ilike.%${searchUserTerm}%,full_name.ilike.%${searchUserTerm}%,username.ilike.%${searchUserTerm}%`
        )
        .neq("id", userId) // Exclude current user
        .limit(5);

      if (error) throw error;

      // Filter out users that are already selected
      const filteredResults = data.filter(
        (user) => !selectedUsers.some((selected) => selected.id === user.id)
      );

      setSearchResults(filteredResults);
    } catch (err) {
      console.error("Error searching users:", err);
      setError("Failed to search users");
    } finally {
      setIsLoading(false);
    }
  };

  // Search users when search term changes
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchUserTerm) {
        searchUsers();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchUserTerm]);

  const addUser = (user: User) => {
    setSelectedUsers([...selectedUsers, user]);
    setSearchResults(searchResults.filter((result) => result.id !== user.id));
    setSearchUserTerm("");
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((user) => user.id !== userId));
  };

  const createConversation = async () => {
    if (selectedUsers.length === 0) {
      setError("Please select at least one user");
      return;
    }

    if (isGroup && !groupName.trim()) {
      setError("Please enter a group name");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Create a new conversation
      const conversationId = uuidv4();
      let conversationName = groupName;

      // For direct messages, use the other user's name
      if (!isGroup) {
        conversationName =
          selectedUsers[0].full_name ||
          selectedUsers[0].username ||
          selectedUsers[0].email;
      }

      // Insert the conversation
      const { error: conversationError } = await supabase
        .from("conversations")
        .insert({
          id: conversationId,
          name: conversationName,
          is_group: isGroup,
        });

      if (conversationError) throw conversationError;

      // Add all selected users to the conversation
      const userConversations = [
        // Current user
        {
          user_id: userId,
          conversation_id: conversationId,
        },
        // Selected users
        ...selectedUsers.map((user) => ({
          user_id: user.id,
          conversation_id: conversationId,
        })),
      ];

      const { error: userConversationError } = await supabase
        .from("user_conversations")
        .insert(userConversations);

      if (userConversationError) throw userConversationError;

      // Close modal and reset form
      setShowNewChatModal(false);
      setSelectedUsers([]);
      setIsGroup(false);
      setGroupName("");
      setSearchUserTerm("");

      // Navigate to the new conversation
      router.push(`/chat/${conversationId}`);
    } catch (err) {
      console.error("Error creating conversation:", err);
      setError("Failed to create conversation");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredConversations = activeConversations.filter((conversation) =>
    conversation.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-full w-80 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
        <h1 className="text-xl font-bold text-primary">Messages</h1>
        <button
          onClick={() => setShowNewChatModal(true)}
          className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          aria-label="New conversation"
        >
          <FiPlus className="h-5 w-5" />
        </button>
      </div>

      <div className="p-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full rounded-md border border-gray-300 bg-gray-50 px-4 py-2 pl-10 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              ></path>
            </svg>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="space-y-1 p-3">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => {
              const isActive = pathname === `/chat/${conversation.id}`;
              return (
                <Link
                  key={conversation.id}
                  href={`/chat/${conversation.id}`}
                  className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive
                      ? "bg-gray-100 text-primary dark:bg-gray-700 dark:text-white"
                      : "text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  <div
                    className={`mr-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-300 ${
                      conversation.is_group
                        ? "bg-blue-100 text-blue-500 dark:bg-blue-900 dark:text-blue-300"
                        : ""
                    }`}
                  >
                    {conversation.is_group ? (
                      <FiUsers className="h-5 w-5" />
                    ) : (
                      <FiMessageSquare className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{conversation.name}</p>
                    {conversation.last_message &&
                      conversation.last_message[0] && (
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                          {conversation.last_message[0].content}
                        </p>
                      )}
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="px-3 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
              {searchTerm
                ? "No conversations found"
                : "No conversations yet. Start a new chat!"}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 p-4 dark:border-gray-700">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <FiLogOut className="mr-2 h-4 w-4" />
          Sign Out
        </button>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              Start a New Conversation
            </h2>

            {/* Toggle between direct message and group chat */}
            <div className="mb-4 flex rounded-md shadow-sm">
              <button
                type="button"
                onClick={() => setIsGroup(false)}
                className={`flex-1 rounded-l-md px-4 py-2 text-sm font-medium ${
                  !isGroup
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                Direct Message
              </button>
              <button
                type="button"
                onClick={() => setIsGroup(true)}
                className={`flex-1 rounded-r-md px-4 py-2 text-sm font-medium ${
                  isGroup
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                Group Chat
              </button>
            </div>

            {/* Group name input (only shown for group chats) */}
            {isGroup && (
              <div className="mb-4">
                <label
                  htmlFor="groupName"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Group Name
                </label>
                <input
                  type="text"
                  id="groupName"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter group name"
                />
              </div>
            )}

            {/* User search */}
            <div className="mb-4">
              <label
                htmlFor="userSearch"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {isGroup ? "Add Participants" : "Select User"}
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="userSearch"
                  value={searchUserTerm}
                  onChange={(e) => setSearchUserTerm(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 pl-10 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Search by name or email"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <FiSearch className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="mb-4 max-h-40 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex cursor-pointer items-center justify-between border-b border-gray-200 px-4 py-2 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                    onClick={() => addUser(user)}
                  >
                    <div>
                      <p className="font-medium">
                        {user.full_name || user.username || user.email}
                      </p>
                      {user.email && (
                        <p className="text-xs text-gray-500">{user.email}</p>
                      )}
                    </div>
                    <button className="text-primary hover:text-primary-dark">
                      <FiPlus className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Selected users */}
            {selectedUsers.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isGroup ? "Participants:" : "Selected User:"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm dark:bg-gray-700"
                    >
                      <span className="mr-1">
                        {user.full_name || user.username || user.email}
                      </span>
                      <button
                        onClick={() => removeUser(user.id)}
                        className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <FiX className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-500 dark:bg-red-900/30 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowNewChatModal(false);
                  setSelectedUsers([]);
                  setIsGroup(false);
                  setGroupName("");
                  setSearchUserTerm("");
                  setError("");
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={createConversation}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                disabled={isLoading || selectedUsers.length === 0}
              >
                {isLoading ? "Creating..." : "Start Conversation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
