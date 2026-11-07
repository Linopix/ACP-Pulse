/** Regie. Die Rolle prüft die Serverfunktion, die Seite selbst nur die Anmeldung. */
import { createFileRoute } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AdminDesk } from "@/components/pulse-admin";
import { AuthSkeleton, StudioIntro, useHydrated } from "@/components/pulse-landing";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const { user, isPending } = useCurrentUserState();
  const hydrated = useHydrated();
  if (!hydrated || isPending) {
    return (
      <StudioIntro>
        <AuthSkeleton />
      </StudioIntro>
    );
  }
  if (!user) return <RedirectToSignIn />;
  return <AdminDesk />;
}
