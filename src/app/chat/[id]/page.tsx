import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatContainer from "@/components/chat/ChatContainer";

export default async function ChatPage({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/");
  }

  // Verify user has access to this conversation
  const { data: userConversation } = await supabase
    .from("user_conversations")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("conversation_id", params.id)
    .single();

  if (!userConversation) {
    redirect("/chat");
  }

  // Fetch user's conversations for sidebar
  const { data: conversations } = await supabase
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
    .eq("user_conversations.user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(1, { foreignTable: "messages" });

  return (
    <div className="flex h-screen bg-background dark:bg-dark-bg">
      <ChatSidebar
        conversations={conversations || []}
        userId={session.user.id}
      />
      <ChatContainer userId={session.user.id} />
    </div>
  );
}
