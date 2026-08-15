/**
 * AST 修复器
 *
 * 提供顶层 API，将所有 AST 分析和修复能力整合为一个简单的调用。
 * 这是外部代码（如 LangGraph 节点）调用的主要入口。
 */

import type { FixResult, RuleContext } from "./types.js";
import { createRuleEngine, RuleEngine } from "./ruleEngine.js";
import { getBuiltinRules } from "./rules/index.js";
import { analyzeTypes } from "./typeAnalyzer.js";
import { shouldProcessFile } from "./parser.js";

/**
 * 对 Sandpack 文件集合进行 AST 后处理
 *
 * 使用流程：
 * 1. 从 types/*.ts 文件中提取类型信息
 * 2. 对 components/*.tsx, pages/*.tsx, hooks/*.ts 等文件执行规则检查
 * 3. 自动修复发现的问题
 * 4. 返回修复后的文件集合
 *
 * @param files - Sandpack 格式文件集合 Record<string, string>
 * @returns { files, result } - 修复后的文件集合和详细报告
 */
export function postProcessFiles(files: Record<string, string>): {
  files: Record<string, string>;
  result: FixResult;
} {
  const engine = createRuleEngine(getBuiltinRules());
  return engine.processAndApply(files);
}

/**
 * 仅检查（不修复），返回问题列表
 * 用于调试或干运行（dry-run）
 */
export function checkFiles(files: Record<string, string>): FixResult {
  const engine = createRuleEngine(getBuiltinRules());
  return engine.process(files);
}

/**
 * 打印修复报告到控制台
 */
export function printFixReport(result: FixResult): void {
  if (result.totalIssues === 0) {
    console.log("[AST PostProcess] ✅ 未发现问题");
    return;
  }

  console.log(
    `[AST PostProcess] 发现 ${result.totalIssues} 个问题，修复 ${result.totalFixes} 个 (${result.duration}ms)`,
  );

  for (const [filePath, fileResult] of result.files) {
    if (fileResult.issues.length === 0) continue;
    console.log(`  📄 ${filePath} (${fileResult.issues.length} issues)`);
    for (const issue of fileResult.issues) {
      console.log(
        `    L${issue.line}:${issue.column} [${issue.rule}] ${issue.message}`,
      );
      if (issue.fixDescription) {
        console.log(`      → ${issue.fixDescription}`);
      }
    }
  }
}

// ===================== 单文件处理 API（前移用） =====================

/** 缓存的规则引擎实例 */
let _cachedEngine: RuleEngine | null = null;

function getEngine(): RuleEngine {
  if (!_cachedEngine) {
    _cachedEngine = createRuleEngine(getBuiltinRules());
  }
  return _cachedEngine;
}

/**
 * 对单个生成的代码文件进行 AST 后处理
 *
 * 适用于在代码生成节点（component/page）内部直接调用，
 * 不需要等到组装阶段再统一处理。
 *
 * @param code - 生成的代码内容
 * @param fileName - 文件路径（如 "/components/NewsList.tsx"）
 * @param typeFiles - 类型文件数组 [{ path: "/types/News.ts", code: "export interface ..." }]
 * @returns 修复后的代码
 */
export function processGeneratedCode(
  code: string,
  fileName: string,
  typeFiles: Array<{ path: string; code?: string; content?: string }>,
): string {
  if (!code || !shouldProcessFile(fileName)) return code;

  try {
    // 将类型文件转为 Record<string, string> 格式供 analyzeTypes 使用
    const filesMap: Record<string, string> = {};
    for (const tf of typeFiles) {
      const content = tf.code || tf.content || "";
      if (content) {
        filesMap[tf.path] = content;
      }
    }
    // 将目标文件也放入（供规则上下文使用）
    filesMap[fileName] = code;

    // 分析类型
    const typeAnalysis = analyzeTypes(filesMap);

    // 构建上下文
    const context: RuleContext = {
      typeAnalysis,
      allFiles: filesMap,
    };

    // 执行修复
    const engine = getEngine();
    const result = engine.fix(code, fileName, context);

    if (result.appliedFixes > 0) {
      console.log(`[AST] ${fileName}: 修复 ${result.appliedFixes} 个问题`);
      for (const issue of result.issues) {
        console.log(
          `  L${issue.line}:${issue.column} [${issue.rule}] ${issue.message}`,
        );
      }
      return result.fixed;
    }

    return code;
  } catch (error) {
    // AST 处理失败不阻断生成流程
    console.warn(`[AST] ${fileName}: 处理失败，使用原始代码`, error);
    return code;
  }
}
