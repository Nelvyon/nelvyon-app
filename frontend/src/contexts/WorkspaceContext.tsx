import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { getAPIBaseURL } from '../lib/config';
import { ACTIVE_WORKSPACE_STORAGE_KEY } from '../lib/workspaceStorage';

export interface Workspace {
  id: number;
  name: string;
  slug?: string;
  logo_url?: string;
  primary_color?: string;
  domain?: string;
  plan?: string;
  status?: string;
  role: string;
  members_count: number;
  created_at?: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  loading: boolean;
  error: string | null;
  /** True when user is logged in but no real workspace is selected (CRM must not load). */
  needsWorkspaceSelection: boolean;
  switchWorkspace: (wsId: number) => void;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace | null>;
  getWorkspaceHeader: () => Record<string, string>;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

interface WorkspaceProviderProps {
  children: ReactNode;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const base = getAPIBaseURL();
      const res = await fetch(`${base}/api/v1/workspace/list`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        setError(
          `No se pudo cargar la lista de workspaces (${res.status}). ${errText ? errText.slice(0, 200) : ''}`.trim()
        );
        setWorkspaces([]);
        setActiveWorkspace(null);
        return;
      }

      const data: Workspace[] = await res.json();
      setWorkspaces(data);

      const savedId = localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
      const savedWs = savedId ? data.find((ws) => ws.id === parseInt(savedId, 10)) : null;

      if (savedWs) {
        setActiveWorkspace(savedWs);
      } else if (data.length > 0) {
        setActiveWorkspace(data[0]);
        localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, String(data[0].id));
      } else {
        setActiveWorkspace(null);
        setError('Crea un workspace para usar el CRM y el resto de módulos por cuenta.');
      }
    } catch (err) {
      console.warn('[Workspace] Failed to fetch workspaces:', err);
      setError('Error de red al cargar workspaces. Reintenta o revisa la conexión.');
      setWorkspaces([]);
      setActiveWorkspace(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const switchWorkspace = useCallback(
    (wsId: number) => {
      const ws = workspaces.find((w) => w.id === wsId);
      if (ws) {
        setActiveWorkspace(ws);
        localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, String(wsId));
      }
    },
    [workspaces]
  );

  const getWorkspaceHeader = useCallback((): Record<string, string> => {
    if (activeWorkspace && activeWorkspace.id > 0) {
      return { 'X-Workspace-Id': String(activeWorkspace.id) };
    }
    return {};
  }, [activeWorkspace]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const needsWorkspaceSelection =
    Boolean(user) && !loading && (!activeWorkspace || activeWorkspace.id <= 0);

  const createWorkspace = useCallback(async (name: string): Promise<Workspace | null> => {
    try {
      const base = getAPIBaseURL();
      const res = await fetch(`${base}/api/v1/workspace/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.detail || 'Failed to create workspace');
        return null;
      }

      const newWs: Workspace = await res.json();
      setWorkspaces((prev) => [...prev, newWs]);
      setActiveWorkspace(newWs);
      localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, String(newWs.id));
      setError(null);
      return newWs;
    } catch (err) {
      console.error('[Workspace] Create failed:', err);
      setError('Failed to create workspace');
      return null;
    }
  }, []);

  const value: WorkspaceContextType = {
    workspaces,
    activeWorkspace,
    loading,
    error,
    needsWorkspaceSelection,
    switchWorkspace,
    refreshWorkspaces: fetchWorkspaces,
    createWorkspace,
    getWorkspaceHeader,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};
