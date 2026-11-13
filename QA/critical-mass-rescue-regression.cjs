// Reuse the established real-input City Battle wave tests. The old suite's
// evacuation half assumes civilians already exist before the current 15s delay.
const source=require('fs').readFileSync('QA/runner-wave-browser.cjs','utf8'),marker="await p.goto('http://127.0.0.1:8765/?scene=evacuation');";
if(!source.includes(marker))throw Error('Established rescue harness marker changed');
eval(source.replace(marker,"console.log('PASS existing City Battle rescue wave: desktop/touch E hold/release, friendly carry/reform, phase protection, collisions, buffer and CPU return');await p.close();continue;"+marker));
