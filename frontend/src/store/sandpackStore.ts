import { create } from "zustand";
import type { SandpackStore, SandpackFiles } from "@/types/store";

// Re-export types for backward compatibility
export type { SandpackFiles };

export const useSandpackStore = create<SandpackStore>((set) => ({
  viewMode: "preview",
  setViewMode: (mode) => set({ viewMode: mode }),

  generatedFiles: null,
  setGeneratedFiles: (files) => {
    // 转换为 Sandpack 格式: { "/App.tsx": "code" } -> { "/App.tsx": { code: "code" } }
    const sandpackFiles: SandpackFiles = {};
    Object.entries(files).forEach(([path, code]) => {
      sandpackFiles[path] = { code };
    });
    set({ generatedFiles: sandpackFiles }); // ✨ 不立即关闭 loading，等 Sandpack 加载完成再关闭
  },
  clearGeneratedFiles: () => set({ generatedFiles: null }),

  isAssembling: false,
  setIsAssembling: (isAssembling) => set({ isAssembling }),
}));
