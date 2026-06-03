import type { AuthResponse, User } from '../types';
import { API_BASE_URL } from './api-config';

const TOKEN_KEY = 'user_token';
let token: string | null = localStorage.getItem(TOKEN_KEY);

export const setToken = (newToken: string) => {
  token = newToken;
  localStorage.setItem(TOKEN_KEY, newToken);
};

export const getToken = () => token;
export const isLoggedIn = () => !!token;

export const clearToken = () => {
  token = null;
  localStorage.removeItem(TOKEN_KEY);
};

async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || fallback);
  return data;
}

export async function register(username: string, email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await parseResponse<AuthResponse>(response, '注册失败');
  if (data.token) setToken(data.token);
  return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseResponse<AuthResponse>(response, '登录失败');
  if (data.token) setToken(data.token);
  return data;
}

export async function getCurrentUser(): Promise<User> {
  if (!token) throw new Error('请先登录');
  return parseResponse<User>(await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  }), '获取用户信息失败');
}

export async function updateUser(username?: string, email?: string): Promise<AuthResponse> {
  if (!token) throw new Error('请先登录');
  const data = await parseResponse<AuthResponse>(await fetch(`${API_BASE_URL}/auth/update`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ username, email }),
  }), '更新用户信息失败');
  if (data.token) setToken(data.token);
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<string> {
  if (!token) throw new Error('请先登录');
  const data = await parseResponse<{ message: string }>(await fetch(`${API_BASE_URL}/auth/change-password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  }), '修改密码失败');
  return data.message;
}
