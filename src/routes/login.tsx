import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AuthCard, AuthSkeleton, StudioIntro, useHydrated } from "@/components/pulse-landing";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const hydrated = useHydrated();
  if (!hydrated || isPending) {
    return (
      <StudioIntro>
        <AuthSkeleton />
      </StudioIntro>
    );
  }
  if (user) return <Navigate to="/" />;
  return (
    <StudioIntro>
      <AuthCard />
    </StudioIntro>
  );
}
