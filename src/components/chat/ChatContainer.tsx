"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { FiSend, FiPaperclip, FiImage } from "react-icons/fi";
import { v4 as uuidv4 } from "uuid";

type Message = {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    id: string;
    email: string;
    full_name?: string;
  };
};

type ChatContainerProps = {
  userId: string;
};

export default function ChatContainer({ userId }: ChatContainerProps) {
  const params = useParams();
  const router = useRouter();
  const conversationId = params?.id as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationName, setConversationName] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClientComponentClient();

  // Fetch messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      fetchMessages();
      fetchConversationDetails();
      subscribeToMessages();
      subscribeToTyping();
    }
  }, [conversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversationDetails = async () => {
    if (!conversationId) return;

    const { data } = await supabase
      .from("conversations")
      .select("name")
      .eq("id", conversationId)
      .single();

    if (data) {
      setConversationName(data.name);
    }
  };

  const fetchMessages = async () => {
    if (!conversationId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select(
        `
        id,
        conversation_id,
        user_id,
        content,
        created_at,
        user:profiles(id, email, full_name)
      `
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
    } else {
      // Transform the data to match the Message type
      const transformedData =
        data?.map((message) => ({
          ...message,
          // Extract the first user from the array or use undefined if empty
          user:
            message.user && message.user.length > 0
              ? message.user[0]
              : undefined,
        })) || [];
      setMessages(transformedData);
    }
    setLoading(false);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // Fetch the user details for the new message
          fetchMessageWithUser(payload.new as Message);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchMessageWithUser = async (message: Message) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", message.user_id)
      .single();

    if (data) {
      setMessages((prev) => [...prev, { ...message, user: data }]);
    } else {
      setMessages((prev) => [...prev, message]);
    }
  };

  const subscribeToTyping = () => {
    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.user_id !== userId) {
          setTypingUsers((prev) => {
            if (!prev.includes(payload.user_id)) {
              return [...prev, payload.user_id];
            }
            return prev;
          });

          // Remove user from typing after 2 seconds
          setTimeout(() => {
            setTypingUsers((prev) =>
              prev.filter((id) => id !== payload.user_id)
            );
          }, 2000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleTyping = () => {
    supabase.channel(`typing:${conversationId}`).send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: userId },
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId) return;

    const messageId = uuidv4();
    const newMessageObj = {
      id: messageId,
      conversation_id: conversationId,
      user_id: userId,
      content: newMessage,
      created_at: new Date().toISOString(),
    };

    // Optimistic update
    setMessages((prev) => [...prev, newMessageObj]);
    setNewMessage("");

    // Send to database
    const { error } = await supabase.from("messages").insert(newMessageObj);

    if (error) {
      console.error("Error sending message:", error);
      // Remove the message if there was an error
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    }
  };

  if (!conversationId) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-white p-4 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            Select a conversation to start chatting
          </h2>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Choose an existing conversation from the sidebar or start a new one
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-gray-900">
      {/* Chat header */}
      <div className="flex items-center border-b border-gray-200 p-4 dark:border-gray-700">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            {conversationName || "Chat"}
          </h2>
          {typingUsers.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Someone is typing...
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwnMessage = message.user_id === userId;
              return (
                <div
                  key={message.id}
                  className={`flex ${
                    isOwnMessage ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs rounded-lg px-4 py-2 ${
                      isOwnMessage
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white"
                    }`}
                  >
                    {!isOwnMessage && message.user && (
                      <div className="mb-1 text-xs font-semibold">
                        {message.user.full_name || message.user.email}
                      </div>
                    )}
                    <p>{message.content}</p>
                    <div
                      className={`mt-1 text-right text-xs ${
                        isOwnMessage
                          ? "text-blue-100"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message input */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-700">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <button
            type="button"
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="Attach file"
          >
            <FiPaperclip className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="Attach image"
          >
            <FiImage className="h-5 w-5" />
          </button>
          <input
            type="text"
            placeholder="Type a message..."
            className="flex-1 rounded-full border border-gray-300 bg-gray-50 px-4 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={() => handleTyping()}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="rounded-full bg-primary p-2 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            aria-label="Send message"
          >
            <FiSend className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
