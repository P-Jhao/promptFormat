// 聊天相关自定义 Hook
"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { ChatMessage } from "@/types/message";
import { generateAppStream } from "@/services/api";
import { useChatStore } from "@/store/chatStore";
import { useSandpackStore } from "@/store/sandpackStore";
import type { ErrorStreamEvent, StreamEvent } from "@/types/api";
import type { BackendFlowType, StepType } from "@/types/flow";
import type { MockConfig } from "@/types/mock";
import { FLOW_CONFIG, NEXT_STEP_MAP, getPhaseByNode } from "@/constants/chat";
import {
  findPendingThoughtKey,
  getFilesPayload,
  getIntentProductName,
  getStreamErrorDetails,
  getThoughtDetails,
  isAbortError,
  type ActiveRequest,
  type TraditionalVersionContext,
} from "./chatStreamUtils";

export function useChat() {
  const {
    messages,
    isLoading,
    addMessage,
    appendMessageContent,
    setLoading,
    addThought,
    updateThought,
    archiveThoughts,
    updatePhaseProgress,
    collapsePhase,
    updateProjectName,
    incrementVersion,
    getCurrentThreadId,
    saveVersion,
    setCurrentFlow,
  } = useChatStore();
  const { setGeneratedFiles, setIsAssembling } = useSandpackStore();
  const activeRequestRef = useRef<ActiveRequest | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    return () => {
      const activeRequest = activeRequestRef.current;
      activeRequestRef.current = null;
      activeRequest?.controller.abort();
    };
  }, []);

  const sendMessage = useCallback(
    async (
      content: string,
      attachments: { type: "image"; url: string }[] | undefined,
      mockConfig: MockConfig,
    ) => {
      if (
        useChatStore.getState().isLoading ||
        activeRequestRef.current !== null
      ) {
        return;
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const controller = new AbortController();
      activeRequestRef.current = { id: requestId, controller };
      const isCurrentRequest = () =>
        activeRequestRef.current?.id === requestId && !controller.signal.aborted;

      const requestState = useChatStore.getState();
      const projectId = requestState.currentProjectId;
      const previousAssistantId = [...requestState.messages]
        .reverse()
        .find((message) => message.role === "assistant")?.id;
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        attachments,
      };
      const currentHistory = [...requestState.messages, userMessage];

      addMessage(userMessage);
      setLoading(true);
      setCurrentFlow(null);

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
      };
      const assistantId = assistantMessage.id;
      addMessage(assistantMessage);

      let activeFlow: BackendFlowType | null = null;
      let versionContext: TraditionalVersionContext | null = null;
      let streamFailed = false;
      let hasSavedVersion = false;
      let hasShownMockWarning = false;

      const handleStreamError = (event: ErrorStreamEvent) => {
        streamFailed = true;
        const { node, message } = getStreamErrorDetails(event);

        if (activeFlow === "traditional") {
          const thoughtKey = node
            ? findPendingThoughtKey(assistantId, node)
            : undefined;
          if (thoughtKey) {
            updateThought(assistantId, thoughtKey, {
              status: "error",
              description: message,
              content: JSON.stringify(event.data, null, 2),
            });
          } else {
            addThought(assistantId, {
              key: `error-${Date.now()}`,
              title: "发生错误",
              description: node ? `${node}: ${message}` : message,
              status: "error",
            });
          }
        } else {
          // Chat 错误不创建思维链，已收到的增量内容保持不变。
          toast.error(message);
        }

        setIsAssembling(false);
        activeRequestRef.current = null;
        controller.abort();
        setLoading(false);
      };

      try {
        await generateAppStream(
          {
            messages: currentHistory,
            projectId,
            mockConfig,
          },
          (event: StreamEvent) => {
            if (!isCurrentRequest() || streamFailed) {
              return;
            }

            switch (event.type) {
              case "flow": {
                if (activeFlow !== null) {
                  return;
                }

                activeFlow = event.data.flow;
                setCurrentFlow(activeFlow);

                if (activeFlow !== "traditional") {
                  return;
                }

                if (previousAssistantId) {
                  archiveThoughts(previousAssistantId);
                }

                const stateAtFlowStart = useChatStore.getState();
                const operation: "create" | "edit" =
                  stateAtFlowStart.versions.length > 0
                    ? "edit"
                    : "create";
                const versionNumber = incrementVersion();
                const threadId = getCurrentThreadId();
                versionContext = { versionNumber, threadId, operation };

                const initialType: StepType =
                  FLOW_CONFIG.traditional.initialStep ?? "analysis";
                const initialDetails = getThoughtDetails(
                  initialType,
                  "pending",
                );
                addThought(assistantId, {
                  key: initialType,
                  type: "node",
                  phase: getPhaseByNode(initialType),
                  title: initialDetails.title,
                  description: initialDetails.description,
                  status: "pending",
                });
                return;
              }

              case "chat":
                if (activeFlow === "chat") {
                  appendMessageContent(assistantId, event.data.delta);
                }
                return;

              case "done":
                return;

              case "error":
                handleStreamError(event);
                return;

              default: {
                if (activeFlow !== "traditional") {
                  return;
                }

                const stepType = event.type;
                const stepData = event.data;
                if (stepType === "files" || stepType === "figmaAssembly") {
                  const files = getFilesPayload(stepData);
                  if (files) {
                    setGeneratedFiles(files);

                    if (versionContext && !hasSavedVersion) {
                      saveVersion({
                        versionNumber: versionContext.versionNumber,
                        threadId: versionContext.threadId,
                        assistantMessageId: assistantId,
                        operation: versionContext.operation,
                        prompt: content,
                        timestamp: Date.now(),
                        files,
                        fileCount: Object.keys(files).length,
                        changes: undefined,
                      });
                      hasSavedVersion = true;
                    }

                    if (mockConfig.global && !hasShownMockWarning) {
                      toast.warning(
                        "当前项目使用模拟数据，如需真实项目体验，请关闭输入框中的 Mock 模式。",
                      );
                      hasShownMockWarning = true;
                    }
                  }
                }

                if (stepType === "intent") {
                  const productName = getIntentProductName(stepData);
                  if (productName) {
                    updateProjectName(productName);
                  }
                }

                const currentStepDetails = getThoughtDetails(
                  stepType,
                  "success",
                  stepData,
                );
                updateThought(assistantId, stepType, {
                  status: "success",
                  description: currentStepDetails.description,
                  content: JSON.stringify(stepData, null, 2),
                });

                const currentPhase = getPhaseByNode(stepType);
                if (currentPhase) {
                  updatePhaseProgress(currentPhase);
                  const phaseInfo =
                    useChatStore.getState().phaseCompletion[currentPhase];
                  if (phaseInfo && phaseInfo.completed === phaseInfo.total) {
                    collapsePhase(assistantId, currentPhase);
                  }
                }

                const nextType = NEXT_STEP_MAP[stepType];
                if (nextType && nextType !== "done") {
                  if (nextType === "app") {
                    setIsAssembling(true);
                  }

                  const nextDetails = getThoughtDetails(nextType, "pending");
                  addThought(assistantId, {
                    key: nextType,
                    type: "node",
                    phase: getPhaseByNode(nextType),
                    title: nextDetails.title,
                    description: nextDetails.description,
                    status: "pending",
                  });
                }
              }
            }
          },
          controller.signal,
        );
      } catch (error) {
        if (
          controller.signal.aborted ||
          isAbortError(error) ||
          !isCurrentRequest()
        ) {
          return;
        }

        console.error("Generate App Error:", error);
        setIsAssembling(false);
        if (activeFlow === "traditional") {
          addThought(assistantId, {
            key: `error-${Date.now()}`,
            title: "发生错误",
            description: error instanceof Error ? error.message : "未知错误",
            status: "error",
          });
        } else {
          toast.error(error instanceof Error ? error.message : "未知错误");
        }
        setLoading(false);
      } finally {
        if (activeRequestRef.current?.id === requestId) {
          activeRequestRef.current = null;
          setLoading(false);
        }
      }
    },
    [
      addMessage,
      appendMessageContent,
      setLoading,
      addThought,
      updateThought,
      archiveThoughts,
      updatePhaseProgress,
      collapsePhase,
      updateProjectName,
      incrementVersion,
      getCurrentThreadId,
      saveVersion,
      setCurrentFlow,
      setGeneratedFiles,
      setIsAssembling,
    ],
  );

  const cancelMessage = useCallback(() => {
    const activeRequest = activeRequestRef.current;
    if (activeRequest === null) {
      return;
    }

    activeRequestRef.current = null;
    activeRequest.controller.abort();
    setLoading(false);
    setIsAssembling(false);
  }, [setIsAssembling, setLoading]);

  return {
    messages,
    isLoading,
    sendMessage,
    cancelMessage,
  };
}
