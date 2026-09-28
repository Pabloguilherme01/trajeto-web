const KEY="trajeto-mobility-budget";
function storage():Storage|null{try{return globalThis.localStorage??null}catch{return null}}
export function getMobilityBudget(){const s=storage();if(!s)return 0;try{const value=Number(s.getItem(KEY));return Number.isFinite(value)&&value>0?value:0}catch{return 0}}
export function setMobilityBudget(value:number){const s=storage();if(!s||!Number.isFinite(value)||value<=0)return false;try{s.setItem(KEY,String(value));return true}catch{return false}}
export function clearMobilityBudget(){const s=storage();try{s?.removeItem(KEY);return true}catch{return false}}
export function compareMobilityBudget(total:number,budget=getMobilityBudget()){if(!Number.isFinite(budget)||budget<=0)return null;const cost=Math.max(0,total);return {budget,spent:cost,remaining:budget-cost,usedPercent:(cost/budget)*100,withinBudget:cost<=budget}}
