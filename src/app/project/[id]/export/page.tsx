'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { GameProject, GameMechanic, GameLevel, GameCharacter, GameQuest } from '@/lib/types';
import { getProject } from '@/lib/storage';
import Link from 'next/link';

function generateMarkdown(p: GameProject): string {
  const lines: string[] = [];
  lines.push(`# 🎮 ${p.title} - 游戏设计文档 (GDD)`);
  lines.push('');
  lines.push(`> **类型**: ${p.genre || '未设定'} | **平台**: ${p.platform || '未设定'}`);
  lines.push(`> **创建**: ${p.createdAt ? new Date(p.createdAt).toLocaleDateString('zh-CN') : '-'} | **更新**: ${p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('zh-CN') : '-'}`);
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('## 📋 游戏概述');
  lines.push('');
  lines.push(p.description || '（未填写）');
  lines.push('');
  lines.push('## 👥 目标用户');
  lines.push('');
  lines.push(p.targetAudience || '（未填写）');
  lines.push('');
  lines.push('## 🔄 核心玩法');
  lines.push('');
  lines.push(p.coreLoop || '（未填写）');
  lines.push('');
  lines.push('## 💎 商业模式');
  lines.push('');
  lines.push(p.usp || '（未填写）');
  lines.push('');

  if (p.mechanics && p.mechanics.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## ⚙️ 游戏机制');
    lines.push('');
    for (const m of p.mechanics) {
      lines.push(`### ${m.name}`);
      lines.push('');
      lines.push(m.description || '（无描述）');
      if (m.rules) lines.push(`\n规则：${m.rules}`);
      lines.push('');
    }
  }

  if (p.levels && p.levels.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## 🗺️ 关卡设计');
    lines.push('');
    const sorted = [...p.levels].sort((a, b) => a.order - b.order);
    for (const l of sorted) {
      lines.push(`### ${l.name}`);
      lines.push('');
      if (l.environment) lines.push(`- **环境**: ${l.environment}`);
      if (l.objectives) lines.push(`- **目标**: ${l.objectives}`);
      if (l.enemies) lines.push(`- **敌人**: ${l.enemies}`);
      if (l.items) lines.push(`- **道具**: ${l.items}`);
      if (l.notes) lines.push(`- **备注**: ${l.notes}`);
      lines.push('');
    }
  }

  if (p.characters && p.characters.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## 👤 角色设计');
    lines.push('');
    for (const c of p.characters) {
      const typeLabel = { hero: '英雄', npc: 'NPC', enemy: '敌人', boss: 'Boss' }[c.type] || c.type;
      lines.push(`### ${c.name} (${typeLabel})`);
      lines.push('');
      if (c.appearance) lines.push(`- **外观**: ${c.appearance}`);
      if (c.abilities) lines.push(`- **能力**: ${c.abilities}`);
      if (c.personality) lines.push(`- **性格**: ${c.personality}`);
      if (c.backstory) lines.push(`- **背景**: ${c.backstory}`);
      lines.push('');
    }
  }

  if (p.quests && p.quests.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## 📜 任务系统');
    lines.push('');
    const sorted = [...p.quests].sort((a, b) => a.order - b.order);
    for (const q of sorted) {
      const typeLabel = q.type === 'main' ? '主线' : '支线';
      lines.push(`### ${q.name} (${typeLabel})`);
      lines.push('');
      if (q.giver) lines.push(`- **给予者**: ${q.giver}`);
      if (q.objectives) lines.push(`- **目标**: ${q.objectives}`);
      if (q.rewards) lines.push(`- **奖励**: ${q.rewards}`);
      if (q.dialogue) lines.push(`- **对话**: ${q.dialogue}`);
      if (q.prerequisites) lines.push(`- **前置条件**: ${q.prerequisites}`);
      lines.push('');
    }
  }

  if (p.notes) {
    lines.push('---');
    lines.push('');
    lines.push('## 📝 备注');
    lines.push('');
    lines.push(p.notes);
    lines.push('');
  }

  return lines.join('\n');
}

function generateHTML(p: GameProject): string {
  const md = generateMarkdown(p);
  // Simple markdown-to-HTML conversion
  let html = md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^- \*\*(.+?)\*\*: (.+)$/gm, '<li><strong>$1</strong>: $2</li>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, (match) => {
      if (match.startsWith('<')) return match;
      return match;
    });
  return `<html><head><meta charset="utf-8"><title>${p.title} - GDD</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.8;color:#333}h1{color:#7c3aed}h2{color:#4c1d95;border-bottom:2px solid #e9d5ff;padding-bottom:4px}h3{color:#5b21b6}blockquote{background:#f5f3ff;border-left:4px solid #7c3aed;padding:8px 16px;color:#666}hr{border:none;border-top:1px solid #e9d5ff}li{list-style:disc inside}</style></head><body>${html}</body></html>`;
}

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<GameProject | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getProject(id as string).then(p => { if (p) setProject(p); });
  }, [id]);

  const copyMarkdown = useCallback(async () => {
    if (!project) return;
    await navigator.clipboard.writeText(generateMarkdown(project));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [project]);

  const stats = project ? {
    levels: project.levels?.length || 0,
    characters: project.characters?.length || 0,
    quests: project.quests?.length || 0,
    mechanics: project.mechanics?.length || 0,
  } : null;

  if (!project) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href={`/project/${id}`} className="text-sm text-gray-400 hover:text-gray-600">&#8592; 返回项目</Link>
        <div className="text-gray-400 mt-8 text-center">加载中...</div>
      </div>
    );
  }

  const preview = generateMarkdown(project);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href={`/project/${id}`} className="text-sm text-gray-400 hover:text-gray-600">&#8592; 返回项目</Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-6">📦 导出 GDD</h1>

      {/* Export actions */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 shadow-sm">
        <h2 className="text-sm font-bold text-gray-800 mb-3">导出选项</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => download(generateMarkdown(project), `${project.title}-GDD.md`, 'text/markdown')}
            className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700"
          >
            📥 导出 Markdown
          </button>
          <button
            onClick={() => download(generateHTML(project), `${project.title}-GDD.html`, 'text/html')}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700"
          >
            🌐 导出 HTML
          </button>
          <button
            onClick={() => download(generateMarkdown(project), `${project.title}-GDD.txt`, 'text/plain')}
            className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700"
          >
            📄 导出 TXT
          </button>
          <button
            onClick={copyMarkdown}
            className="border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50"
          >
            {copied ? '✓ 已复制' : '📋 复制全文'}
          </button>
        </div>

        {stats && (
          <div className="flex gap-4 mt-4 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">📊 内容统计：</span>
            <span className="text-xs text-gray-500">{stats.mechanics} 个机制</span>
            <span className="text-xs text-gray-500">{stats.levels} 个关卡</span>
            <span className="text-xs text-gray-500">{stats.characters} 个角色</span>
            <span className="text-xs text-gray-500">{stats.quests} 个任务</span>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800">📋 文档预览</h2>
        </div>
        <div className="p-6">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">{preview}</pre>
        </div>
      </div>
    </div>
  );
}
