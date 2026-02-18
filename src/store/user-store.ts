import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserState {
  currentUser: string;
  setCurrentUser: (name: string) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      currentUser: "Armando",
      setCurrentUser: (name: string) => set({ currentUser: name }),
    }),
    {
      name: "ledgera-user",
    }
  )
);
