// Lager et grafisk kort (1200x675 JPEG) for saker uten eget bilde.
// Bruk: node lag_kort.js "Kilde" "Tittel" ut.jpg
// Krever pakken playwright (npm i playwright) og Chromium i /opt/pw-browsers/chromium.
const path=require('path'),fs=require('fs');
let chromium;try{({chromium}=require('playwright'))}catch(e){({chromium}=require(path.join(process.cwd(),'node_modules','playwright')))}
(async()=>{const [kilde,tittel,ut]=process.argv.slice(2);
const e=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
const fsz=tittel.length>70?54:tittel.length>45?62:72;
const html=fs.readFileSync(path.join(__dirname,'kort.html'),'utf8').replace('__KILDE__',e(kilde)).replace('__TITTEL__',e(tittel)).replace('__FS__',fsz);
const tmp=path.join(path.dirname(path.resolve(ut)),'_kort.html');fs.writeFileSync(tmp,html);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const p=await b.newPage({viewport:{width:1200,height:675}});await p.goto('file://'+tmp,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
await p.screenshot({path:ut,type:'jpeg',quality:88});await b.close();fs.unlinkSync(tmp);})();
