/**
 * 将模型名称转换为小驼峰命名。
 *
 * 例如：Project -> project，TeamMember -> teamMember。
 */
export function toLowerCamelCase(value: string): string {
  const words = value
    .trim()
    .split(/[^a-zA-Z0-9]+/)
    .filter((word) => word.length > 0);

  if (words.length === 0) {
    throw new Error("Naming value cannot be empty");
  }

  const [firstWord, ...restWords] = words;
  const first = `${firstWord.slice(0, 1).toLowerCase()}${firstWord.slice(1)}`;
  const rest = restWords
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join("");

  return `${first}${rest}`;
}

/**
 * 根据领域模型名称生成统一的 Service 文件路径。
 */
export function getServiceFilePath(modelId: string): string {
  return `/services/${toLowerCamelCase(modelId)}Service.ts`;
}
