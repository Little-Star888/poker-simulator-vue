import type { SnapshotPage, SnapshotDetail } from "@/types";
import { getApiUrl } from "@/config/api";

/**
 * snapshot_api_service.ts
 *
 * 负责与后端 /api/snapshots/* 接口进行所有通信的服务模块
 */

/**
 * 从后端获取快照的摘要列表（支持分页）
 * @param page 页码 (0-based)
 * @param size 每页数量
 * @returns 包含快照摘要数组和分页信息的Page对象
 */
export async function getSnapshots(
  page: number = 0,
  size: number = 5,
): Promise<SnapshotPage> {
  const response = await fetch(
    `${getApiUrl("/poker/snapshots")}?page=${page}&size=${size}`,
  );
  if (!response.ok) {
    throw new Error(`获取快照列表失败: ${response.statusText}`);
  }
  return response.json();
}

/**
 * 根据ID从后端获取单个快照的完整信息
 * @param id 快照ID
 * @returns 完整的快照对象
 */
export async function getSnapshotById(id: number): Promise<SnapshotDetail> {
  const response = await fetch(`${getApiUrl("/poker/snapshots")}/${id}`);
  if (!response.ok) {
    throw new Error(`获取快照详情失败: ${response.statusText}`);
  }
  return response.json();
}

/**
 * 发送新的快照数据到后端进行创建
 * @param snapshotData 包含name, gameState, imageData, gtoSuggestions的对象
 * @returns 后端返回的已保存的快照对象
 */
export async function createSnapshot(
  snapshotData: any,
): Promise<SnapshotDetail> {
  const response = await fetch(getApiUrl("/poker/snapshots"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(snapshotData),
  });
  if (!response.ok) {
    throw new Error(`创建快照失败: ${response.statusText}`);
  }
  return response.json();
}

/**
 * 更新指定ID快照的指定信息（如名称、批注等）
 * @param id 快照ID
 * @param updateData 包含待更新字段的对象
 * @returns 后端返回的已更新的快照对象
 */
export async function updateSnapshot(
  id: number,
  updateData: any,
): Promise<SnapshotDetail> {
  const response = await fetch(`${getApiUrl("/poker/snapshots")}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updateData),
  });
  if (!response.ok) {
    throw new Error(`更新快照失败: ${response.statusText}`);
  }
  return response.json();
}

/**
 * 发送请求到后端删除指定ID的快照
 * @param id 快照ID
 */
export async function deleteSnapshotById(id: number): Promise<void> {
  const response = await fetch(`${getApiUrl("/poker/snapshots")}/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`删除快照失败: ${response.statusText}`);
  }
  // DELETE请求通常返回204 No Content，没有响应体
}
