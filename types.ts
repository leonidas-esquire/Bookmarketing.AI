
export interface Tool {
  id: string;
  title: string;
  description: string;
  icon: string;
  comingSoon?: boolean;
}

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
