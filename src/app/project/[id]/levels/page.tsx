'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { GameProject, GameLevel } from '@/lib/types';
import { getProject, saveProject } from '@/lib/storage';
import AIChat from '@/components/AIChat';
import Link from 'next/link';

let _counter = Date.now();
function uid() { return (_counter++).toString(36); }

function blankLevel(order: number): GameLevel {
  return { id: uid(), name: '新关卡', order, environment: '', objectives: '', enemies: '', items: '', notes: '' };
}

export default function LevelsPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<GameProject | null>(null);
  const [levels, setLevels] = useState<GameLevel[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<GameLevel | null>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    getProject(id as string).then(p => {
      if (p) {
        setProject(p);
        setLevels([...p.levels].sort((a, b) => a.order - b.order));
      }
    });
  }, [id]);

  const persist = async (l: GameLevel[]) => {
    if (!project) return;
    const reordered = l.map((lv, i) => ({ ...lv, order: i }));
    const updated = { ...project, levels: reordered, updatedAt: new Date().toISOString() };
    setProject(updated);
    setLevels(reordered);
    await saveProject(updated);
  };

  const add = async () => {
    const updated = [...levels, blankLevel(levels.length)];
    await persist(updated);
  };

  const remove = async (levelId: string) => {
    const updated = levels.filter(l => l.id !== levelId);
    await persist(updated);
  };

  const startEdit = (l: GameLevel) => {
    setEditingId(l.id);
    setEditForm({ ...l });
  };

  const saveEdit = async () => {
    if (!editForm || !editingId) return;
    const updated = levels.map(l => l.id === editingId ? editForm : l);
    setEditingId(null);
    setEditForm(null);
    await persist(updated);
  };

  const cancelEdit = () => { setEditingId(null); setEditForm(null); };

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const copy = [...levels];
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

  const levelSystemPrompt = `你是一个资深的关卡设计师。当前游戏：名称=${project.title}，类型=${project.genre}，描述=${project.description}。已有关卡：${levels.map(l => l.name).join('、')}。请给出关卡设计建议。用中文。`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href={`/project/${id}`} className="text-sm text-gray-400 hover:text-gray-600">&#8592; 返回项目</Link>
      <div className="flex items-center justify-between mt-2 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🗺️ 关卡设计</h1>
        <button onClick={add} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700">
          + 添加关卡
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {levels.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
              <p className="text-gray-400">暂无关卡，点击「+ 添加关卡」创建第一个关卡</p>
            </div>
          )}
          {levels.map((l, index) => (
            <div
              key={l.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:border-purple-200 transition-colors cursor-default"
            >
              {editingId === l.id && editForm ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 cursor-grab">⠿</span>
                    <input
                      value={editForm.name}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="关卡名称"
                      className="text-sm font-bold border border-purple-200 rounded-lg px-2 py-1 flex-1"
                      autoFocus
                    />
                    <button onClick={saveEdit} className="text-xs bg-purple-600 text-white px-3 py-1 rounded-lg">保存</button>
                    <button onClick={cancelEdit} className="text-xs text-gray-400">取消</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400">环境/场景</label>
                      <input value={editForm.environment} onChange={e => setEditForm({ ...editForm, environment: e.target.value })} className="w-full border rounded-lg px-2 py-1 text-xs" placeholder="森林、地牢、城市..." />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400">目标</label>
                      <input value={editForm.objectives} onChange={e => setEditForm({ ...editForm, objectives: e.target.value })} className="w-full border rounded-lg px-2 py-1 text-xs" placeholder="击败Boss、收集钥匙..." />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400">敌人配置</label>
                      <input value={editForm.enemies} onChange={e => setEditForm({ ...editForm, enemies: e.target.value })} className="w-full border rounded-lg px-2 py-1 text-xs" placeholder="哥布林x5、骷髅x3..." />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400">道具/收集品</label>
                      <input value={editForm.items} onChange={e => setEditForm({ ...editForm, items: e.target.value })} className="w-full border rounded-lg px-2 py-1 text-xs" placeholder="生命药水、铁剑..." />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">备注</label>
                    <textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} className="w-full border rounded-lg px-2 py-1 text-xs resize-y min-h-[50px]" placeholder="设计备注..." />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-300 cursor-grab">⠿</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">#{index + 1}</span>
                      <h3 className="text-sm font-bold text-gray-800">{l.name}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(l)} className="text-xs text-purple-600 hover:text-purple-700">编辑</button>
                      <button onClick={() => remove(l.id)} className="text-xs text-red-400 hover:text-red-600 ml-1">删除</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-[11px] text-gray-500">
                    {l.environment && <div><span className="text-gray-300">场景：</span>{l.environment}</div>}
                    {l.objectives && <div><span className="text-gray-300">目标：</span>{l.objectives}</div>}
                    {l.enemies && <div><span className="text-gray-300">敌人：</span>{l.enemies}</div>}
                    {l.items && <div><span className="text-gray-300">道具：</span>{l.items}</div>}
                  </div>
                  {l.notes && <p className="text-[11px] text-gray-400 mt-2 border-t border-gray-50 pt-2">{l.notes}</p>}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm sticky top-20">
            <AIChat systemPrompt={levelSystemPrompt} placeholder="咨询关卡设计..." />
          </div>
        </div>
      </div>
    </div>
  );
}
