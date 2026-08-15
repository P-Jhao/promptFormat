"use client";

import { Bubble, Sender } from "@ant-design/x";
import { useChat } from "@/hooks/useChat";
import { useChatStore } from "@/store/chatStore";
import { Plus, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { IMG_UPLOAD_URL } from "@/constants/config";
import type { MockConfig } from "@/types/mock";
import { MockModeToggle } from "./MockModeToggle";
import { ThoughtChain } from "./ThoughtChain";
import { VersionCard } from "./VersionCard";

/**
 * ChatPanel (Ant Design X version)
 *
 * 职责：
 * - 使用 antd/x 组件组织 AI Chat UI
 * - 不关心消息如何产生
 * - 不关心 Preview / Sandpack
 */
export function ChatPanel() {
  const { messages, isLoading, sendMessage, cancelMessage } = useChat();
  const messageThoughts = useChatStore((state) => state.messageThoughts); // ✨ 获取 thoughts 映射
  const versions = useChatStore((state) => state.versions); // 获取版本历史
  const projectName = useChatStore((state) => state.projectName); // 获取项目名称
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<
    Array<{ id: string; url: string; name: string; type: "image" | "design" }>
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"info" | "warning" | "error">(
    "info",
  );
  const [inputValue, setInputValue] = useState(""); // ✨ 添加输入框状态
  const [mockConfig, setMockConfig] = useState<MockConfig>({ global: true });

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (
    msg: string,
    type: "info" | "warning" | "error" = "info",
  ) => {
    setToastMessage(msg);
    setToastType(type);
  };

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isLoading, attachedFiles]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    e.target.value = "";

    // 判断文件类型
    const ext = file.name.toLowerCase().split(".").pop() || "";
    const isDesignFile = ["fig", "sketch", "xd", "psd"].includes(ext);

    // ⚠️ 互斥策略：检测已上传的文件类型
    const hasDesignFile = attachedFiles.some((f) => f.type === "design");
    const hasImageFile = attachedFiles.some((f) => f.type === "image");

    if (isDesignFile && hasImageFile) {
      showToast("不能同时上传设计文件和图片，请先移除已上传的图片", "warning");
      return;
    }

    if (!isDesignFile && hasDesignFile) {
      showToast(
        "不能同时上传图片和设计文件，请先移除已上传的设计文件",
        "warning",
      );
      return;
    }

    // 限制数量：设计文件最多1个，图片最多3个
    if (isDesignFile && hasDesignFile) {
      showToast("最多只能上传 1 个设计文件", "warning");
      return;
    }

    if (!isDesignFile && attachedFiles.length >= 3) {
      showToast("最多只能上传 3 张图片", "warning");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(IMG_UPLOAD_URL, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const data = await res.json();
      const fullUrl = data.url; // OSS 返回的已经是完整 URL

      console.log("Uploaded file:", {
        name: file.name,
        url: fullUrl,
        type: isDesignFile ? "design" : "image",
      });

      setAttachedFiles((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          url: fullUrl,
          name: file.name,
          type: isDesignFile ? "design" : "image",
        },
      ]);
    } catch (err) {
      console.error("Upload error:", err);
      showToast("文件上传失败，请重试", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="flex h-full flex-col relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div
            className={`text-white text-sm px-4 py-2.5 rounded-lg shadow-lg ${
              toastType === "warning"
                ? "bg-orange-500"
                : toastType === "error"
                  ? "bg-red-500"
                  : "bg-gray-800"
            }`}
          >
            {toastMessage}
          </div>
        </div>
      )}

      {/* Fullscreen Image Preview */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-8 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-h-full max-w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage}
              alt="Preview"
              className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl object-contain"
            />
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        hidden
        accept="image/*,.fig,.sketch,.xd,.psd"
        onChange={handleFileSelect}
      />

      {/* Chat messages */}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-4">
            {/* 只在消息有内容或附件时才显示 Bubble */}
            {(msg.content || msg.attachments?.length) && (
              <Bubble.List
                items={[
                  {
                    key: msg.id,
                    role: msg.role === "user" ? "user" : "model",
                    placement: msg.role === "user" ? "end" : "start",
                    // 图片预览需要使用 content 属性传入 ReactNode
                    content: (
                      <div className="flex flex-col gap-2">
                        {msg.attachments?.map((att) => {
                          // 从 URL 判断文件类型（发送后的消息只有 url）
                          const isDesignFile = att.url.includes("/designs/");

                          if (isDesignFile) {
                            // 设计文件：显示文件卡片
                            const fileName =
                              att.url.split("/").pop() || "设计文件";
                            const ext =
                              fileName.split(".").pop()?.toLowerCase() || "";

                            // 根据文件类型设置颜色
                            const colorMap: Record<
                              string,
                              {
                                gradient: string;
                                icon: string;
                                label: string;
                                shortText: string;
                              }
                            > = {
                              fig: {
                                gradient: "from-purple-500 to-pink-500",
                                icon: "text-purple-600",
                                label: "Figma",
                                shortText: "FIG",
                              },
                              sketch: {
                                gradient: "from-yellow-500 to-orange-500",
                                icon: "text-orange-600",
                                label: "Sketch",
                                shortText: "SKT",
                              },
                              xd: {
                                gradient: "from-pink-500 to-rose-500",
                                icon: "text-pink-600",
                                label: "Adobe XD",
                                shortText: "XD",
                              },
                              psd: {
                                gradient: "from-blue-500 to-cyan-500",
                                icon: "text-blue-600",
                                label: "Photoshop",
                                shortText: "PSD",
                              },
                            };
                            const colors = colorMap[ext] || colorMap.fig;

                            return (
                              <div
                                key={att.url}
                                className="max-w-[300px] p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 group cursor-default"
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-sm flex-shrink-0`}
                                  >
                                    <span className="text-white font-bold text-xs">
                                      {colors.shortText}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-gray-900 truncate mb-0.5">
                                      {decodeURIComponent(fileName)}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors.icon} bg-white border border-gray-200`}
                                      >
                                        {colors.label}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        设计文件
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          // 图片：显示图片预览
                          return (
                            <div
                              key={att.url}
                              className="max-w-[300px] rounded-lg overflow-hidden border border-gray-200 cursor-zoom-in hover:opacity-95 transition-opacity"
                              onClick={() => setPreviewImage(att.url)}
                            >
                              <Image
                                src={att.url}
                                alt="attachment"
                                width={0}
                                height={0}
                                sizes="100vw"
                                style={{ width: "100%", height: "auto" }}
                                unoptimized
                              />
                            </div>
                          );
                        })}
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    ),
                  },
                ]}
              />
            )}

            {/* Thought Chain Display - 仅为assistant消息显示 */}
            {msg.role === "assistant" &&
              messageThoughts[msg.id] &&
              messageThoughts[msg.id].length > 0 && (
                <div className="mt-2 flex justify-start pl-2">
                  <ThoughtChain thoughts={messageThoughts[msg.id]} />
                </div>
              )}

            {/* Version Card Display - 为每个assistant消息显示对应版本 */}
            {msg.role === "assistant" &&
              (() => {
                // 获取所有assistant消息
                const assistantMessages = messages.filter(
                  (m) => m.role === "assistant",
                );
                // 找到当前消息在assistant消息列表中的索引
                const messageIndex = assistantMessages.findIndex(
                  (m) => m.id === msg.id,
                );
                // 获取对应索引的版本
                const correspondingVersion = versions[messageIndex];

                // 如果找到了对应的版本，显示版本卡片
                if (correspondingVersion) {
                  return (
                    <div className="mt-2 w-full px-2">
                      <VersionCard
                        version={correspondingVersion}
                        projectName={projectName}
                      />
                    </div>
                  );
                }
                return null;
              })()}
          </div>
        ))}
      </div>

      {/* Prompt input */}
      <div className="shrink-0 border-t border-gray-200 p-2">
        {/* Preview Area */}
        {attachedFiles.length > 0 && (
          <div className="flex gap-2 mb-2 px-2 pt-2 overflow-x-auto">
            {attachedFiles.map((file) => (
              <div key={file.id} className="relative group shrink-0">
                {file.type === "image" ? (
                  <Image
                    src={file.url}
                    alt={file.name}
                    width={64}
                    height={64}
                    className="h-16 w-16 object-cover rounded-md border border-gray-200 cursor-zoom-in"
                    unoptimized
                    onClick={() => setPreviewImage(file.url)}
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-sm border border-purple-300">
                    <span className="text-white font-bold text-xs">
                      {file.name.toLowerCase().endsWith(".fig")
                        ? "FIG"
                        : file.name.toLowerCase().endsWith(".sketch")
                          ? "SKT"
                          : file.name.toLowerCase().endsWith(".xd")
                            ? "XD"
                            : "PSD"}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(file.id)}
                  className="absolute -top-1 -right-1 bg-gray-900 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <MockModeToggle
          enabled={mockConfig.global}
          onChange={(global) => setMockConfig({ global })}
        />

        <Sender
          value={inputValue}
          onChange={setInputValue}
          prefix={
            <button
              className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100 transition-colors"
              onClick={() => {
                const hasDesignFile = attachedFiles.some(
                  (f) => f.type === "design",
                );
                const hasImageFile = attachedFiles.some(
                  (f) => f.type === "image",
                );

                // 检测是否达到上限
                if (hasDesignFile) {
                  showToast("最多只能上传 1 个设计文件", "warning");
                  return;
                }

                if (hasImageFile && attachedFiles.length >= 3) {
                  showToast("最多只能上传 3 张图片", "warning");
                  return;
                }

                fileInputRef.current?.click();
              }}
              disabled={isUploading}
            >
              {isUploading ? (
                <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
              ) : (
                <Plus size={18} />
              )}
            </button>
          }
          placeholder="今天你想构建什么样的应用？"
          loading={isLoading}
          onCancel={cancelMessage}
          onSubmit={(value) => {
            if (!value?.trim() && attachedFiles.length === 0) return;

            // Map ui attachments to message attachments
            const msgAttachments = attachedFiles.map((f) => ({
              type: "image" as const,
              url: f.url,
            }));

            sendMessage(
              value || " ",
              msgAttachments.length > 0 ? msgAttachments : undefined,
              mockConfig,
            );

            // Clear attachments and input
            setAttachedFiles([]);
            setInputValue(""); // ✨ 清空输入框
          }}
        />
      </div>
    </div>
  );
}
