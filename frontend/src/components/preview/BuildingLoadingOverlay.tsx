// 构建加载动画组件
"use client";

export function BuildingLoadingOverlay() {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-slate-100">
      <div className="flex flex-col items-start gap-0 font-mono text-sm w-[320px]">
        {/* 模拟终端窗口 */}
        <div className="w-full rounded-t-lg bg-gray-100 border border-gray-200 border-b-0 px-4 py-2 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
          <span className="ml-2 text-gray-500 text-xs">building...</span>
        </div>

        {/* 终端内容区 */}
        <div className="w-full bg-white border border-gray-200 border-t-0 rounded-b-lg p-4 min-h-[140px] shadow-sm">
          {/* 第一行 - 立即显示 */}
          <div className="text-gray-600 mb-1">
            <span className="text-green-600">➜</span>{" "}
            <span className="text-blue-600">npm</span> run build
          </div>

          {/* 第二行 - 延迟显示 */}
          <div
            className="text-gray-500 mb-1"
            style={{ animation: "fadeIn 0.3s ease-out 0.4s both" }}
          >
            <span className="text-amber-500">⚡</span> Compiling modules...
          </div>

          {/* 第三行 - 进度条动画 */}
          <div
            className="flex items-center gap-2 mb-1"
            style={{ animation: "fadeIn 0.3s ease-out 0.8s both" }}
          >
            <span className="text-gray-400">[</span>
            <div className="w-32 h-1.5 bg-gray-200 rounded overflow-hidden">
              <div
                className="h-full bg-green-500 rounded"
                style={{
                  animation: "progressBar 2s ease-in-out infinite",
                }}
              />
            </div>
            <span className="text-gray-400">]</span>
          </div>

          {/* 第四行 - 闪烁光标 */}
          <div
            className="flex items-center"
            style={{ animation: "fadeIn 0.3s ease-out 1.2s both" }}
          >
            <span className="text-green-600">➜</span>
            <span
              className="ml-2 w-2 h-4 bg-gray-500"
              style={{ animation: "blink 1s step-end infinite" }}
            />
          </div>
        </div>
      </div>

      {/* 内联 keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes progressBar {
          0% { width: 0%; }
          50% { width: 80%; }
          100% { width: 100%; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
