"use client";
import {useEffect,useState} from "react";

type Student = { id:string|number; name:string; student_no?:string|null; phone?:string|null; birth_date?:string|null };

export default function StudentPicker({value,onChange}:{value:string;onChange:(id:string)=>void}){
  const [q,setQ]=useState("");
  const [rows,setRows]=useState<Student[]>([]);
  const [selected,setSelected]=useState<Student|null>(null);
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    if(!q.trim() || value){ setRows([]); return; }
    const t=setTimeout(async()=>{
      setLoading(true);
      try{
        const r=await fetch(`/api/students?q=${encodeURIComponent(q)}`,{cache:"no-store"});
        const d=await r.json().catch(()=>null);
        setRows(d?.students??[]);
      }finally{setLoading(false)}
    },250);
    return()=>clearTimeout(t);
  },[q,value]);

  async function choose(s:Student){
    setSelected(s);
    setQ(s.name);
    setRows([]);
    onChange(String(s.id));
  }

  function clear(){
    setSelected(null); setQ(""); setRows([]); onChange("");
  }

  return <div>
    <label className="text-sm font-medium text-slate-700">학생</label>
    {value ? (
      <div className="mt-1 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
        <div>
          <div className="font-semibold text-slate-900">{selected?.name ?? q ?? "선택된 학생"}</div>
          {selected?.student_no && <div className="text-xs text-slate-500">학생번호 {selected.student_no}</div>}
          <div className="mt-0.5 text-xs font-medium text-emerald-700">학생 ID: {value} · 선택 완료</div>
        </div>
        <button type="button" onClick={clear} className="rounded-md border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">변경</button>
      </div>
    ) : (
      <>
        <input className="mt-1 w-full rounded-lg border px-3 py-2" value={q} onChange={e=>setQ(e.target.value)} placeholder="학생명·학생번호 검색" />
        {loading && <p className="mt-2 text-xs text-slate-500">학생을 검색하고 있습니다...</p>}
        {rows.length>0&&<div className="mt-2 overflow-hidden rounded-lg border bg-white shadow-sm">
          {rows.slice(0,8).map(s=><button type="button" key={s.id} onClick={()=>choose(s)} className="block w-full border-b px-3 py-2.5 text-left last:border-b-0 hover:bg-slate-50">
            <div className="font-semibold text-slate-900">{s.name}</div>
            <div className="mt-0.5 text-xs text-slate-500">{s.student_no ? `학생번호 ${s.student_no}` : "학생번호 없음"}{s.phone ? ` · ${s.phone}` : ""}</div>
          </button>)}
        </div>}
        {!loading && q.trim() && rows.length===0 && <p className="mt-2 text-xs text-slate-500">검색 결과가 없습니다.</p>}
      </>
    )}
  </div>
}
