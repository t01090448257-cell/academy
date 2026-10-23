export function PaymentStatusBadge({value}:{value:string}){const m:any={unpaid:["미납","bg-rose-50 text-rose-700"],partial:["부분 납부","bg-amber-50 text-amber-700"],paid:["완납","bg-emerald-50 text-emerald-700"],overpaid:["초과 납부","bg-purple-50 text-purple-700"],partially_refunded:["부분 환불","bg-orange-50 text-orange-700"],fully_refunded:["전액 환불","bg-slate-100 text-slate-700"]};const [t,c]=m[value]??[value,"bg-slate-100 text-slate-700"];return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${c}`}>{t}</span>}
export const amountInput=(v:string)=>v.replace(/[^0-9]/g,"");
export const amountDisplay=(v:any)=>{const raw=String(v??"").replace(/[^0-9]/g,"");return raw?Number(raw).toLocaleString("ko-KR"):""};
export const money=(v:any)=>`${Number(String(v??0).replace(/[^0-9.-]/g,"")||0).toLocaleString("ko-KR")}원`;
export const dateText=(v:any)=>v?new Date(v).toLocaleDateString("ko-KR"):"-";
