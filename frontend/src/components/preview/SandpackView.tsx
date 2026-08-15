// Sandpack 代码预览组件
"use client";

import {
  SandpackLayout,
  SandpackPreview,
  SandpackCodeEditor,
  SandpackFileExplorer,
  useSandpack,
  useActiveCode,
} from "@codesandbox/sandpack-react";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSandpackStore } from "@/store/sandpackStore";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getReactTS_Template } from "@/services/api";
import { BuildingLoadingOverlay } from "./BuildingLoadingOverlay";

// Client-only provider to prevent hydration mismatch
const SandpackProvider = dynamic(
  () =>
    import("@codesandbox/sandpack-react").then((mod) => mod.SandpackProvider),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-white" />,
  },
);

export function SandpackView() {
  const { viewMode, generatedFiles, isAssembling, setIsAssembling } =
    useSandpackStore();
  const [templateFiles, setTemplateFiles] = useState<
    Record<string, { code: string }>
  >({});
  const [loading, setLoading] = useState(true);

  // 将 templateFiles 暴露给全局（供 PreviewToolbar 使用）
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__templateFiles = templateFiles;
    }
  }, [templateFiles]);

  // 加载默认模板
  useEffect(() => {
    async function load() {
      try {
        const template = await getReactTS_Template();
        setTemplateFiles(template);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // 合并模板文件和生成的文件（生成的文件优先）
  const files = generatedFiles
    ? { ...templateFiles, ...generatedFiles }
    : templateFiles;

  // 生成唯一 key，当 generatedFiles 变化时强制 SandpackProvider 重新挂载
  const sandpackKey = useMemo(() => {
    if (!generatedFiles) return "template";
    return `generated-${Object.keys(generatedFiles).length}-${Date.now()}`;
  }, [generatedFiles]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-50 text-gray-500">
        正在加载 React 模板...
      </div>
    );
  }

  // 只在 tabs 中显示核心文件，其他文件通过文件树访问
  const visibleFiles = ["/App.tsx", "/index.tsx", "/styles.css"];

  return (
    <SandpackProvider
      key={sandpackKey}
      template="react-ts"
      theme="light"
      files={files}
      options={{
        externalResources: ["https://cdn.tailwindcss.com"],
        visibleFiles: visibleFiles,
        activeFile: "/App.tsx",
      }}
      style={{ height: "100%", width: "100%" }}
    >
      <div className="relative h-full w-full border-none sandpack-wrapper">
        {/* Loading Overlay - 覆盖在 Sandpack 之上，让 Sandpack 在后台加载 */}
        {isAssembling && <BuildingLoadingOverlay />}

        <SandpackLayout
          style={{ height: "100%", border: "none", borderRadius: 0 }}
        >
          <SandpackContent
            viewMode={viewMode}
            onReady={() => {
              // Sandpack 加载完成后关闭组装 loading
              if (isAssembling) {
                setIsAssembling(false);
              }
            }}
          />
        </SandpackLayout>
      </div>
    </SandpackProvider>
  );
}

function SandpackContent({
  viewMode,
  onReady,
}: {
  viewMode: "preview" | "code";
  onReady?: () => void;
}) {
  const { sandpack } = useSandpack();
  const { code } = useActiveCode();
  const lastPreviewCode = useRef<string | undefined>(code);
  const pendingRefresh = useRef(false);
  const [isFileTreeOpen, setIsFileTreeOpen] = useState(true);
  const hasNotifiedReady = useRef(false);

  // ✨ 监听 Sandpack 预览 iframe 加载完成
  useEffect(() => {
    if (!onReady) return;

    const notifyReady = () => {
      if (hasNotifiedReady.current) return;
      hasNotifiedReady.current = true;
      onReady();
    };

    const tryAttach = () => {
      const iframe =
        document.querySelector<HTMLIFrameElement>(".sp-preview-iframe");
      if (!iframe) return false;

      try {
        if (iframe.contentDocument?.readyState === "complete") {
          notifyReady();
          return true;
        }
      } catch {
        // 跨域或访问异常时，等待 load 事件
      }

      const handleLoad = () => {
        notifyReady();
      };
      iframe.addEventListener("load", handleLoad, { once: true });
      return true;
    };

    let intervalId: number | undefined;
    if (!tryAttach()) {
      intervalId = window.setInterval(() => {
        if (tryAttach() && intervalId) {
          window.clearInterval(intervalId);
        }
      }, 200);
    }

    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [onReady]);

  // 限制 tab 数量
  const MAX_TABS = 4;
  const prevVisibleFilesRef = useRef<string[]>([]);

  useEffect(() => {
    const visibleFiles = sandpack.visibleFiles;

    // 如果超过最大数量，关闭最早打开的（但不是当前活动的）
    if (visibleFiles.length > MAX_TABS) {
      // 找到新增的文件（当前活动文件）
      const activeFile = sandpack.activeFile;
      // 找到最早打开的文件（排除当前活动文件）
      const fileToClose = visibleFiles.find((f) => f !== activeFile);
      if (fileToClose) {
        sandpack.closeFile(fileToClose);
      }
    }

    // 更新 ref
    prevVisibleFilesRef.current = [...visibleFiles];
  }, [sandpack.visibleFiles, sandpack.activeFile, sandpack]);

  useEffect(() => {
    if (viewMode === "code" && code !== lastPreviewCode.current) {
      pendingRefresh.current = true;
    }
  }, [code, viewMode]);

  useEffect(() => {
    if (viewMode !== "preview") {
      return;
    }

    if (pendingRefresh.current) {
      sandpack.runSandpack();
      pendingRefresh.current = false;
    }

    lastPreviewCode.current = code;
  }, [viewMode, sandpack, code]);

  return (
    <div className="relative h-full w-full bg-white">
      <div
        className={viewMode === "preview" ? "h-full" : "hidden"}
        aria-hidden={viewMode !== "preview"}
      >
        <SandpackPreview
          style={{ height: "100%" }}
          showOpenInCodeSandbox={false}
          showRefreshButton={true}
        />
      </div>
      <div
        className={viewMode === "code" ? "h-full" : "hidden"}
        aria-hidden={viewMode !== "code"}
      >
        <div className="relative flex h-full w-full overflow-hidden">
          <div
            className={`relative flex-shrink-0 h-full flex-col border-r border-gray-200 overflow-hidden transition-all duration-300 ease-in-out ${
              isFileTreeOpen ? "w-[200px]" : "w-0 border-none"
            }`}
          >
            <div
              className={`h-full w-full overflow-y-auto transition-opacity duration-300 ${
                isFileTreeOpen ? "opacity-100" : "opacity-0"
              }`}
            >
              <SandpackFileExplorer style={{ height: "auto", width: "100%" }} />
            </div>
          </div>

          {/* 编辑器容器 */}
          <div className="relative flex-1 h-full min-w-0 overflow-hidden">
            <SandpackCodeEditor
              style={{ height: "100%", width: "100%" }}
              showTabs={true}
              showLineNumbers={true}
              showInlineErrors={true}
              wrapContent={true}
              closableTabs={true}
            />
          </div>

          {/* Toggle Button Overlaid on the Divider line */}
          <button
            type="button"
            onClick={() => setIsFileTreeOpen((prev) => !prev)}
            className={`absolute top-7 z-20 flex h-6 w-6 items-center justify-center border border-gray-200 bg-white text-gray-500 shadow-sm hover:text-gray-700 transition-all duration-300 ${
              isFileTreeOpen
                ? "rounded-full"
                : "rounded-r-full rounded-l-none border-l-0"
            }`}
            style={{
              left: isFileTreeOpen ? 200 : 0,
              transform: isFileTreeOpen ? "translateX(-50%)" : "translateX(0)",
            }}
            aria-label={
              isFileTreeOpen ? "Collapse file tree" : "Expand file tree"
            }
          >
            {isFileTreeOpen ? (
              <ChevronLeft size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
