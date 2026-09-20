import { create } from "zustand";

interface ToastState {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface UIStore {
  // Navigation & Workspace context
  currentOrgId: string | null;
  currentProjectId: string | null;
  setCurrentOrgId: (orgId: string | null) => void;
  setCurrentProjectId: (projectId: string | null) => void;

  // Mobile sidebar
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

  isMobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),
  toggleMobileSidebar: () =>
    set((s) => ({ isMobileSidebarOpen: !s.isMobileSidebarOpen })),

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
