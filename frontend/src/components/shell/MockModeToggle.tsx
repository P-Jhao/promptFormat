"use client";

import { CircleHelp } from "lucide-react";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

interface MockModeToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function MockModeToggle({
  enabled,
  onChange,
}: MockModeToggleProps) {
  const tooltipId = useId();
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const isTooltipVisible = isHovered || isFocused;

  const updateTooltipPosition = useCallback(() => {
    const infoButton = infoButtonRef.current;

    if (infoButton === null) {
      return;
    }

    const buttonRect = infoButton.getBoundingClientRect();
    setTooltipPosition({
      left: buttonRect.left + buttonRect.width / 2,
      top: buttonRect.top - 8,
    });
  }, []);

  useEffect(() => {
    if (!isTooltipVisible) {
      return;
    }

    updateTooltipPosition();

    const handleViewportChange = () => {
      updateTooltipPosition();
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isTooltipVisible, updateTooltipPosition]);

  const handleTooltipTrigger = () => {
    updateTooltipPosition();
  };

  const tooltip =
    isTooltipVisible &&
    tooltipPosition !== null &&
    typeof document !== "undefined"
      ? createPortal(
          <span
            id={tooltipId}
            role="tooltip"
            className="pointer-events-none fixed z-[100] w-72 -translate-x-1/2 -translate-y-full rounded-lg bg-gray-900 px-3 py-2 text-xs leading-5 text-white shadow-lg"
            style={{
              left: tooltipPosition.left,
              top: tooltipPosition.top,
            }}
          >
            Mock 模式展示预生成项目，响应更快更稳定；关闭后使用真实大模型，耗时更长且可能失败。
          </span>,
          document.body,
        )
      : null;

  return (
    <div className="flex items-center gap-2 px-2 pb-2">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={`Mock 模式${enabled ? "已开启" : "已关闭"}`}
        onClick={() => onChange(!enabled)}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
          enabled
            ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
            : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
        }`}
      >
        <span>Mock 模式</span>
        <span
          aria-hidden="true"
          className={`relative h-4 w-7 rounded-full transition-colors ${
            enabled ? "bg-blue-500" : "bg-gray-300"
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${
              enabled ? "translate-x-3" : "translate-x-0"
            }`}
          />
        </span>
      </button>

      <span className="inline-flex">
        <button
          ref={infoButtonRef}
          type="button"
          aria-label="关于 Mock 模式"
          aria-describedby={tooltipId}
          onMouseEnter={() => {
            handleTooltipTrigger();
            setIsHovered(true);
          }}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => {
            handleTooltipTrigger();
            setIsFocused(true);
          }}
          onBlur={() => setIsFocused(false)}
          className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <CircleHelp size={16} aria-hidden="true" />
        </button>
      </span>

      {tooltip}
    </div>
  );
}
