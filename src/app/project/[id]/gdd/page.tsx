'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { GameProject } from '@/lib/types';
import { getProject, saveProject } from '@/lib/storage';
import AIChat from '@/components/AIChat';
import Link from 'next/link';

interface EditorField {
  key: string;
  label: string;
  icon: string;
  placeholder: string;
}

const fields: EditorField[] = [
  { key: 'description', label: '游戏概述', icon: '🎮', placeholder: '描述游戏的整体概念、世界观、故事背景和核心体验...' },
  { key: 'targetAudience', label: '目标用户', icon: '👥', placeholder: '描述目标玩家群体：年龄段、游戏经验、偏好、平台习惯...' },
  { key: 'coreLoop', label: '核心玩法', icon: '🔄', placeholder: '描述核心游戏循环：玩家每分钟/每局在做什么？核心体验是什么？...' },
  { key: 'usp', label: '商业模型', icon: '💎', placeholder: '描述游戏的独特卖点、商业模式（买断/免费+内购/订阅）、市场定位...' },
];

export default function GDDPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<GameProject | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProject(id as string).then(p => { if (p) setProject(p); });
  }, [id]);

  const startEdit = (key: string) => {
    if (!project) return;
    setEditingKey(key);
    setEditValue((project as any)[key] || '');
  };

  const saveField = async () => {
    if (!project || !editingKey) return;
    setSaving(true);
    const updated = { ...project, [editingKey]: editValue, updatedAt: new Date().toISOString() };
    setProject(updated);
    await saveProject(updated);
    setEditingKey(null);
    setSaving(false);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
  };

  if (!project) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href={`/project/${id}`} className="text-sm text-gray-400 hover:text-gray-600">&#8592; 返回项目</Link>
        <div className="text-gray-400 mt-8 text-center">加载中...</div>
      </div>
    );
  }

  const gddSystemPrompt = `你是一个资深游戏策划顾问，正在帮用户完善游戏设计文档(GDD)。当前游戏项目信息：
- 名称：${project.title}
- 类型：${project.genre || '未设定'}
- 平台：${project.platform || '未设定'}
- 概述：${project.description || '未填写'}
- 目标用户：${project.targetAudience || '未填写'}
- 核心玩法：${project.coreLoop || '未填写'}
- 商业模型：${project.usp || '未填写'}

请根据这些信息给出专业的游戏设计建议。用中文回答。`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href={`/project/${id}`} className="text-sm text-gray-400 hover:text-gray-600">&#8592; 返回项目</Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-6">📋 游戏策划文档 (GDD)</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: editable fields */}
        <div className="lg:col-span-2 space-y-4">
          {fields.map(field => (
            <div key={field.key} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-gray-800">
                  {field.icon} {field.label}
                </h2>
                {editingKey !== field.key && (
                  <button
                    onClick={() => startEdit(field.key)}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                  >
                    编辑
                  </button>
                )}
              </div>
              {editingKey === field.key ? (
                <div>
                  <textarea
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full border border-purple-200 rounded-xl p-3 text-sm resize-y min-h-[100px] focus:ring-2 focus:ring-purple-400 focus:outline-none"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={saveField}
                      disabled={saving}
                      className="bg-purple-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50"
                    >
                      {saving ? '保存中...' : '保存'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="text-gray-500 px-4 py-1.5 rounded-lg text-xs"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap min-h-[40px]">
                  {(project as any)[field.key] || <span className="text-gray-300 italic">点击「编辑」填写内容</span>}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Right: AI chat */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm sticky top-20">
            <AIChat
              systemPrompt={gddSystemPrompt}
              placeholder="咨询策划问题..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
