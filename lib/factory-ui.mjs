import {emitKeypressEvents} from 'node:readline';
const clean=value=>String(value).replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g,'').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'').replace(/[\x00-\x1f\x7f-\x9f]/g,' ');
const blue=text=>`\x1b[94m${text}\x1b[0m`;
const bold=text=>`\x1b[1m${text}\x1b[0m`;
const dim=text=>`\x1b[90m${text}\x1b[0m`;
export function createTerminalUI({output=process.stdout,plain=false,env=process.env}={}){
 const styled=!!output.isTTY&&!plain&&!Object.hasOwn(env,'NO_COLOR')&&env.TERM!=='dumb'&&(output.columns||80)>=60;
 const animate=styled&&env.LEADFACTORY_REDUCED_MOTION!=='1';
 const write=text=>output.write(text);
 const ui={styled,
  banner(){
   if(!styled){write('\nLeadFactory · OPEN SOURCE\nVotre agence. Votre contexte. Votre CEO.\n');return;}
   const width=48;
   const row=(raw,formatted=raw)=>write(blue('  │')+formatted+' '.repeat(Math.max(0,width-Array.from(raw).length))+blue('│')+'\n');
   write('\n'+blue('  ╭'+'─'.repeat(width)+'╮')+'\n');
   row('  ▛▀▀▘ ▛▀▀▘    LeadFactory  OPEN SOURCE',blue('  ▛▀▀▘ ▛▀▀▘')+'    '+bold('LeadFactory')+'  '+dim('OPEN SOURCE'));
   row('  ▙▄▄  ▙▄      Votre agence, prête à avancer.',blue('  ▙▄▄  ▙▄')+'      Votre agence, prête à avancer.');
   row('  ▙▄▄▖ ▌       Du brief au premier client.',blue('  ▙▄▄▖ ▌')+'       '+dim('Du brief au premier client.'));
   write(blue('  ╰'+'─'.repeat(width)+'╯')+'\n');
  },
  step(number,title){write('\n'+(styled?blue(`  ${String(number).padStart(2,'0')} ━ `)+bold(clean(title)):`${number}. ${clean(title)}`)+'\n');},
  note(text){write((styled?dim('  '+clean(text)):clean(text))+'\n');},
  success(text){write((styled?blue('  ✓ ')+clean(text):'✓ '+clean(text))+'\n');},
  async task(label,work){
   const started=Date.now();let tick=0,timer;
   const render=()=>{const frames=['▰▱▱▱▱','▱▰▱▱▱','▱▱▰▱▱','▱▱▱▰▱','▱▱▱▱▰','▱▱▱▰▱','▱▱▰▱▱','▱▰▱▱▱'];write('\r\x1b[2K'+blue('  '+frames[tick++%frames.length])+'  '+clean(label)+dim(`  ${Math.floor((Date.now()-started)/1000)}s`));};
   if(animate){write('\x1b[?25l');render();timer=setInterval(render,100);}
   else ui.note(label+'…');
   try{const value=await work();if(animate)write('\r\x1b[2K');ui.success(label);return value;}
   catch(error){if(animate)write('\r\x1b[2K');ui.note(label+' — interrompu');throw error;}
   finally{clearInterval(timer);if(animate)write('\x1b[?25h');}
  },
 };
 return ui;
}

/** A real terminal picker, with a numeric fallback supplied by the caller for pipes/dumb terminals. */
export function selectOption(title,options,{input=process.stdin,output=process.stdout,selected=0,signal}={}){
 signal?.throwIfAborted();
 if(!options.length)throw new Error('Menu vide.');
 return new Promise((resolve,reject)=>{
  const wasRaw=!!input.isRaw,wasPaused=input.isPaused();let lines=0,offset=0,digits='',typedAt=0,settled=false;
  selected=Math.max(0,Math.min(selected,options.length-1));
  const width=Math.max(20,(output.columns||80)-10),visible=Math.min(options.length,8);
  const clip=value=>Array.from(clean(value)).slice(0,width).join('');
  const erase=()=>{if(lines)output.write(`\x1b[${lines}A\r\x1b[J`);};
  function render(){
   if(selected<offset)offset=selected;if(selected>=offset+visible)offset=selected-visible+1;
   erase();const block=['',bold('  '+clip(title)),...options.slice(offset,offset+visible).map((label,i)=>{const index=offset+i;return index===selected?blue(`  › ${String(index+1).padStart(2)}  `)+bold(clip(label)):`    ${String(index+1).padStart(2)}  ${clip(label)}`;}),dim(`  ↑↓ choisir · Entrée valider · 1–${options.length} accès direct`), ...(options.length>visible?[dim(`  ${offset+1}–${offset+visible} / ${options.length}`)]:[])];
   output.write(block.join('\n')+'\n');lines=block.length;
  }
  function finish(error){
   if(settled)return;settled=true;input.removeListener('keypress',key);signal?.removeEventListener('abort',abort);input.setRawMode(wasRaw);if(wasPaused)input.pause();erase();if(!error)output.write(blue('  ✓ ')+clip(title)+' · '+clip(options[selected])+'\n');output.write('\x1b[?25h');error?reject(error):resolve(selected);
  }
  const abort=()=>finish(signal?.reason||new DOMException('Annulé','AbortError'));
  function key(text,key={}){
   if(key.ctrl&&key.name==='c'){finish(new DOMException('Annulé','AbortError'));return;}
   if(key.name==='return'){finish();return;}
   if(key.name==='up')selected=(selected+options.length-1)%options.length;
   else if(key.name==='down')selected=(selected+1)%options.length;
   else if(key.name==='home')selected=0;
   else if(key.name==='end')selected=options.length-1;
   else if(/^\d$/.test(text||'')){digits=Date.now()-typedAt>1000?text:digits+text;typedAt=Date.now();if(Number(digits)>options.length)digits=text;if(Number(digits)>=1)selected=Number(digits)-1;}
   else return;
   render();
  }
  emitKeypressEvents(input);input.setRawMode(true);input.resume();input.on('keypress',key);signal?.addEventListener('abort',abort,{once:true});output.write('\x1b[?25l');render();if(signal?.aborted)abort();
 });
}
