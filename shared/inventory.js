import {ITEMS} from './data.js';
export const emptyBag=(n=24)=>Array(n).fill(null);
export function count(bag,id){return bag.reduce((n,s)=>n+(s?.id===id?s.n:0),0);}
export function has(bag,cost){return Object.entries(cost).every(([id,n])=>count(bag,id)>=n);}
export function add(bag,id,n=1,dur){if(!ITEMS[id])return n;const max=ITEMS[id].stack||99;for(const s of bag){if(s?.id===id&&s.n<max){const take=Math.min(n,max-s.n);s.n+=take;n-=take;if(!n)return 0;}}for(let i=0;i<bag.length&&n;i++){if(!bag[i]){const take=Math.min(n,max);bag[i]={id,n:take,...(ITEMS[id].durability?{dur:dur??ITEMS[id].durability}:{})};n-=take;}}return n;}
export function take(bag,id,n){if(count(bag,id)<n)return false;for(let i=0;i<bag.length&&n;i++){const s=bag[i];if(s?.id===id){const v=Math.min(n,s.n);s.n-=v;n-=v;if(s.n===0)bag[i]=null;}}return true;}
export function spend(bag,cost){if(!has(bag,cost))return false;for(const [id,n]of Object.entries(cost))take(bag,id,n);return true;}
export function moveSlot(bag,a,b,split=false){if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a>=bag.length||b>=bag.length||a===b||!bag[a])return false;const s=bag[a],t=bag[b],max=ITEMS[s.id].stack||99;if(split){if(t&&t.id!==s.id)return false;const n=Math.min(Math.ceil(s.n/2),max-(t?.n||0));if(!n)return false;bag[b]=t?{...t,n:t.n+n}:{...s,n};s.n-=n;if(!s.n)bag[a]=null;}else if(t?.id===s.id&&max>1){const n=Math.min(s.n,max-t.n);t.n+=n;s.n-=n;if(!s.n)bag[a]=null;}else{bag[a]=t;bag[b]=s;}return true;}
