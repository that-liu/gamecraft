'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { GameProject } from '@/lib/types';
import { getProject, saveProject } from '@/lib/storage';
import Link from 'next/link';

const sections = [
  { key: 'gdd', label: '📋 策划文档', color: 'from-purple-500 to-indigo-500' },
  { key: 'mechanics', label: '⚙️ 游戏机制', color: 'from-blue-500 to-cyan-500' },
  { key: 'levels', label: '🗺️ 关卡设计', color: 'from-green-500 to-teal-500' },
  { key: 'characters', label: '👤 角色设计', color: 'from-yellow-500 to-orange-500' },
  { key: 'quests', label: '📜 任务系统', color: 'from-red-500 to-pink-500' },
  { key: 'dialogs', label: '💬 对话树', color: 'from-indigo-500 to-purple-500' },
];

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<GameProject | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title:'', genre:'', platform:'', description:'' });
  const [activeSection, setActiveSection] = useState('gdd');
  const [sectionContent, setSectionContent] = useState('');

  useEffect(()=>{getProject(id as string).then(p=>{if(p){setProject(p);setForm({title:p.title,genre:p.genre,platform:p.platform,description:p.description});}});},[id]);

  useEffect(()=>{
    if(!project) return;
    const note = project.notes || '';
    const idx = note.indexOf(`【${activeSection==='gdd'?'策划':activeSection==='mechanics'?'机制':activeSection==='levels'?'关卡':activeSection==='characters'?'角色':activeSection==='quests'?'任务':'对话'}】`);
    if(idx>=0){const next=note.indexOf('【',idx+1);setSectionContent(note.slice(idx,next>0?next:undefined).trim());}
    else setSectionContent('');
  },[project,activeSection]);

  if(!project) return <div className="max-w-4xl mx-auto px-4 py-8 text-gray-400">加载中...</div>;

  const updateNotes = (content:string) => {
    const note = project.notes||'';
    const label = activeSection==='gdd'?'策划':activeSection==='mechanics'?'机制':activeSection==='levels'?'关卡':activeSection==='characters'?'角色':activeSection==='quests'?'任务':'对话';
    const idx=note.indexOf(`【${label}】`),next=note.indexOf('【',idx+1);
    const newNote=idx>=0?note.slice(0,idx)+content+(next>0?note.slice(next):''):note+'\n\n'+content;
    const updated={...project,notes:newNote,updatedAt:new Date().toISOString()};
    setProject(updated);saveProject(updated);setSectionContent(content);
    setEditing(false);
  };

  const saveMeta = () => { const u={...project,...form,updatedAt:new Date().toISOString()}; setProject(u);saveProject(u);setEditing(false); };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← 返回</Link>
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mt-2 mb-6 shadow-sm">
        {editing?<div className="space-y-3"><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="text-2xl font-bold w-full border rounded-lg px-3 py-2"/><div className="flex gap-3"><select value={form.genre} onChange={e=>setForm({...form,genre:e.target.value})} className="border rounded-lg px-3 py-2 text-sm"><option>RPG</option><option>动作</option><option>策略</option><option>模拟</option></select><select value={form.platform} onChange={e=>setForm({...form,platform:e.target.value})} className="border rounded-lg px-3 py-2 text-sm"><option>PC</option><option>手游</option><option>主机</option></select></div><div className="flex gap-2"><button onClick={saveMeta} className="bg-purple-600 text-white px-4 py-1.5 rounded-lg text-sm">保存</button><button onClick={()=>setEditing(false)} className="text-gray-500 px-4 py-1.5 rounded-lg text-sm">取消</button></div></div>:<div><div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-gray-900">{project.title}</h1><button onClick={()=>setEditing(true)} className="text-xs text-gray-400 hover:text-purple-600">编辑</button></div><div className="flex gap-3 mt-2 text-sm">{project.genre&&<span className="bg-purple-50 text-purple-600 px-2.5 py-0.5 rounded-full text-xs font-medium">{project.genre}</span>}{project.platform&&<span className="bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full text-xs font-medium">{project.platform}</span>}</div></div>}
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {sections.map(s=><button key={s.key} onClick={()=>setActiveSection(s.key)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeSection===s.key?'bg-purple-600 text-white':s.key==='dialogs'?'bg-gray-100 text-gray-400 cursor-not-allowed':'bg-white border border-gray-200 text-gray-700 hover:border-purple-300'}`} disabled={s.key==='dialogs'}>{s.label}</button>)}
      </div>

      {/* Content editor */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm min-h-[400px]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">{sections.find(s=>s.key===activeSection)?.label}</h2>
          {!editing?<button onClick={()=>setEditing(true)} className="text-xs text-purple-600 hover:text-purple-700">✏️ 编辑</button>:<div className="flex gap-2"><button onClick={()=>updateNotes(sectionContent)} className="text-xs bg-purple-600 text-white px-3 py-1 rounded-lg">保存</button><button onClick={()=>{setEditing(false);setSectionContent(project.notes?.split(`【${activeSection==='gdd'?'策划':activeSection==='mechanics'?'机制':activeSection==='levels'?'关卡':activeSection==='characters'?'角色':'任务'}】`)[1]?.split('【')[0]?.trim()||'');}} className="text-xs text-gray-500">取消</button></div>}
        </div>
        {editing?<textarea value={sectionContent} onChange={e=>setSectionContent(e.target.value)} className="w-full border rounded-xl p-4 text-sm resize-none h-96 focus:ring-2 focus:ring-purple-500 focus:outline-none leading-relaxed"/ >:<div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{sectionContent||<span className="text-gray-300">此模块暂无内容，点击上方按钮用多Agent生成</span>}</div>}
      </div>
    </div>
  );
}
