/**
 * API配置文件
 * 根据环境自动切换API基础URL
 */

// 从环境变量获取API基础URL，如果没有则使用默认值
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

/**
 * 获取完整的API URL
 * @param endpoint API端点，如 '/poker/suggestion'
 * @returns 完整的API URL
 */
export function getApiUrl(endpoint: string): string {
  // 确保endpoint以/开头
  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  // 如果endpoint已经是完整URL，直接返回
  if (normalizedEndpoint.startsWith("http")) {
    return normalizedEndpoint;
  }

  // 组合基础URL和端点
  return `${API_BASE_URL}${normalizedEndpoint}`;
}

/**
 * 获取API基础URL
 * @returns API基础URL
 */
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

/**
 * 当前是否为生产环境
 */
export const isProduction = import.meta.env.MODE === "production";

/**
 * 当前是否为开发环境
 */
export const isDevelopment = import.meta.env.MODE === "development";
