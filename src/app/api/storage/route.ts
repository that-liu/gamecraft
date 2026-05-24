import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs'; import path from 'path';
const DIR = path.join(process.cwd(), 'data');
function ensure() { if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true }); }
function fp(id: string) { return path.join(DIR, `${id}.json`); }
export async function GET(req: NextRequest) {
  ensure(); const id = req.nextUrl.searchParams.get('id');
  if (id) { const f = fp(id); if (!fs.existsSync(f)) return NextResponse.json(null, { status: 404 }); return NextResponse.json(JSON.parse(fs.readFileSync(f,'utf-8'))); }
  return NextResponse.json(fs.readdirSync(DIR).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(DIR,f),'utf-8'))).sort((a:any,b:any)=>new Date(b.updatedAt).getTime()-new Date(a.updatedAt).getTime()));
}
export async function POST(req: NextRequest) { ensure(); let p; try { p = await req.json(); } catch { return NextResponse.json({error:'Invalid JSON'},{status:400}); } p.updatedAt = new Date().toISOString(); fs.writeFileSync(fp(p.id), JSON.stringify(p,null,2)); return NextResponse.json({ok:true}); }
export async function DELETE(req: NextRequest) { const id = req.nextUrl.searchParams.get('id'); if (!id) return NextResponse.json({error:'id required'},{status:400}); const f = fp(id); if (fs.existsSync(f)) fs.unlinkSync(f); return NextResponse.json({ok:true}); }
