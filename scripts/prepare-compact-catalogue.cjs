const fs=require('fs');
const root='work/picture-book/';
const rows=JSON.parse(fs.readFileSync(root+'full-catalogue.json'));
const quote=v=>"'"+String(v).replace(/'/g,"''")+"'";
for(let i=0;i<rows.length;i+=100){
 const data=rows.slice(i,i+100).map(r=>{const d=r.metadata.details||{};return [r.number,r.name,r.form,r.attribute,r.type,d.base||{},d.plus||{},d.level120||{},d.rarity??null,d.race??null,d.battleType??null,r.metadata.name_source,d.sourceUrl||r.metadata.name_source_url];});
 const sql=`insert into public.characters(id,name,form,attribute,attack_type,metadata)
 select 'monst-'||(r->>0),r->>1,r->>2,r->>3,r->>4,
 jsonb_build_object('encyclopedia_number',(r->>0)::int,'name_source',r->>11,'name_source_url',r->>12,'details',jsonb_build_object('base',r->5,'plus',r->6,'level120',r->7,'rarity',r->8,'race',r->>9,'battleType',r->>10,'source',r->>11,'sourceUrl',r->>12,'retrievedAt','2026-10-11'))
 from jsonb_array_elements(${quote(JSON.stringify(data))}::jsonb) r on conflict(id) do nothing;`;
 fs.writeFileSync(root+`compact-${String(i/100).padStart(3,'0')}.sql`,sql);
}
console.log({records:rows.length,batches:Math.ceil(rows.length/100)});
