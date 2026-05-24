'use client';
import { useState, useEffect } from 'react';
import { GameProject } from '@/lib/types';
import { listProjects, saveProject, deleteProject } from '@/lib/storage';
import Link from 'next/link';

const GENRES = ['','RPG','动作','射击','策略','模拟','冒险','格斗','益智','恐怖','Roguelike','开放世界','魂类'];
const PLATFORMS = ['','PC','主机','手游','网页','VR','跨平台'];

export default function Dashboard() {
  const [projects, setProjects] = useState<GameProject[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title:'', genre:'', platform:'', description:'' });
  const [idea, setIdea] = useState('');
  const [running, setRunning] = useState(false);
  const [agents, setAgents] = useState<{id:string;name:string;icon:string;status:string}[]>([]);
  const [activeAgent, setActiveAgent] = useState('');

  useEffect(()=>{listProjects().then(setProjects);},[]);

  const create = async () => {
    if(!form.title.trim()) return;
    const p: GameProject = { id:Date.now().toString(), ...form, title:form.title.trim(), targetAudience:'', coreLoop:'', usp:'', mechanics:[], levels:[], characters:[], quests:[], dialogs:[], notes:'', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
    await saveProject(p); setProjects(prev=>[p,...prev]); setShowCreate(false); setForm({title:'',genre:'',platform:'',description:''});
  };
  const remove = async (id:string) => { await deleteProject(id); setProjects(prev=>prev.filter(p=>p.id!==id)); };

  const startMultiAgent = async () => {
    if(!idea.trim()||running) return;
    setRunning(true); setAgents([]);
    try{
      const r=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idea:idea.trim()})});
      const reader=r.body?.getReader(),decoder=new TextDecoder();let buf='',results:Record<string,string>={};
      while(reader){const{value,done}=await reader.read();if(done)break;buf+=decoder.decode(value,{stream:true});const lines=buf.split('\n');buf=lines.pop()||'';
        for(const l of lines){if(!l.startsWith('data: '))continue;
          try{const m=JSON.parse(l.slice(6));
            if(m.status==='running'){setAgents(prev=>[...prev.filter(a=>a.id!==m.agent),{id:m.agent,name:m.name,icon:m.icon,status:'running'}]);setActiveAgent(m.name);}
            else if(m.status==='done'){setAgents(prev=>prev.map(a=>a.id===m.agent?{...a,status:'done'}:a));results[m.agent]=m.output;}
            else if(m.status==='complete'){
              setRunning(false);const gdd=results.gdd||'';const title=gdd.match(/《(.+?)》/)?.[1]||idea.slice(0,20);
              const p:GameProject={id:Date.now().toString(),title,genre:'',platform:'',description:gdd.split('\n')[0]?.slice(0,100)||'',targetAudience:'',coreLoop:'',usp:'',mechanics:[],levels:[],characters:[],quests:[],dialogs:[],notes:`【策划】\n${gdd}\n\n【机制】\n${results.mechanics||''}\n\n【关卡】\n${results.levels||''}\n\n【角色】\n${results.characters||''}\n\n【任务】\n${results.quests||''}`,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
              await saveProject(p);setProjects(prev=>[p,...prev]);setIdea('');
            }
          }catch{}
        }
      }
    }catch{setRunning(false);}
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6"><div><h1 className="text-2xl font-bold text-gray-900">🎮 GameCraft</h1><p className="text-gray-500 text-sm">AI 驱动的游戏设计工作流</p></div><button onClick={()=>setShowCreate(true)} className="bg-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700">+ 创建项目</button></div>

      {/* Multi-Agent Creator */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-2">🤖 多 Agent 游戏设计</h2>
        <p className="text-sm text-gray-500 mb-4">5个Agent接力：策划→机制→关卡→角色→任务</p>
        {!running && agents.length===0 && <div className="flex gap-3"><textarea value={idea} onChange={e=>setIdea(e.target.value)} placeholder="例如：一个赛博朋克风格的Roguelike卡牌游戏..." className="flex-1 border rounded-xl px-4 py-3 text-sm resize-none h-20 focus:ring-2 focus:ring-purple-500 focus:outline-none" /><div className="flex flex-col justify-end"><button onClick={startMultiAgent} disabled={!idea.trim()} className="bg-purple-600 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 whitespace-nowrap">🚀 启动协作</button></div></div>}
        {running && <div className="flex items-center gap-2"><div className="flex-1 bg-gray-200 rounded-full h-2"><div className="bg-purple-500 h-2 rounded-full transition-all" style={{width:`${(agents.filter(a=>a.status==='done').length/5)*100}%`}}/></div><span className="text-xs text-gray-500">{agents.filter(a=>a.status==='done').length}/5</span></div>}
        <div className="flex gap-2 mt-3">{agents.map(a=><div key={a.id} className={`flex-1 rounded-xl p-2 text-center text-xs ${a.status==='running'?'bg-purple-100 ring-2 ring-purple-400':a.status==='done'?'bg-green-50':''}`}><div className="text-lg">{a.icon}</div><div>{a.name}</div><div className="text-[10px] text-gray-400">{a.status==='running'?'⏳':a.status==='done'?'✅':''}</div></div>)}</div>
      </div>

      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm"><h2 className="text-lg font-bold mb-4">🎮 新建游戏项目</h2>
          <div className="grid grid-cols-2 gap-4 mb-4"><div><label className="text-sm text-gray-500">游戏名称 *</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm" placeholder="游戏名称" autoFocus/></div><div><label className="text-sm text-gray-500">类型</label><select value={form.genre} onChange={e=>setForm({...form,genre:e.target.value})} className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm">{GENRES.map(g=><option key={g} value={g}>{g||'选择类型'}</option>)}</select></div></div>
          <div className="grid grid-cols-2 gap-4 mb-4"><div><label className="text-sm text-gray-500">平台</label><select value={form.platform} onChange={e=>setForm({...form,platform:e.target.value})} className="w-full border rounded-xl px-4 py-2.5 mt-1 text-sm">{PLATFORMS.map(p=><option key={p} value={p}>{p||'选择平台'}</option>)}</select></div></div>
          <div className="flex gap-2 justify-end"><button onClick={()=>setShowCreate(false)} className="px-5 py-2.5 text-sm text-gray-600">取消</button><button onClick={create} disabled={!form.title.trim()} className="px-6 py-2.5 text-sm bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 font-semibold">创建</button></div>
        </div>
      )}

      {projects.length===0&&!showCreate?<div className="text-center py-16"><p className="text-5xl mb-4">🎮</p><p className="text-gray-500">还没有游戏项目</p></div>:(
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{projects.map(p=><div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md"><div className="flex justify-between mb-2"><Link href={`/project/${p.id}`} className="text-lg font-semibold text-gray-900 hover:text-purple-600">{p.title}</Link><button onClick={()=>remove(p.id)} className="text-gray-400 hover:text-red-500">✕</button></div><div className="text-sm text-gray-500 mb-3">{p.genre&&<span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded mr-2">{p.genre}</span>}{p.platform&&<span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{p.platform}</span>}</div><Link href={`/project/${p.id}`} className="text-xs bg-purple-50 text-purple-600 px-3 py-1 rounded-lg hover:bg-purple-100">打开项目</Link></div>)}</div>
      )}
    </div>
  );
}
