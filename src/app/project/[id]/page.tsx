'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { GameProject } from '@/lib/types';
import { getProject, saveProject } from '@/lib/storage';
import Link from 'next/link';

const WORKFLOW_CARDS = [
  {
    key: 'gdd',
    title: '策划文档',
    icon: '📋',
    desc: '游戏概述、目标用户、核心玩法、商业模型',
    color: 'border-l-purple-500',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    getStat: (p: GameProject) => {
      const filled = [p.description, p.targetAudience, p.coreLoop, p.usp].filter(Boolean).length;
      return `${filled}/4`;
    },
  },
  {
    key: 'mechanics',
    title: '机制设计',
    icon: '⚙️',
    desc: '核心循环、战斗系统、成长系统、经济系统',
    color: 'border-l-blue-500',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    getStat: (p: GameProject) => `${p.mechanics?.length || 0} 个`,
  },
  {
    key: 'levels',
    title: '关卡设计',
    icon: '🗺️',
    desc: '关卡列表、环境配置、敌人与道具',
    color: 'border-l-green-500',
    bg: 'bg-green-50',
    text: 'text-green-700',
    getStat: (p: GameProject) => `${p.levels?.length || 0} 关`,
  },
  {
    key: 'characters',
    title: '角色设计',
    icon: '👤',
    desc: '角色卡片、类型、能力与背景故事',
    color: 'border-l-yellow-500',
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    getStat: (p: GameProject) => `${p.characters?.length || 0} 个`,
  },
  {
    key: 'quests',
    title: '任务设计',
    icon: '📜',
    desc: '主支线任务、目标与奖励配置',
    color: 'border-l-red-500',
    bg: 'bg-red-50',
    text: 'text-red-700',
    getStat: (p: GameProject) => `${p.quests?.length || 0} 个`,
  },
  {
    key: 'export',
    title: '导出文档',
    icon: '📦',
    desc: '预览完整GDD、导出多格式文件',
    color: 'border-l-indigo-500',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    getStat: () => 'MD/HTML/TXT',
  },
];

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<GameProject | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: '', genre: '', platform: '', description: '' });

  useEffect(() => {
    getProject(id as string).then(p => {
      if (p) {
        setProject(p);
        setForm({ title: p.title, genre: p.genre, platform: p.platform, description: p.description });
      }
    });
  }, [id]);

  if (!project) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">&#8592; 返回</Link>
        <div className="text-gray-400 mt-8 text-center">加载中...</div>
      </div>
    );
  }

  const saveMeta = () => {
    const updated = { ...project, ...form, updatedAt: new Date().toISOString() };
    setProject(updated);
    saveProject(updated);
    setEditing(false);
  };

  const stats = {
    levels: project.levels?.length || 0,
    characters: project.characters?.length || 0,
    quests: project.quests?.length || 0,
    mechanics: project.mechanics?.length || 0,
    gddFields: [project.description, project.targetAudience, project.coreLoop, project.usp].filter(Boolean).length,
  };

  const completionPct = Math.round(
    ((stats.gddFields / 4) + (stats.mechanics > 0 ? 1 : 0) + (stats.levels > 0 ? 1 : 0) +
      (stats.characters > 0 ? 1 : 0) + (stats.quests > 0 ? 1 : 0)) / 5 * 100
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">&#8592; 返回</Link>

      {/* Header Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mt-2 mb-6 shadow-sm">
        {editing ? (
          <div className="space-y-3">
            <input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="text-2xl font-bold w-full border rounded-lg px-3 py-2"
              autoFocus
            />
            <div className="flex gap-3">
              <select value={form.genre} onChange={e => setForm({ ...form, genre: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                <option value="">选择类型</option>
                <option>RPG</option><option>动作</option><option>策略</option><option>模拟</option><option>射击</option><option>冒险</option>
              </select>
              <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                <option value="">选择平台</option>
                <option>PC</option><option>手游</option><option>主机</option><option>网页</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={saveMeta} className="bg-purple-600 text-white px-4 py-1.5 rounded-lg text-sm">保存</button>
              <button onClick={() => setEditing(false)} className="text-gray-500 px-4 py-1.5 rounded-lg text-sm">取消</button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
              <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-purple-600 px-3 py-1 rounded-lg border border-gray-200 hover:border-purple-300">
                编辑信息
              </button>
            </div>
            <div className="flex items-center gap-3 mt-2">
              {project.genre && <span className="bg-purple-50 text-purple-600 px-2.5 py-0.5 rounded-full text-xs font-medium">{project.genre}</span>}
              {project.platform && <span className="bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full text-xs font-medium">{project.platform}</span>}
              <span className="text-xs text-gray-400">
                更新于 {new Date(project.updatedAt).toLocaleDateString('zh-CN')}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">完成度</span>
                <span className="text-xs font-medium text-gray-700">{completionPct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              <span>📋 GDD {stats.gddFields}/4</span>
              <span>⚙️ {stats.mechanics} 机制</span>
              <span>🗺️ {stats.levels} 关</span>
              <span>👤 {stats.characters} 角色</span>
              <span>📜 {stats.quests} 任务</span>
            </div>
          </div>
        )}
      </div>

      {/* Workflow cards */}
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">设计工作流</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {WORKFLOW_CARDS.map(card => (
          <Link
            key={card.key}
            href={`/project/${id}/${card.key}`}
            className={`bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border-l-4 ${card.color} group`}
          >
            <div className="flex items-start justify-between">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center text-lg`}>
                {card.icon}
              </div>
              <span className={`text-xs font-medium ${card.text} ${card.bg} px-2 py-0.5 rounded-full`}>
                {card.getStat(project)}
              </span>
            </div>
            <h3 className="text-sm font-bold text-gray-800 mt-3 group-hover:text-purple-600 transition-colors">
              {card.title}
            </h3>
            <p className="text-xs text-gray-500 mt-1">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
