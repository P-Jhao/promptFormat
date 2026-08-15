// 应用主壳层组件
"use client";

import { useState } from "react";
// import { useRef, useEffect } from "react";
import Image from "next/image";
import { ChatPanel } from "./ChatPanel";
import { PreviewPanel } from "./PreviewPanel";
import { useSandpackStore } from "@/store/sandpackStore";
import { Eye, Code2 } from "lucide-react";
// import { Settings, LogOut } from "lucide-react";
import type { LayoutMode, AppShellProps } from "@/types/components";

/**
 * AppShell
 *
 * 职责：
 * - 管理整体布局结构（两列 / 预览全屏）
 * - 分配 Chat / Preview 的空间
 *
 * 不负责：
 * - 不处理任何业务逻辑
 * - 不关心 prompt / sandpack / AI
 * - 不直接依赖 store（未来可由上层注入）
 */

export function AppShell({ children }: AppShellProps) {
  const { viewMode, setViewMode } = useSandpackStore();

  /**
   * 当前布局模式
   *
   * split         : Chat + Preview
   * preview-only  : Preview 全屏
   */
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("split");

  /**
   * 布局控制方法
   * 注意：这里只是能力，不是业务触发
   */
  const showPreviewOnly = () => setLayoutMode("preview-only");
  const showSplit = () => setLayoutMode("split");

  // 登录菜单功能暂时注释，待接入真实用户系统后恢复。
  // const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  // const dropdownRef = useRef<HTMLDivElement>(null);
  //
  // useEffect(() => {
  //   function handleClickOutside(event: MouseEvent) {
  //     if (
  //       dropdownRef.current &&
  //       !dropdownRef.current.contains(event.target as Node)
  //     ) {
  //       setIsDropdownOpen(false);
  //     }
  //   }
  //   document.addEventListener("mousedown", handleClickOutside);
  //   return () => {
  //     document.removeEventListener("mousedown", handleClickOutside);
  //   };
  // }, []);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-gray-50">
      {/* 顶部 Header */}
      <header className="relative flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
        <div className="flex items-center gap-3">
          {/* Logo 和标题 */}
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
              <Image
                src="/logo.png"
                alt="Logo"
                fill
                priority
                className="object-cover"
                sizes="32px"
              />
            </div>
            <span>PromptForge</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500">
              Beta
            </span>
          </div>
        </div>

        {/* 中间 Toggle Controls */}
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-100 p-1">
            <button
              onClick={() => setViewMode("preview")}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                viewMode === "preview"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Eye size={16} />
              预览
            </button>
            <button
              onClick={() => setViewMode("code")}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                viewMode === "code"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Code2 size={16} />
              代码
            </button>
          </div>
        </div>

        {/* 右侧 User Dropdown 暂时注释，待接入登录功能后恢复。
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full shadow-sm transition-all hover:shadow-md active:scale-95"
          >
            <Image
              src="/avatar.gif"
              alt="User Avatar"
              fill
              unoptimized
              className="object-cover"
              sizes="32px"
            />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 origin-top-right animate-in fade-in zoom-in-95 duration-200 rounded-xl border border-gray-200 bg-white p-1 shadow-lg ring-1 ring-black/5 focus:outline-none z-50">
              <button
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={() => {
                  console.log("Settings clicked");
                  setIsDropdownOpen(false);
                }}
              >
                <Settings size={16} className="text-gray-500" />
                设置
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                onClick={() => {
                  console.log("Logout clicked");
                  setIsDropdownOpen(false);
                }}
              >
                <LogOut size={16} />
                退出登录
              </button>
            </div>
          )}
        </div>
        */}
      </header>

      {/* 下方主体内容：包含 Chat 和 Preview */}
      <main className="flex flex-1 overflow-hidden gap-4 p-4">
        {/* 左侧 Chat 面板 */}
        <div
          className={`flex flex-col shrink-0 transition-all duration-300 ease-out ${
            layoutMode === "preview-only"
              ? "w-0 opacity-0 pointer-events-none"
              : "w-[400px] opacity-100"
          }`}
        >
          <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <ChatPanel />
          </div>
        </div>

        {/* 右侧 Preview 面板 */}
        <div className="flex-1 relative bg-gray-50 transition-all duration-300 ease-out">
          <PreviewPanel
            layoutMode={layoutMode}
            onExitFullScreen={showSplit}
            onEnterFullScreen={showPreviewOnly}
          >
            {children}
          </PreviewPanel>
        </div>
      </main>
    </div>
  );
}
