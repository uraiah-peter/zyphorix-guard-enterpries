import { create } from 'zustand';

interface MobileNavState {
  open: boolean;
  toggle: () => void;
  close: () => void;
}

export const useMobileNav = create<MobileNavState>((set) => ({
  open: false,
  toggle: () => set((s) => ({ open: !s.open })),
  close: () => set({ open: false }),
}));
