// Input capabilities and real input choose the layout; viewport width only sizes it.
export class InputMode {
 constructor(host=window){
  this.host=host;this.listeners=new Set();this.coarse=host.matchMedia('(pointer: coarse)');this.fine=host.matchMedia('(pointer: fine)');
  this.mode=this.detect();this.apply();
  host.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.pointerType==='pen')this.set('touch');else if(e.pointerType==='mouse')this.set('desktop');},{capture:true});
  host.addEventListener('keydown',e=>{if(e.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;if(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','KeyF','KeyR','Space','ShiftLeft','ShiftRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))this.set('desktop');},{capture:true});
  const changed=()=>this.set(this.detect());this.coarse.addEventListener('change',changed);this.fine.addEventListener('change',changed);
 }
 detect(){return this.coarse.matches||(!this.fine.matches&&(this.host.navigator.maxTouchPoints>0||this.host.navigator.userAgentData?.mobile))?'touch':'desktop';}
 apply(){this.host.document.documentElement.dataset.inputMode=this.mode;}
 set(mode){if(mode===this.mode)return;this.mode=mode;this.apply();for(const callback of this.listeners)callback(mode);}
 subscribe(callback){this.listeners.add(callback);callback(this.mode);return()=>this.listeners.delete(callback);}
 get desktop(){return this.mode==='desktop';}
}
export const inputMode=new InputMode();
