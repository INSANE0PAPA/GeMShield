import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/roles";
import { apiFetch } from "@/lib/api";

type SessionState = {
  session: Session | null;
  loading: boolean;
};

const SessionContext = createContext<SessionState>({ session: null, loading: true });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setLoading(false);
      if (event === "SIGNED_IN" && next && typeof window !== "undefined" && !sessionStorage.getItem("gs-login-" + next.user.id)) {
        sessionStorage.setItem("gs-login-" + next.user.id, "1");
        void apiFetch("/api/audit", { method: "POST", body: JSON.stringify({ action: "Signed in", entity_type: "User Management" }) });
      }
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        if (event === "SIGNED_OUT") {
          queryClient.clear();
        } else {
          queryClient.invalidateQueries();
        }
      }
    });

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        setSession(data.session);
      })
      .catch(() => setSession(null))
      .finally(() => setLoading(false));

    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const value = useMemo(() => ({ session, loading }), [session, loading]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}

export function useProfile() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const data = await apiFetch<any>("/api/profiles/me");
      return {
        profile: data,
        roles: (data.roles ?? []).map((r: string) => r as AppRole),
      };
    },
  });
}
