
export interface Book {
  id: string;
  title: string;
  genre: string;
}

export interface Tool {
  id: string;
  title:string;
  description: string;
  icon: string;
  comingSoon?: boolean;
}

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

export interface User {
  name: string;
  avatarUrl: string;
  books: Book[];
}

export interface SalesRecord {
  date: string; // ISO string 'YYYY-MM-DD'
  unitsSold: number;
  revenue: number;
  retailer: string;
  country: string;
}

export interface SalesPageConfig {
    price: number;
    currency: string;
    pitch: string;
    isActive: boolean;
}


// Fix: Centralized the AIStudio interface and global window declaration
// to resolve a duplicate declaration error. This is now the single source of truth.
declare global {
    // FIX: Moved AIStudio interface into `declare global` to make it a global type,
    // resolving conflicts with other declarations of `window.aistudio`.
    interface AIStudio {
        hasSelectedApiKey: () => Promise<boolean>;
        openSelectKey: () => Promise<void>;
    }

    interface Window {
        aistudio?: AIStudio;
    }
}
