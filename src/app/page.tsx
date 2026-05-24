'use client';
import { useState, useEffect } from 'react';
import { GameProject } from '@/lib/types';
import { listProjects, saveProject, deleteProject } from '@/lib/storage';
import Link from 'next/link';

const GENRES = ['','RPG','动作','射击','策略','模拟','冒险','格斗','益智','恐怖','Roguelike','开放世界','魂类'];
const PLATFORMS = ['','PC','主机','手游','网页','VR','跨平台'];
const AGENTS = [
  { id:'gdd', name:'策划文档', icon:'📋' },
  { id:'mechanics', name:'游戏机制', icon:'⚙️' },
  { id:'levels', name:'关卡设计', icon:'🗺️' },
  { id:'characters', name:'角色设计', icon:'👤' },
  { id:'quests', name:'任务系统', icon:'📜' },
];

export default function Dashboard() {
  const [projects, setProjects] = useState<GameProject[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title:'', genre:'', platform:'', description:'' });
  const [idea, setIdea] = useState('');
  const [running, setRunning] = useState(false);
  const [currentAgent, setCurrentAgent] = useState('');
  const [doneAgents, setDoneAgents] = useState<Set<string>>(new Set());
  const [agentOutputs, setAgentOutputs] = useState<Record<string,string>>({});
  const [expandedAgent, setExpandedAgent] = useState<string|null>(null);
  const [preview, setPreview] = useState<Partial<GameProject>>({});

  useEffect(()=>{listProjects().then(setProjects);},[]);

  const create = async () => {
    if(!form.title.trim()) return;
    const p: GameProject = { id:Date.now().toString(), ...form, title:form.title.trim(), targetAudience:'', coreLoop:'', usp:'', mechanics:[], levels:[], characters:[], quests:[], dialogs:[], notes:'', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
    await saveProject(p); setProjects(prev=>[p,...prev]); setShowCreate(false); setForm({title:'',genre:'',platform:'',description:''});
  };
  const remove = async (id:string) => { await deleteProject(id); setProjects(prev=>prev.filter(p=>p.id!==id)); };

  const startGenerate = async () => {
    if(!idea.trim()||running) return;
    setRunning(true); setDoneAgents(new Set()); setAgentOutputs({}); setPreview({}); setExpandedAgent(null);
    try{
      const r=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idea:idea.trim()})});
      const reader=r.body?.getReader(),decoder=new TextDecoder();let buf='',results:Record<string,string>={};
      while(reader){const{value,done}=await reader.read();if(done)break;buf+=decoder.decode(value,{stream:true});const lines=buf.split('\n');buf=lines.pop()||'';
        for(const l of lines){if(!l.startsWith('data: '))continue;
          try{const m=JSON.parse(l.slice(6));
            if(m.status==='running'){setCurrentAgent(m.agent);setExpandedAgent(m.agent);}
            else if(m.status==='done'){setDoneAgents(prev=>new Set(prev).add(m.agent));results[m.agent]=m.output;setAgentOutputs(prev=>({...prev,[m.agent]:m.output}));}
            else if(m.status==='complete'){
              setRunning(false);const gdd=results.gdd||'';const title=gdd.match(/《(.+?)》/)?.[1]||idea.slice(0,20);
              setPreview({title,genre:'',platform:'',description:gdd.split('\n')[0]?.slice(0,100)||'',notes:AGENTS.map(a=>`【${a.name}】\n${results[a.id]||''}`).join('\n\n')});
            }else if(m.status==='error'){setRunning(false);}
          }catch{}
        }
      }
    }catch{setRunning(false);}
  };

  const finishAndSave = async () => {
    const p: GameProject = {
      id:Date.now().toString(),title:preview.title||idea.slice(0,20),genre:preview.genre||'',platform:preview.platform||'',
      description:preview.description||'',targetAudience:'',coreLoop:'',usp:'',
      mechanics:[],levels:[],characters:[],quests:[],dialogs:[],
      notes:preview.notes||'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),
    };
    await saveProject(p); setProjects(prev=>[p,...prev]);
    setIdea(''); setDoneAgents(new Set()); setPreview({});
  };

  const allDone = doneAgents.size === AGENTS.length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">🎮 GameCraft</h1><p className="text-gray-500 text-sm">AI 驱动的游戏设计工作流</p></div>
        <button onClick={()=>setShowCreate(true)} className="bg-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700">+ 创建项目</button>
      </div>

      {/* 🚀 One-click Generate */}
      <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-50 border border-purple-200 rounded-2xl p-6 mb-8 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-2">🚀 一键生成游戏</h2>
        <p className="text-sm text-gray-500 mb-4">输入游戏创意，5个 AI Agent 接力完成：策划→机制→关卡→角色→任务</p>

        {!running && !allDone && (
          <div className="flex gap-3">
            <textarea value={idea} onChange={e=>setIdea(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();startGenerate();}}}
              placeholder="例如：一个赛博朋克风格的Roguelike卡牌游戏，核心机制是黑客入侵和卡牌组合..."
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-purple-500" autoFocus />
            <div className="flex flex-col justify-end gap-2">
              <button onClick={startGenerate} disabled={!idea.trim()} className="bg-purple-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 shadow-sm whitespace-nowrap">✨ 一键生成</button>
              <p className="text-[10px] text-gray-400 text-center">Enter 发送</p>
            </div>
          </div>
        )}

        {(running || allDone) && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {AGENTS.map(a=>(
                <div key={a.id} className={`flex-1 rounded-xl p-3 text-center transition-all ${currentAgent===a.id?'bg-purple-100 ring-2 ring-purple-400 scale-105':doneAgents.has(a.id)?'bg-green-50':allDone?'bg-green-50':'bg-gray-100'}`}>
                  <div className="text-lg">{a.icon}</div><div className="text-xs font-medium mt-1 text-gray-700">{a.name}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{currentAgent===a.id?'⏳ 生成中...':doneAgents.has(a.id)?'✅ 完成':allDone?'✅ 完成':'等待中'}</div>
                </div>
              ))}
            </div>

            {/* Live agent outputs */}
            <div className="space-y-2">
              {AGENTS.filter(a=>agentOutputs[a.id]).map(a=>(
                <div key={a.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                  <button onClick={()=>setExpandedAgent(expandedAgent===a.id?null:a.id)} className="w-full flex items-center justify-between p-3 text-sm hover:bg-gray-50">
                    <span className="flex items-center gap-2">{a.icon} <span className="font-medium">{a.name}</span> <span className="text-xs text-green-600">✅ 已完成</span></span>
                    <span className="text-xs text-gray-400">{expandedAgent===a.id?'收起':'展开'} ({(agentOutputs[a.id]||'').length}字)</span>
                  </button>
                  {expandedAgent===a.id&&<div className="p-3 border-t border-gray-100 text-sm text-gray-700 max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed bg-gray-50">{agentOutputs[a.id]}</div>}
                </div>
              ))}
            </div>

            {currentAgent && !agentOutputs[currentAgent] && (
              <div className="text-sm text-purple-600 text-center">⏳ {AGENTS.find(a=>a.id===currentAgent)?.name} 正在创作中...</div>
            )}

            {allDone && preview.title && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
                <h3 className="font-bold text-lg">{preview.title} {preview.genre&&<span className="text-sm font-normal bg-purple-50 text-purple-600 px-2 py-0.5 rounded">{preview.genre}</span>}</h3>
                {preview.description&&<p className="text-sm text-gray-600">{preview.description}</p>}
                <div className="text-xs text-gray-400">包含：策划文档、机制设计、关卡设计、角色设计、任务系统</div>
                <div className="flex gap-2 pt-2">
                  <button onClick={finishAndSave} className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700 shadow-sm">✅ 保存项目，开始设计</button>
                  <button onClick={()=>{setIdea('');setDoneAgents(new Set());setPreview({});}} className="text-sm text-gray-500 px-4 hover:text-gray-700">放弃重来</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm"><h2 className="text-lg font-bold mb-4">🎮 新建游戏项目</h2>
          <div className="grid grid-cols-2 gap-4 mb-4"><div><label className="text-sm text-gray-500">游戏名称 *</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm" placeholder="游戏名称" autoFocus/></div><div><label className="text-sm text-gray-500">类型</label><select value={form.genre} onChange={e=>setForm({...form,genre:e.target.value})} className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm">{GENRES.map(g=><option key={g} value={g}>{g||'选择类型'}</option>)}</select></div></div>
          <div className="grid grid-cols-2 gap-4 mb-4"><div><label className="text-sm text-gray-500">平台</label><select value={form.platform} onChange={e=>setForm({...form,platform:e.target.value})} className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm">{PLATFORMS.map(p=><option key={p} value={p}>{p||'选择平台'}</option>)}</select></div></div>
          <div className="flex gap-2 justify-end"><button onClick={()=>setShowCreate(false)} className="px-5 py-2.5 text-sm text-gray-600">取消</button><button onClick={create} disabled={!form.title.trim()} className="px-6 py-2.5 text-sm bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 font-semibold">创建</button></div>
        </div>
      )}

      {projects.length===0&&!showCreate?<div className="text-center py-16"><p className="text-5xl mb-4">🎮</p><p className="text-gray-500 mb-2">还没有游戏项目</p><p className="text-sm text-gray-400">在上方输入游戏创意，点 ✨一键生成 即可开始</p></div>:(
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{projects.map(p=><div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"><div className="flex justify-between mb-2"><Link href={`/project/${p.id}`} className="text-lg font-semibold text-gray-900 hover:text-purple-600">{p.title}</Link><button onClick={()=>remove(p.id)} className="text-gray-400 hover:text-red-500">✕</button></div><div className="text-sm text-gray-500 mb-3">{p.genre&&<span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded mr-2">{p.genre}</span>}{p.platform&&<span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{p.platform}</span>}</div><div className="flex gap-2"><Link href={`/project/${p.id}`} className="text-xs bg-purple-50 text-purple-600 px-3 py-1 rounded-lg hover:bg-purple-100 font-medium">打开项目</Link></div></div>)}</div>
      )}
    </div>
  );
}
