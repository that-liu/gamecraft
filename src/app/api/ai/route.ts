import { NextRequest } from 'next/server';
const BASE=process.env.ANTHROPIC_BASE_URL||'https://api.deepseek.com/anthropic';
const KEY=process.env.ANTHROPIC_AUTH_TOKEN||'';
const MODEL=process.env.ANTHROPIC_DEFAULT_OPUS_MODEL||'deepseek-v4-pro';

async function call(sys:string, prompt:string):Promise<string>{
  const r=await fetch(`${BASE}/v1/messages`,{method:'POST',headers:{'Content-Type':'application/json','x-api-key':KEY,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:MODEL,max_tokens:2000,system:sys,messages:[{role:'user',content:prompt}]})});
  if(!r.ok) throw new Error(`AI:${r.status}`);
  const d=await r.json(); return d.content?.map((c:{type:string;text?:string})=>c.text||'').join('')||'';
}

// Only 4 agents for speed, tighter prompts
const AGENTS=[
  {id:'gdd',name:'游戏策划',icon:'📋',sys:'你是游戏策划。用200-300字简洁输出：游戏概述、核心玩法、目标用户、商业模式。'},
  {id:'mechanics',name:'机制设计',icon:'⚙️',sys:'你是系统设计师。用200-300字简洁输出：核心循环、战斗系统、成长系统、经济系统。'},
  {id:'content',name:'关卡+角色',icon:'🎭',sys:'你是关卡/角色设计师。用300-400字简洁输出：1)3-5个关卡(名称+场景+目标) 2)主角+2个Boss(名称+能力+外观)。'},
  {id:'quests',name:'任务系统',icon:'📜',sys:'你是任务策划。用200-300字简洁输出：3-5个主线任务+2个支线(名称+目标+奖励)。'},
];

export async function POST(req:NextRequest){
  let idea:string;try{const b=await req.json();idea=b.idea;}catch{return NextResponse.json({error:'Invalid JSON'},{status:400});}
  const enc=new TextEncoder();
  const stream=new ReadableStream({async start(ctrl){
    const send=(d:Record<string,unknown>)=>ctrl.enqueue(enc.encode(`data:${JSON.stringify(d)}\n\n`));
    const results:Record<string,string>={};
    for(const a of AGENTS){
      send({agent:a.id,status:'running',name:a.name,icon:a.icon});
      try{
        const ctx=Object.entries(results).map(([k,v])=>`[${k}]:${v.slice(0,500)}`).join('\n');
        const r=await call(a.sys,`${ctx}\n创意：${idea}\n请简洁输出，每个要点一行。`);
        results[a.id]=r; send({agent:a.id,status:'done',name:a.name,icon:a.icon,output:r});
      }catch(e){send({agent:a.id,status:'error',error:(e as Error).message});}
    }
    send({status:'complete',results}); ctrl.close();
  }});
  return new Response(stream,{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-cache'}});
}
