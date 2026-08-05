import { createClient } from "@supabase/supabase-js";
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const {data}=await db.from("blog_posts").select("slug,title,excerpt,meta_description,body_html");
let bad=[];
for(const p of data){
  const n=(p.body_html.match(/<!-- cta-accompagnement -->/g)||[]).length;
  const issues=[];
  if(n!==1)issues.push(`marqueurs CTA=${n}`);
  if(/caroleherve\.fr/.test(p.body_html))issues.push("lien caroleherve.fr restant");
  if(/gorendezvous/.test(p.body_html))issues.push("lien gorendezvous restant");
  if(/BLOG10/.test(p.body_html))issues.push("BLOG10");
  if(!p.excerpt||!p.meta_description)issues.push("chapô/meta vide");
  if(p.body_html.trimEnd().slice(-6)!=="</div>")issues.push("ne finit pas par le bloc CTA");
  if(issues.length)bad.push(`${p.slug}: ${issues.join(", ")}`);
}
console.log("articles:",data.length,"| anomalies:",bad.length);bad.forEach(b=>console.log(" -",b));
const s=data.find(x=>x.slug==="engorgement-ce-qu-on-ne-vous-dit-pas");
console.log("\nÉCHANTILLON",s.title,"\nchapô:",s.excerpt,"\nfin de corps:\n",s.body_html.slice(-950));
