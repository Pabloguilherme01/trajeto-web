export type MobilityExpenseCategory = "pedagio" | "estacionamento" | "outro";
export type MobilityExpense = { id:string; date:string; category:MobilityExpenseCategory; amount:number; note?:string };
const KEY="trajeto-mobility-expenses";
export const mobilityExpenseEvent="trajeto-mobility-expense-change";
function storage():Storage|null{try{return globalThis.localStorage??null}catch{return null}}
function valid(v:unknown):v is MobilityExpense{if(!v||typeof v!=="object")return false;const x=v as Record<string,unknown>;return typeof x.id==="string"&&typeof x.date==="string"&&Number.isFinite(Date.parse(x.date))&&(x.category==="pedagio"||x.category==="estacionamento"||x.category==="outro")&&typeof x.amount==="number"&&Number.isFinite(x.amount)&&x.amount>0&&x.amount<=100000}
export function listMobilityExpenses(){const s=storage();if(!s)return[];try{const raw=JSON.parse(s.getItem(KEY)??"[]");if(!Array.isArray(raw))return[];return raw.filter(valid).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,200)}catch{return[]}}
function save(items:MobilityExpense[]){const s=storage();if(!s)return;try{s.setItem(KEY,JSON.stringify(items.slice(0,200)));if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent(mobilityExpenseEvent))}catch{}}
export function addMobilityExpense(input:Omit<MobilityExpense,"id"|"date">&{date?:string}){if(!Number.isFinite(input.amount)||input.amount<=0||input.amount>100000)return null;const note=input.note?.trim().slice(0,120);const entry:MobilityExpense={id:crypto.randomUUID(),date:input.date??new Date().toISOString(),category:input.category,amount:input.amount,...(note?{note}:{})};save([entry,...listMobilityExpenses()]);return entry}
export function removeMobilityExpense(id:string){save(listMobilityExpenses().filter(x=>x.id!==id))}
export function summarizeMobilityExpenses(items=listMobilityExpenses()){return items.reduce((s,x)=>{s.total+=x.amount;s[x.category]+=x.amount;return s},{total:0,pedagio:0,estacionamento:0,outro:0})}
function cell(v:string|number){return '"'+String(v).replaceAll('"','""')+'"'}
export function buildMobilityExpenseCsv(items=listMobilityExpenses()){return ["Data,Categoria,Valor,Observacao",...items.map(x=>[cell(new Date(x.date).toLocaleString("pt-BR")),cell(x.category),cell(x.amount.toFixed(2).replace(".",",")),cell(x.note??"")].join(","))].join("\n")}