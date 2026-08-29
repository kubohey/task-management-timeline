import { verifySession } from "@/lib/supabase/dal";
import { logout } from "@/app/login/actions";
import { RoadmapView } from "@/features/roadmap/roadmap-view";
import { AppHeader } from "@/features/shared/app-header";

export default async function RoadmapPage() {
  const session = await verifySession();

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <AppHeader email={session.email} logoutAction={logout} />
      <RoadmapView userId={session.userId} />
    </main>
  );
}
