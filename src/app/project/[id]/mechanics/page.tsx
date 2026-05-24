'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { GameProject, GameMechanic } from '@/lib/types';
import { getProject, saveProject } from '@/lib/storage';
import AIChat from '@/components/AIChat';
import Link from 'next/link';

const DEFAULT_MECHANICS = [
  { type: 'core', name: '核心循环', description: '', icon: '🔄' },
  { type: 'combat', name: '战斗系统', description: '', icon: '⚔️' },
  { type: 'growth', name: '成长系统', description: '', icon: '📈' },
  { type: 'economy', name: '经济系统', description: '', icon: '💰' },
];

let _counter = Date.now();
function uid() { return (_counter++).toString(36); }

function ensureMechanics(mechanics: GameMechanic[]): GameMechanic[] {
  const result = [...mechanics];
  for (const dm of DEFAULT_MECHANICS) {
    if (!result.find(m => m.type === dm.type)) {
      result.push({ id: uid(), name: dm.name, description: '', type: dm.type, rules: '' });
    }
  }
  return result;
}

export default function MechanicsPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<GameProject | null>(null);
  const [mechanics, setMechanics] = useState<GameMechanic[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });

  useEffect(() => {
    getProject(id as string).then(p => {
      if (p) {
        setProject(p);
        const m = ensureMechanics(p.mechanics || []);
        setMechanics(m);
      }
    });
  }, [id]);

  const save = async (updatedMechanics: GameMechanic[]) => {
    if (!project) return;
    const updated = { ...project, mechanics: updatedMechanics, updatedAt: new Date().toISOString() };
    setProject(updated);
    setMechanics(updatedMechanics);
    await saveProject(updated);
  };

  const startEdit = (m: GameMechanic) => {
    setEditingId(m.id);
    setEditForm({ name: m.name, description: m.description });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const updated = mechanics.map(m =>
      m.id === editingId ? { ...m, name: editForm.name, description: editForm.description } : m
    );
    setEditingId(null);
    await save(updated);
  };

  const iconFor = (type: string) => DEFAULT_MECHANICS.find(d => d.type === type)?.icon || '🔧';

  if (!project) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href={`/project/${id}`} className="text-sm text-gray-400 hover:text-gray-600">&#8592; 返回项目</Link>
        <div className="text-gray-400 mt-8 text-center">加载中...</div>
      </div>
    );
  }

  const mechSystemPrompt = `你是一个资深的游戏系统设计师，正在帮用户设计游戏机制。当前游戏：
- 名称：${project.title}
- 类型：${project.genre || '未设定'}
- 描述：${project.description || '未填写'}

请根据游戏类型和描述，给出专业的系统设计建议。用中文回答。`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href={`/project/${id}`} className="text-sm text-gray-400 hover:text-gray-600">&#8592; 返回项目</Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-6">⚙️ 机制设计</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mechanics.map(m => (
              <div key={m.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{iconFor(m.type)}</span>
                  {editingId === m.id ? (
                    <input
                      value={editForm.name}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      className="text-sm font-bold border border-purple-200 rounded-lg px-2 py-1 flex-1"
                      autoFocus
                    />
                  ) : (
                    <h2 className="text-sm font-bold text-gray-800 flex-1">{m.name}</h2>
                  )}
                  {editingId === m.id ? (
                    <div className="flex gap-1">
                      <button onClick={saveEdit} className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">保存</button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 px-2 py-0.5 rounded">取消</button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(m)} className="text-xs text-purple-600 hover:text-purple-700">编辑</button>
                  )}
                </div>
                {editingId === m.id ? (
                  <textarea
                    value={editForm.description}
                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="详细描述这个系统..."
                    className="w-full border border-purple-200 rounded-xl p-3 text-xs resize-y min-h-[80px] focus:ring-2 focus:ring-purple-400 focus:outline-none"
                  />
                ) : (
                  <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap min-h-[40px]">
                    {m.description || <span className="text-gray-300 italic">暂无描述，点击「编辑」填写</span>}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm sticky top-20">
            <AIChat systemPrompt={mechSystemPrompt} placeholder="咨询机制设计..." />
          </div>
        </div>
      </div>
    </div>
  );
}
