import { create } from 'zustand'
import { PANEL_IDS, TOAST_DURATION_MS } from '@/lib/constants'

type PanelId = typeof PANEL_IDS[keyof typeof PANEL_IDS] | null

export interface Toast {
  id: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
}

interface UIState {
  activePanel: PanelId
  selectedCitizenId: string | null
  voiceChatOpen: boolean
  isLoading: boolean
  loadingMessage: string
  toasts: Toast[]
  isSidebarCollapsed: boolean
  isDemoMode: boolean

  setActivePanel: (panel: PanelId) => void
  selectCitizen: (id: string | null) => void
  openVoiceChat: () => void
  closeVoiceChat: () => void
  setLoading: (loading: boolean, message?: string) => void
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setDemoMode: (demo: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  activePanel: null,
  selectedCitizenId: null,
  voiceChatOpen: false,
  isLoading: false,
  loadingMessage: '',
  toasts: [],
  isSidebarCollapsed: false,
  isDemoMode: import.meta.env.VITE_DEMO_MODE === 'true',

  setActivePanel: (panel) => set({ activePanel: panel }),

  selectCitizen: (id) =>
    set({
      selectedCitizenId: id,
      activePanel: id ? PANEL_IDS.CITIZEN : null,
      voiceChatOpen: false,
    }),

  openVoiceChat: () => set({ voiceChatOpen: true }),
  closeVoiceChat: () => set({ voiceChatOpen: false }),

  setLoading: (loading, message = '') => set({ isLoading: loading, loadingMessage: message }),

  addToast: (message, type = 'info') => {
    const id = `toast-${Date.now()}`
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, TOAST_DURATION_MS)
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),

  setDemoMode: (demo) => set({ isDemoMode: demo }),
}))
