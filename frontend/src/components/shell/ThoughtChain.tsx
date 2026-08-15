import { useChatStore } from "@/store/chatStore";
import { PHASE_INFO } from "@/constants/chat";
import type { Phase } from "@/types/flow";
import type { ThoughtChainProps } from "@/types/components";
import {
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  Layers,
  ChevronDown,
  ChevronRight,
  Archive,
} from "lucide-react";

/** 根据阶段所属流程返回是否为 Figma 流程 */
function isFigmaPhase(phase?: string): boolean {
  if (!phase) return false;
  const info = PHASE_INFO[phase as Phase];
  return info?.flow === "figma";
}

export function ThoughtChain({ thoughts }: ThoughtChainProps) {
  const { togglePhaseExpansion, toggleHistoryExpansion, currentFlow } =
    useChatStore();

  if (!thoughts.length) return null;

  return (
    <div className="flex flex-col gap-3 p-3 bg-gray-50/50 rounded-lg border border-gray-100 max-w-full">
      {/* 流程类型标识 */}
      {currentFlow && (
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded ${
              currentFlow === "figma"
                ? "bg-blue-50 text-blue-600"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {currentFlow === "figma" ? "🎨 Figma 快速生成" : "📝 标准流程"}
          </span>
        </div>
      )}
      {thoughts.map((thought, index) => {
        const isLast = index === thoughts.length - 1;
        const isPhase = thought.type === "phase";
        const isHistory = thought.type === "history";

        return (
          <div key={thought.key}>
            <div className="flex gap-3 items-start">
              <div className="mt-0.5 relative">
                {/* 历史记录：使用 Archive 图标 */}
                {isHistory && <Archive className="w-4 h-4 text-gray-500" />}

                {/* 阶段级：使用 Layers 图标，根据流程类型调整颜色 */}
                {isPhase && (
                  <Layers
                    className={`w-4 h-4 ${
                      isFigmaPhase(thought.phase)
                        ? "text-blue-500"
                        : "text-purple-500"
                    }`}
                  />
                )}

                {/* 节点级：根据状态显示图标 */}
                {!isPhase && !isHistory && thought.status === "success" && (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
                {!isPhase && !isHistory && thought.status === "pending" && (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                )}
                {!isPhase && !isHistory && thought.status === "error" && (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                {!isPhase && !isHistory && !thought.status && (
                  <Circle className="w-4 h-4 text-gray-300" />
                )}

                {/* Connecting line */}
                {!isLast && (
                  <div
                    className="absolute top-5 left-2 w-px h-full bg-gray-200 -z-10"
                    style={{ height: "calc(100% + 4px)" }}
                  />
                )}
              </div>
              <div className="flex flex-col gap-1 flex-1">
                {/* 历史记录：灰色风格，可展开 */}
                {isHistory ? (
                  <>
                    <div
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1 rounded transition-colors"
                      onClick={() => toggleHistoryExpansion(thought.key)}
                    >
                      {/* 展开/收起图标 */}
                      {thought.expanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-600 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
                      )}
                      <span className="text-sm font-semibold text-gray-700">
                        {thought.title}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {thought.historyThoughts?.length || 0} 项
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 ml-6">
                      {thought.description}
                    </span>

                    {/* 展开时显示历史思维链 */}
                    {thought.expanded && thought.historyThoughts && (
                      <div className="ml-6 mt-2 space-y-2 border-l-2 border-gray-200 pl-3">
                        {thought.historyThoughts.map((historyThought) => {
                          const isHistoryPhase =
                            historyThought.type === "phase";

                          return (
                            <div
                              key={historyThought.key}
                              className="flex flex-col gap-0.5"
                            >
                              {/* 如果是阶段，显示阶段样式 */}
                              {isHistoryPhase ? (
                                <div className="flex items-center gap-2">
                                  <Layers className="w-3 h-3 text-purple-400 flex-shrink-0" />
                                  <span className="text-xs font-medium text-purple-600">
                                    {historyThought.title}
                                  </span>
                                  <span className="text-xs text-purple-500">
                                    {historyThought.nodeCount} 步骤
                                  </span>
                                </div>
                              ) : (
                                /* 如果是节点，显示节点样式 */
                                <>
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                                    <span className="text-xs font-medium text-gray-700">
                                      {historyThought.title}
                                    </span>
                                  </div>
                                  {historyThought.description && (
                                    <span className="text-xs text-gray-500 ml-5">
                                      {historyThought.description}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : isPhase ? (
                  <>
                    <div
                      className={`flex items-center gap-2 cursor-pointer -mx-2 px-2 py-1 rounded transition-colors ${
                        isFigmaPhase(thought.phase)
                          ? "hover:bg-blue-50"
                          : "hover:bg-purple-50"
                      }`}
                      onClick={() => togglePhaseExpansion(thought.key)}
                    >
                      {/* 展开/收起图标 */}
                      {thought.expanded ? (
                        <ChevronDown
                          className={`w-4 h-4 flex-shrink-0 ${
                            isFigmaPhase(thought.phase)
                              ? "text-blue-600"
                              : "text-purple-600"
                          }`}
                        />
                      ) : (
                        <ChevronRight
                          className={`w-4 h-4 flex-shrink-0 ${
                            isFigmaPhase(thought.phase)
                              ? "text-blue-600"
                              : "text-purple-600"
                          }`}
                        />
                      )}
                      <span
                        className={`text-sm font-semibold ${
                          isFigmaPhase(thought.phase)
                            ? "text-blue-700"
                            : "text-purple-700"
                        }`}
                      >
                        {thought.title}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          isFigmaPhase(thought.phase)
                            ? "bg-blue-100 text-blue-600"
                            : "bg-purple-100 text-purple-600"
                        }`}
                      >
                        {thought.nodeCount} 步骤
                      </span>
                    </div>
                    <span className="text-xs text-gray-600 ml-6">
                      {thought.description}
                    </span>

                    {/* 展开时显示节点详情 */}
                    {thought.expanded && thought.nodeDetails && (
                      <div
                        className={`ml-6 mt-2 space-y-2 border-l-2 pl-3 ${
                          isFigmaPhase(thought.phase)
                            ? "border-blue-200"
                            : "border-purple-200"
                        }`}
                      >
                        {thought.nodeDetails.map((node) => (
                          <div key={node.key} className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                              <span className="text-xs font-medium text-gray-700">
                                {node.title}
                              </span>
                            </div>
                            {node.description && (
                              <span className="text-xs text-gray-500 ml-5">
                                {node.description}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  /* 节点级：保持原样式 */
                  <>
                    <span
                      className={`text-sm font-medium ${thought.status === "pending" ? "text-blue-600" : "text-gray-700"}`}
                    >
                      {thought.title}
                    </span>
                    {thought.description && (
                      <span className="text-xs text-gray-500 leading-tight">
                        {thought.description}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
