
export interface Tool {
  id: string;
  title: string;
  description: string;
  icon: string;
  comingSoon?: boolean;
}

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

// Fix: Centralized the AIStudio interface and global window declaration
// to resolve a duplicate declaration error. This is now the single source of truth.
interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
}

declare global {
    interface Window {
        aistudio?: AIStudio;
    }
}
