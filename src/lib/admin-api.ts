import { API_BASE_URL } from './api-config';
import { getToken } from './auth-api';

export interface AdminOverview {
  userCount: number;
  adminCount: number;
  trackCount: number;
}

export interface AdminUser {
  _id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  qqConnected?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTrack {
  _id: string;
  name: string;
  artist: string;
  category: 'victory' | 'defeat' | 'neutral';
  duration: number;
  url: string;
  tags: string[];
  plays: number;
}

async function adminRequest<T>(path: string): Promise<T> {
  const token = getToken();
  if (!token) throw new Error('请先登录管理员账号');

  const response = await fetch(`${API_BASE_URL}/admin${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || '后台请求失败');
  return data;
}

export const getAdminOverview = () => adminRequest<AdminOverview>('/overview');
export const getAdminUsers = () => adminRequest<AdminUser[]>('/users');

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  if (!token) throw new Error('请先登录管理员账号');

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || '后台请求失败');
  return data;
}

export const getAdminTracks = () => apiRequest<AdminTrack[]>('/tracks');
export const deleteAdminTrack = (id: string) => apiRequest<{ message: string }>(`/tracks/${id}`, { method: 'DELETE' });

export async function uploadAdminTrack(file: File, name: string, category: 'victory' | 'defeat'): Promise<AdminTrack> {
  const formData = new FormData();
  formData.append('audio', file);
  const uploaded = await apiRequest<{ url: string }>('/upload', { method: 'POST', body: formData });

  return apiRequest<AdminTrack>('/tracks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      artist: '',
      duration: 0,
      url: uploaded.url,
      platform: 'upload',
      category,
      tags: [],
    }),
  });
}
