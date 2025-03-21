import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatContainer from "@/components/chat/ChatContainer";

export default async function ChatPage() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/");
  }

  // Fetch user's conversations
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
