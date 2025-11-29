/**
 * Response Utilities
 * 响应工具函数
 */

import type { ApiResponse } from '../types';

/**
 * 创建成功响应
 */
export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
    return {
        success: true,
        data,
        ...(message && { message }),
    };
}

/**
 * 创建错误响应
 */
export function errorResponse(error: string): ApiResponse {
    return {
        success: false,
        error,
    };
}

/**
 * 处理异步操作并返回统一格式
 */
export async function handleAsync<T>(
    operation: () => Promise<T>,
    errorMessage = 'Operation failed'
): Promise<ApiResponse<T>> {
    try {
        const data = await operation();
        return successResponse(data);
    } catch (error) {
        const message = error instanceof Error ? error.message : errorMessage;
        return errorResponse(message);
    }
}
