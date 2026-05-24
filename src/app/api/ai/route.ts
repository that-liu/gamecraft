import { NextRequest, NextResponse } from 'next/server';
const BASE = process.env.ANTHROPIC_BASE_URL||'https://api.deepseek.com/anthropic';
const KEY = process.env.ANTHROPIC_AUTH_TOKEN||'';
const MODEL = process.env.ANTHROPIC_DEFAULT_OPUS_MODEL||'deepseek-v4-pro';

async function call(system:string, prompt:string):Promise<string> {
  const r = await fetch(`${BASE}/v1/messages`,{method:'POST',headers:{'Content-Type':'application/json','x-api-key':KEY,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:MODEL,max_tokens:4096,system,messages:[{role:'user',content:prompt}]})});
  if(!r.ok) throw new Error(`AI:${r.status}`);
  const d=await r.json(); return d.content?.map((c:{type:string;text?:string})=>c.text||'').join('')||'';
}

const AGENTS = [
  {id:'gdd',name:'策划',icon:'📋',system:'你是资深游戏策划。根据创意撰写游戏设计文档(GDD)：游戏概述、核心玩法、目标用户、商业模式、技术选型。'},
  {id:'mechanics',name:'机制',icon:'⚙️',system:'你是游戏系统设计师。设计核心循环、战斗系统、成长系统、经济系统。给出具体数值和公式。'},
  {id:'levels',name:'关卡',icon:'🗺️',system:'你是关卡设计师。设计5-8个关卡：场景、敌人配置、收集品、Boss战、难度曲线。'},
  {id:'characters',name:'角色',icon:'👤',system:'你是角色设计师。设计主角+3个Boss+5个NPC：外观、性格、能力、背景故事。'},
  {id:'quests',name:'任务',icon:'📜',system:'你是任务策划。设计主线+支线任务：接取条件、目标、奖励、对话文本。'},
];

export async function POST(req:NextRequest) {
  let idea:string; try{const b=await req.json();idea=b.idea;}catch{return NextResponse.json({error:'Invalid JSON'},{status:400});}
  const enc=new TextEncoder();
  const stream=new ReadableStream({async start(ctrl){
    const send=(d:Record<string,unknown>)=>ctrl.enqueue(enc.encode(`data:${JSON.stringify(d)}\n\n`));
    const results:Record<string,string>={};
    for(const a of AGENTS){
      send({agent:a.id,status:'running',name:a.name,icon:a.icon});
      try{
        const ctx=Object.entries(results).map(([k,v])=>`[${k}]:${v.slice(0,1000)}`).join('\n');
        const r=await call(a.system,`${ctx}\n创意:${idea}\n请完成你的任务。`);
        results[a.id]=r; send({agent:a.id,status:'done',name:a.name,icon:a.icon,output:r});
      }catch(e){send({agent:a.id,status:'error',error:(e as Error).message});}
    }
    send({status:'complete',results}); ctrl.close();
  }});
  return new Response(stream,{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-cache'}});
}
