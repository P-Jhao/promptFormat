/**
 * Mock 配置
 *
 * 前端当前只暴露全局 Mock 开关，后端仍保留分层 MockConfig 的解析能力。
 */
export interface MockConfig {
  global: boolean;
}
