const fs = require('fs');
const root = 'work/picture-book/';
const source = JSON.parse(fs.readFileSync(root + 'gamewith-details-current.json'));
const numeric = v => v !== '' && v != null && Number.isFinite(Number(v)) ? Number(v) : null;
const quote = v => "'" + String(v).replace(/'/g, "''") + "'";
const rows = new Map();
for (const c of source) {
 const n = Number(c.アイコン);
 if (!Number.isInteger(n) || n < 1 || !c.モンスター名) throw Error('Invalid catalogue record');
 if (rows.has(n)) continue; // Duplicate editorial rows use the same encyclopedia identity.
 const details = {rarity:numeric(c.レアリティ),race:c.種族,battleType:c.戦型,
  base:{hp:numeric(c.Lv極HP),attack:numeric(c.Lv極攻撃力),speed:numeric(c.Lv極スピード)},
  plus:{hp:numeric(c.タス最大値HP),attack:numeric(c.タス最大値攻撃力),speed:numeric(c.タス最大値スピード)},
  level120:{hp:numeric(c.Lv120HP),attack:numeric(c.Lv120攻撃力),speed:numeric(c.Lv120スピード)},
  abilities:c.abilities || [],gauge:c.gaugeShots || [],connect:c.connectSkills || [],connectCondition:c.コネクト条件,
  shotSkill:c.ショットスキル,assistSkill:c.アシストスキル,ssEffect:c.ストライクショット効果,ssTurns:c.ストライクショット数,
  friendships:c.friendships || [],luckSkill:c.ラックスキル,source:'GameWith',
  sourceUrl:`https://xn--eckwa2aa3a9c8j8bve9d.gamewith.jp/article/show/${c.記事番号}`,retrievedAt:'2026-10-11'};
 rows.set(n,{number:n,name:c.モンスター名,form:c.進化状態,attribute:c.属性,type:c.撃種,
 metadata:{encyclopedia_number:n,name_source:'GameWith',search_aliases:c.検索用,details}});
}
function text(html) { return html.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').trim(); }
(async()=>{
 const missing = Array.from({length:Math.max(...rows.keys())},(_,i)=>i+1).filter(n=>!rows.has(n));
 const pages = [...new Set(missing.map(n=>Math.floor((n-1)/100)*100+1))];
 for (const page of pages) {
  const url=`https://altema.jp/monsuto/monsterlist/${page}`;
  const cache=root+`altema-list-${page}.html`;
  let html;
  if(fs.existsSync(cache)) html=fs.readFileSync(cache,'utf8');
  else {const response=await fetch(url);if(!response.ok)throw Error(`${url}: ${response.status}`);html=await response.text();fs.writeFileSync(cache,html);}
  for(const tr of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
   const cells=[...tr[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>m[1]);
   const no=cells.map(text).find(t=>/^No\.\s*\d+$/.test(t));
   if(!no)continue;
   const n=Number(no.match(/\d+/)[0]);if(rows.has(n)||n<page||n>=page+100)continue;
   const name=text(cells.at(-1));if(!name)continue;
   rows.set(n,{number:n,name,form:null,attribute:null,type:null,metadata:{encyclopedia_number:n,name_source:'Altema',name_source_url:url}});
  }
  console.log(`Supplement page ${page}: ${rows.size}`);
 }
 const sorted=[...rows.values()].sort((a,b)=>a.number-b.number);
 fs.writeFileSync(root+'full-catalogue.json',JSON.stringify(sorted));
 const gaps=Array.from({length:9504},(_,i)=>i+1).filter(n=>!rows.has(n));
 fs.writeFileSync(root+'full-catalogue-gaps.json',JSON.stringify(gaps));
 for(let i=0;i<sorted.length;i+=20){
  const sql='begin;\n'+sorted.slice(i,i+20).map(r=>`insert into public.characters(id,name,form,attribute,attack_type,metadata) values (${quote('monst-'+r.number)},${quote(r.name)},${r.form?quote(r.form):'null'},${r.attribute?quote(r.attribute):'null'},${r.type?quote(r.type):'null'},${quote(JSON.stringify(r.metadata))}::jsonb) on conflict(id) do nothing;`).join('\n')+'\ncommit;';
  fs.writeFileSync(root+`full-small-${String(i/20).padStart(3,'0')}.sql`,sql);
 }
 console.log(JSON.stringify({records:sorted.length,batches:Math.ceil(sorted.length/100),gaps}));
})().catch(e=>{console.error(e);process.exitCode=1});
