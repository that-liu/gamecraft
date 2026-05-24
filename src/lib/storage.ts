import { GameProject } from './types';
const API = '/api/storage';
export async function listProjects(): Promise<GameProject[]> { const r = await fetch(API); return r.json(); }
export async function getProject(id: string): Promise<GameProject|null> { const r = await fetch(`${API}?id=${id}`); if (!r.ok) return null; return r.json(); }
export async function saveProject(p: GameProject): Promise<void> { await fetch(API, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(p) }); }
export async function deleteProject(id: string): Promise<void> { await fetch(`${API}?id=${id}`, { method:'DELETE' }); }
