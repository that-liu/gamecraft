'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { GameProject, GameCharacter } from '@/lib/types';
import { getProject, saveProject } from '@/lib/storage';
import AIChat from '@/components/AIChat';
import Link from 'next/link';

let _counter = Date.now();
function uid() { return (_counter++).toString(36); }

const CHAR_TYPES = [
  { value: 'hero' as const, label: '英雄', color: 'bg-blue-50 text-blue-600' },
  { value: 'npc' as const, label: 'NPC', color: 'bg-green-50 text-green-600' },
  { value: 'enemy' as const, label: '敌人', color: 'bg-red-50 text-red-600' },
  { value: 'boss' as const, label: 'Boss', color: 'bg-orange-50 text-orange-600' },
];

function blankChar(): GameCharacter {
  return { id: uid(), name: '新角色', role: '', type: 'npc', personality: '', backstory: '', abilities: '', appearance: '' };
}

export default function CharactersPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<GameProject | null>(null);
  const [characters, setCharacters] = useState<GameCharacter[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<GameCharacter | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genIdea, setGenIdea] = useState('');

  useEffect(() => {
    getProject(id as string).then(p => {
      if (p) {
        setProject(p);
        setCharacters(p.characters || []);
      }
    });
  }, [id]);

  const persist = async (chars: GameCharacter[]) => {
    if (!project) return;
    const updated = { ...project, characters: chars, updatedAt: new Date().toISOString() };
    setProject(updated);
    setCharacters(chars);
    await saveProject(updated);
  };

  const add = async () => {
    await persist([...characters, blankChar()]);
  };

  const remove = async (charId: string) => {
    await persist(characters.filter(c => c.id !== charId));
  };

  const startEdit = (c: GameCharacter) => {
    setEditingId(c.id);
    setEditForm({ ...c });
  };

  const saveEdit = async () => {
    if (!editForm || !editingId) return;
    const updated = characters.map(c => c.id === editingId ? editForm : c);
    setEditingId(null);
    setEditForm(null);
    await persist(updated);
  };

  const cancelEdit = () => { setEditingId(null); setEditForm(null); };

  const generateCharacter = async () => {
    if (!project || generating) return;
    setGenerating(true);
    try {
      const prompt = genIdea.trim()
        ? `为游戏《${project.title}》（${project.genre}）设计一个角色。要求：${genIdea}。请用JSON格式返回：{"name":"","type":"hero|npc|enemy|boss","appearance":"","abilities":"","backstory":"","personality":""}`
        : `为游戏《${project.title}》（${project.genre}）设计一个有特色的角色。请用JSON格式返回：{"name":"","type":"hero|npc|enemy|boss","appearance":"","abilities":"","backstory":"","personality":""}`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          systemPrompt: '你是游戏角色设计师。只返回JSON，不要额外文本。',
          stream: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.content || '';
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            const newChar: GameCharacter = {
              id: uid(),
              name: parsed.name || '未命名角色',
              role: parsed.type || 'npc',
              type: ['hero', 'npc', 'enemy', 'boss'].includes(parsed.type) ? parsed.type : 'npc',
              personality: parsed.personality || '',
              backstory: parsed.backstory || '',
              abilities: parsed.abilities || '',
              appearance: parsed.appearance || '',
            };
            await persist([...characters, newChar]);
            setGenIdea('');
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (e) {
      console.error('Generate character error:', e);
    } finally {
      setGenerating(false);
    }
  };

  const typeLabel = (t: string) => CHAR_TYPES.find(ct => ct.value === t) || CHAR_TYPES[1];

  if (!project) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href={`/project/${id}`} className="text-sm text-gray-400 hover:text-gray-600">&#8592; 返回项目</Link>
        <div className="text-gray-400 mt-8 text-center">加载中...</div>
      </div>
    );
  }

  const charSystemPrompt = `你是游戏角色设计师。当前游戏《${project.title}》（${project.genre}），已有角色：${characters.map(c => `${c.name}(${typeLabel(c.type).label})`).join('、') || '无'}。请帮助设计角色。用中文。`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href={`/project/${id}`} className="text-sm text-gray-400 hover:text-gray-600">&#8592; 返回项目</Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-6">👤 角色设计</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* AI generate bar */}
          <div className="bg-white border border-purple-200 rounded-2xl p-4 shadow-sm">
            <div className="flex gap-2">
              <input
                value={genIdea}
                onChange={e => setGenIdea(e.target.value)}
                placeholder="描述你想要的角色特点（留空则AI随机生成）..."
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-400 focus:outline-none"
                onKeyDown={e => { if (e.key === 'Enter') generateCharacter(); }}
              />
              <button
                onClick={generateCharacter}
                disabled={generating}
                className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-medium hover:bg-purple-700 disabled:opacity-50 whitespace-nowrap"
              >
                {generating ? '生成中...' : '🤖 AI 生成角色'}
              </button>
              <button onClick={add} className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-xs font-medium hover:bg-gray-50 whitespace-nowrap">
                + 手动添加
              </button>
            </div>
          </div>

          {characters.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
              <p className="text-gray-400">暂无角色，使用 AI 生成或手动添加</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {characters.map(c => (
              <div key={c.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                {editingId === c.id && editForm ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="角色名称"
                        className="text-sm font-bold border border-purple-200 rounded-lg px-2 py-1 flex-1"
                        autoFocus
                      />
                      <select
                        value={editForm.type}
                        onChange={e => setEditForm({ ...editForm, type: e.target.value as GameCharacter['type'] })}
                        className="text-xs border border-purple-200 rounded-lg px-2 py-1"
                      >
                        {CHAR_TYPES.map(ct => (
                          <option key={ct.value} value={ct.value}>{ct.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400">外观描述</label>
                      <input value={editForm.appearance} onChange={e => setEditForm({ ...editForm, appearance: e.target.value })} className="w-full border rounded-lg px-2 py-1 text-xs" placeholder="外貌、服装、特征..." />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400">能力/技能</label>
                      <input value={editForm.abilities} onChange={e => setEditForm({ ...editForm, abilities: e.target.value })} className="w-full border rounded-lg px-2 py-1 text-xs" placeholder="特殊能力、战斗技能..." />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400">背景故事</label>
                      <textarea value={editForm.backstory} onChange={e => setEditForm({ ...editForm, backstory: e.target.value })} className="w-full border rounded-lg px-2 py-1 text-xs resize-y min-h-[50px]" placeholder="角色背景..." />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className="text-xs bg-purple-600 text-white px-3 py-1 rounded-lg">保存</button>
                      <button onClick={cancelEdit} className="text-xs text-gray-400">取消</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeLabel(c.type).color}`}>
                          {typeLabel(c.type).label}
                        </span>
                        <h3 className="text-sm font-bold text-gray-800">{c.name}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(c)} className="text-xs text-purple-600 hover:text-purple-700">编辑</button>
                        <button onClick={() => remove(c.id)} className="text-xs text-red-400 hover:text-red-600 ml-1">删除</button>
                      </div>
                    </div>
                    <div className="text-[11px] text-gray-500 space-y-1">
                      {c.appearance && <p><span className="text-gray-300">外观：</span>{c.appearance}</p>}
                      {c.abilities && <p><span className="text-gray-300">能力：</span>{c.abilities}</p>}
                      {c.backstory && <p className="text-gray-400 italic mt-1">{c.backstory.slice(0, 120)}{c.backstory.length > 120 ? '...' : ''}</p>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm sticky top-20">
            <AIChat systemPrompt={charSystemPrompt} placeholder="咨询角色设计..." />
          </div>
        </div>
      </div>
    </div>
  );
}
