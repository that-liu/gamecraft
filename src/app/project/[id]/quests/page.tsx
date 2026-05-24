'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { GameProject, GameQuest } from '@/lib/types';
import { getProject, saveProject } from '@/lib/storage';
import AIChat from '@/components/AIChat';
import Link from 'next/link';

let _counter = Date.now();
function uid() { return (_counter++).toString(36); }

function blankQuest(order: number): GameQuest {
  return { id: uid(), name: '新任务', order, type: 'main', giver: '', objectives: '', rewards: '', dialogue: '', prerequisites: '' };
}

export default function QuestsPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<GameProject | null>(null);
  const [quests, setQuests] = useState<GameQuest[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<GameQuest | null>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    getProject(id as string).then(p => {
      if (p) {
        setProject(p);
        setQuests([...p.quests].sort((a, b) => a.order - b.order));
      }
    });
  }, [id]);

  const persist = async (q: GameQuest[]) => {
    if (!project) return;
    const reordered = q.map((qt, i) => ({ ...qt, order: i }));
    const updated = { ...project, quests: reordered, updatedAt: new Date().toISOString() };
    setProject(updated);
    setQuests(reordered);
    await saveProject(updated);
  };

  const add = async () => {
    const updated = [...quests, blankQuest(quests.length)];
    await persist(updated);
  };

  const remove = async (questId: string) => {
    const updated = quests.filter(q => q.id !== questId);
    await persist(updated);
  };

  const startEdit = (q: GameQuest) => {
    setEditingId(q.id);
    setEditForm({ ...q });
  };

  const saveEdit = async () => {
    if (!editForm || !editingId) return;
    const updated = quests.map(q => q.id === editingId ? editForm : q);
    setEditingId(null);
    setEditForm(null);
    await persist(updated);
  };

  const cancelEdit = () => { setEditingId(null); setEditForm(null); };

  const handleDragStart = (index: number) => { dragItem.current = index; };
  const handleDragEnter = (index: number) => { dragOverItem.current = index; };
  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const copy = [...quests];
    const [dragged] = copy.splice(dragItem.current, 1);
    copy.splice(dragOverItem.current, 0, dragged);
    dragItem.current = null;
    dragOverItem.current = null;
    await persist(copy);
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  if (!project) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href={`/project/${id}`} className="text-sm text-gray-400 hover:text-gray-600">&#8592; 返回项目</Link>
        <div className="text-gray-400 mt-8 text-center">加载中...</div>
      </div>
    );
  }

  const questSystemPrompt = `你是任务策划师。当前游戏《${project.title}》（${project.genre}），已有任务：${quests.map(q => q.name).join('、')}。请帮助设计任务。用中文。`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href={`/project/${id}`} className="text-sm text-gray-400 hover:text-gray-600">&#8592; 返回项目</Link>
      <div className="flex items-center justify-between mt-2 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📜 任务设计</h1>
        <button onClick={add} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700">
          + 添加任务
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {quests.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
              <p className="text-gray-400">暂无任务，点击「+ 添加任务」创建</p>
            </div>
          )}
          {quests.map((q, index) => (
            <div
              key={q.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:border-purple-200 transition-colors cursor-default"
            >
              {editingId === q.id && editForm ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 cursor-grab">⠿</span>
                    <input
                      value={editForm.name}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="任务名称"
                      className="text-sm font-bold border border-purple-200 rounded-lg px-2 py-1 flex-1"
                      autoFocus
                    />
                    <select
                      value={editForm.type}
                      onChange={e => setEditForm({ ...editForm, type: e.target.value as 'main' | 'side' })}
                      className="text-xs border border-purple-200 rounded-lg px-2 py-1"
                    >
                      <option value="main">主线</option>
                      <option value="side">支线</option>
                    </select>
                    <button onClick={saveEdit} className="text-xs bg-purple-600 text-white px-3 py-1 rounded-lg">保存</button>
                    <button onClick={cancelEdit} className="text-xs text-gray-400">取消</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400">任务给予者</label>
                      <input value={editForm.giver} onChange={e => setEditForm({ ...editForm, giver: e.target.value })} className="w-full border rounded-lg px-2 py-1 text-xs" placeholder="NPC名字..." />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400">奖励</label>
                      <input value={editForm.rewards} onChange={e => setEditForm({ ...editForm, rewards: e.target.value })} className="w-full border rounded-lg px-2 py-1 text-xs" placeholder="金币x100、经验x50..." />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">目标</label>
                    <textarea value={editForm.objectives} onChange={e => setEditForm({ ...editForm, objectives: e.target.value })} className="w-full border rounded-lg px-2 py-1 text-xs resize-y min-h-[50px]" placeholder="击败5个敌人、收集3把钥匙..." />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-300 cursor-grab">⠿</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">#{index + 1}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${q.type === 'main' ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-100 text-gray-500'}`}>
                        {q.type === 'main' ? '主线' : '支线'}
                      </span>
                      <h3 className="text-sm font-bold text-gray-800">{q.name}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(q)} className="text-xs text-purple-600 hover:text-purple-700">编辑</button>
                      <button onClick={() => remove(q.id)} className="text-xs text-red-400 hover:text-red-600 ml-1">删除</button>
                    </div>
                  </div>
                  <div className="text-[11px] text-gray-500 space-y-1">
                    {q.giver && <p><span className="text-gray-300">给予者：</span>{q.giver}</p>}
                    {q.objectives && <p><span className="text-gray-300">目标：</span>{q.objectives}</p>}
                    {q.rewards && <p><span className="text-gray-300">奖励：</span>{q.rewards}</p>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm sticky top-20">
            <AIChat systemPrompt={questSystemPrompt} placeholder="咨询任务设计..." />
          </div>
        </div>
      </div>
    </div>
  );
}
