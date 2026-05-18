import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { authApi, clearLegacyAuthStorage, isDemoAuthAllowed } from '../lib/auth';
import { api } from '../lib/api';
import {
  type PlanId,
  type UserRole,
  type ManagedUser,
  PLANS,
  isRouteAllowed,
  validateInviteCode,
  markInviteCodeUsed,
  loadManagedUsers,
  saveManagedUsers,
  generateInviteCode,
  loadInvitations,
  saveInvitations,
  type Invitation,
  normalizeRoleFromBackend,
  normalizePlanId,
  DEFAULT_PLAN_FOR_AUTHENTICATED,
} from '../lib/plans';

interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  plan: PlanId;
  last_login?: string;
}

interface SubscriptionInfo {
  has_subscription: boolean;
  plan_id?: string;
  billing_cycle?: string;
  status?: string;
  amount_paid?: number;
  started_at?: string;
  expires_at?: string;
  current_period_start?: string;
  current_period_end?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: () => void;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  enterDemo: () => void;
  exitDemo: () => void;
  isDemo: boolean;
  // Plan & access — now driven by real subscription
  currentPlan: PlanId;
  subscriptionInfo: SubscriptionInfo | null;
  canAccessRoute: (route: string) => boolean;
  refreshSubscription: () => Promise<void>;
  // Invitation system
  loginWithInvite: (code: string, name: string) => { success: boolean; error?: string };
  // Admin functions
  createInvitation: (email: string, plan: PlanId, role: UserRole) => Invitation;
  getInvitations: () => Invitation[];
  getManagedUsers: () => ManagedUser[];
  suspendUser: (userId: string) => void;
  activateUser: (userId: string) => void;
  changeUserPlan: (userId: string, plan: PlanId) => void;
  deleteUser: (userId: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/** Local-only demo persona when VITE_DEMO_AUTH_ENABLED=true (dev) — never used in production builds. */
function buildDemoUser(): User {
  return {
    id: import.meta.env.VITE_DEMO_USER_ID || 'nelvyon-demo-local',
    email: import.meta.env.VITE_DEMO_USER_EMAIL || 'demo@nelvyon.local',
    name: 'NELVYON Demo',
    role: 'super_admin',
    plan: 'enterprise',
    last_login: new Date().toISOString(),
  };
}

/** Fetch the active subscription for the current billing workspace (X-Workspace-Id via api axios interceptor). */
async function fetchActiveSubscription(): Promise<SubscriptionInfo | null> {
  try {
    return await api.getPaymentActiveSubscription();
  } catch (err) {
    if (import.meta.env.DEV) console.warn("[Auth] Failed to fetch subscription:", err);
    return null;
  }
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);

  /** Fetch subscription and update user plan accordingly */
  const refreshSubscription = useCallback(async () => {
    const subInfo = await fetchActiveSubscription();
    setSubscriptionInfo(subInfo);
    // Update user plan based on real subscription (unless super_admin)
    setUser(prev => {
      if (!prev || prev.role === "super_admin") return prev;
      if (subInfo?.has_subscription && subInfo.status === 'active' && subInfo.plan_id) {
        const realPlan = normalizePlanId(subInfo.plan_id);
        return { ...prev, plan: realPlan };
      }
      // No active subscription → default to starter
      return { ...prev, plan: 'starter' };
    });
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      clearLegacyAuthStorage();

      // Stale demo flag from an old session — clear if demo is not allowed (e.g. production)
      const demoMode = localStorage.getItem('nelvyon_demo_mode');
      if (demoMode === 'true' && !isDemoAuthAllowed()) {
        localStorage.removeItem('nelvyon_demo_mode');
      } else if (demoMode === 'true' && isDemoAuthAllowed()) {
        setUser(buildDemoUser());
        setIsDemo(true);
        setLoading(false);
        return;
      }

      // Check if a managed user session exists
      const sessionUser = localStorage.getItem('nelvyon_user_session');
      if (sessionUser) {
        try {
          const parsed = JSON.parse(sessionUser) as User;
          setUser(parsed);
          setIsDemo(false);
          setLoading(false);
          return;
        } catch (err) {
          if (import.meta.env.DEV) console.warn("[Auth] Invalid session JSON:", err);
          localStorage.removeItem('nelvyon_user_session');
        }
      }

      // Try to get the current user from the backend
      const userData = await authApi.getCurrentUser();
      if (userData) {
        const u: User = {
          id: String(userData.id),
          email: userData.email ?? '',
          name: userData.name,
          role: normalizeRoleFromBackend(userData.role),
          plan: DEFAULT_PLAN_FOR_AUTHENTICATED,
          last_login: userData.last_login,
        };
        setUser(u);
        // Fetch real subscription to override plan (billing unchanged — same endpoint)
        if (u.role !== 'super_admin') {
          const subInfo = await fetchActiveSubscription();
          setSubscriptionInfo(subInfo);
          if (subInfo?.has_subscription && subInfo.status === 'active' && subInfo.plan_id) {
            const realPlan = normalizePlanId(subInfo.plan_id);
            setUser(prev => prev ? { ...prev, plan: realPlan } : prev);
          }
        }
      }
      // If no user, stay logged out — NO auto-demo
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[Auth] Auth check failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    setError(null);
    authApi.login();
  };

  const logout = async () => {
    try {
      setError(null);
      const wasDemo = isDemo;
      localStorage.removeItem('nelvyon_demo_mode');
      localStorage.removeItem('nelvyon_user_session');
      clearLegacyAuthStorage();
      setIsDemo(false);
      setUser(null);
      if (!wasDemo) {
        await authApi.logout();
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[Auth] Logout error:", err);
      setUser(null);
      setIsDemo(false);
      localStorage.removeItem('nelvyon_demo_mode');
      localStorage.removeItem('nelvyon_user_session');
      clearLegacyAuthStorage();
    }
  };

  const enterDemo = useCallback(() => {
    if (!isDemoAuthAllowed()) {
      if (import.meta.env.DEV) {
        console.warn(
          '[Auth] Demo desactivado. En desarrollo, define VITE_DEMO_AUTH_ENABLED=true en .env'
        );
      }
      return;
    }
    localStorage.setItem('nelvyon_demo_mode', 'true');
    setUser(buildDemoUser());
    setIsDemo(true);
    setError(null);
  }, []);

  const exitDemo = useCallback(() => {
    localStorage.removeItem('nelvyon_demo_mode');
    localStorage.removeItem('nelvyon_user_session');
    setUser(null);
    setIsDemo(false);
  }, []);

  // Login with invitation code
  const loginWithInvite = useCallback((code: string, name: string): { success: boolean; error?: string } => {
    const invite = validateInviteCode(code);
    if (!invite) {
      return { success: false, error: 'Código de invitación inválido o expirado' };
    }

    const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    // Mark invitation as used
    markInviteCodeUsed(code, userId);

    // Create managed user
    const managedUsers = loadManagedUsers();
    const newUser: ManagedUser = {
      id: userId,
      email: invite.email,
      name: name,
      plan: invite.plan,
      role: invite.role,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      invitedBy: 'nelvyon-owner-001',
    };
    managedUsers.push(newUser);
    saveManagedUsers(managedUsers);

    // Set user session
    const sessionUser: User = {
      id: userId,
      email: invite.email,
      name: name,
      role: invite.role,
      plan: invite.plan,
      last_login: new Date().toISOString(),
    };
    localStorage.setItem('nelvyon_user_session', JSON.stringify(sessionUser));
    setUser(sessionUser);
    setIsDemo(false);

    return { success: true };
  }, []);

  // Admin: Create invitation
  const createInvitation = useCallback((email: string, plan: PlanId, role: UserRole): Invitation => {
    const invitations = loadInvitations();
    const newInvite: Invitation = {
      id: `inv-${Date.now()}`,
      code: generateInviteCode(),
      email,
      plan,
      role,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      used: false,
    };
    invitations.push(newInvite);
    saveInvitations(invitations);
    return newInvite;
  }, []);

  const getInvitations = useCallback(() => loadInvitations(), []);
  const getManagedUsers = useCallback(() => loadManagedUsers(), []);

  const suspendUser = useCallback((userId: string) => {
    const users = loadManagedUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      users[idx].status = 'suspended';
      saveManagedUsers(users);
    }
  }, []);

  const activateUser = useCallback((userId: string) => {
    const users = loadManagedUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      users[idx].status = 'active';
      saveManagedUsers(users);
    }
  }, []);

  const changeUserPlan = useCallback((userId: string, plan: PlanId) => {
    const users = loadManagedUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      users[idx].plan = plan;
      saveManagedUsers(users);
    }
  }, []);

  const deleteUser = useCallback((userId: string) => {
    const users = loadManagedUsers().filter((u) => u.id !== userId);
    saveManagedUsers(users);
  }, []);

  const canAccessRoute = useCallback(
    (route: string): boolean => {
      if (!user) return false;
      // Super admin and admin can access everything
      if (user.role === 'super_admin') return true;
      return isRouteAllowed(user.plan, route);
    },
    [user]
  );

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    logout,
    refetch: checkAuthStatus,
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
    isSuperAdmin: user?.role === 'super_admin',
    enterDemo,
    exitDemo,
    isDemo,
    currentPlan: user?.plan || 'starter',
    subscriptionInfo,
    canAccessRoute,
    refreshSubscription,
    loginWithInvite,
    createInvitation,
    getInvitations,
    getManagedUsers,
    suspendUser,
    activateUser,
    changeUserPlan,
    deleteUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};