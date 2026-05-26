import { create } from 'zustand'

// Định nghĩa kiểu dữ liệu cho Store
interface AppState {
  isSidebarOpen: boolean;
  activeFilter: string | null;
  
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setActiveFilter: (filter: string | null) => void;
}

// Khởi tạo Store với Zustand
export const useAppStore = create<AppState>((set) => ({
  // Khởi tạo State
  isSidebarOpen: true,
  activeFilter: null,

  // Định nghĩa các hàm thay đổi State
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  setActiveFilter: (filter) => set({ activeFilter: filter }),
}))
