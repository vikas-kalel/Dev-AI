import { create } from "zustand";

interface ToastState {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

const getInitialNavSidebar = (): boolean => {
  if (typeof window === "undefined") return true;
  if (window.innerWidth < 768) return false;
  const saved = localStorage.getItem("devai_nav_sidebar_open");
  return saved !== null ? saved === "true" : true;
};

const getInitialChatSidebar = (): boolean => {
  if (typeof window === "undefined") return true;
  if (window.innerWidth < 768) return false;
  const saved = localStorage.getItem("devai_chat_sidebar_open");
  return saved !== null ? saved === "true" : true;
};

interface UIStore {
  // Navigation & Workspace context
  currentOrgId: string | null;
  currentProjectId: string | null;
  setCurrentOrgId: (orgId: string | null) => void;
  setCurrentProjectId: (projectId: string | null) => void;

  // Primary Navigation Sidebar (RoleAwareSidebar)
  isNavSidebarOpen: boolean;
  setNavSidebarOpen: (open: boolean) => void;
  toggleNavSidebar: () => void;

  // Secondary Chat Sidebar (ChatSidebar)
  isChatSidebarOpen: boolean;
  setChatSidebarOpen: (open: boolean) => void;
  toggleChatSidebar: () => void;

  // Legacy Mobile sidebar alias
  isMobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;

  // Dialogs
  activeDialog: string | null;
  dialogData: any;
  openDialog: (dialogName: string, data?: any) => void;
  closeDialog: () => void;

  // Toast notifications
  toasts: ToastState[];
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  currentOrgId: null,
  currentProjectId: null,
  setCurrentOrgId: (orgId) => set({ currentOrgId: orgId }),
  setCurrentProjectId: (projectId) => set({ currentProjectId: projectId }),

  // Primary Navigation Sidebar
  isNavSidebarOpen: getInitialNavSidebar(),
  setNavSidebarOpen: (open) => {
    localStorage.setItem("devai_nav_sidebar_open", String(open));
    set({ isNavSidebarOpen: open, isMobileSidebarOpen: open });
  },
  toggleNavSidebar: () =>
    set((s) => {
      const next = !s.isNavSidebarOpen;
      localStorage.setItem("devai_nav_sidebar_open", String(next));
      return { isNavSidebarOpen: next, isMobileSidebarOpen: next };
    }),

  // Secondary Chat Sidebar
  isChatSidebarOpen: getInitialChatSidebar(),
  setChatSidebarOpen: (open) => {
    localStorage.setItem("devai_chat_sidebar_open", String(open));
    set({ isChatSidebarOpen: open });
  },
  toggleChatSidebar: () =>
    set((s) => {
      const next = !s.isChatSidebarOpen;
      localStorage.setItem("devai_chat_sidebar_open", String(next));
      return { isChatSidebarOpen: next };
    }),

  // Mobile sidebar alias
  isMobileSidebarOpen: false,
  setMobileSidebarOpen: (open) =>
    set({ isMobileSidebarOpen: open, isNavSidebarOpen: open }),
  toggleMobileSidebar: () =>
    set((s) => {
      const next = !s.isNavSidebarOpen;
      return { isNavSidebarOpen: next, isMobileSidebarOpen: next };
    }),

  activeDialog: null,
  dialogData: null,
  openDialog: (dialogName, data = null) =>
    set({ activeDialog: dialogName, dialogData: data }),
  closeDialog: () => set({ activeDialog: null, dialogData: null }),

  toasts: [],
  showToast: (message, type = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
