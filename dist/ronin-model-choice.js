// The original sword-and-shield Ronin is the default again; the licensed Shogun look is an opt-in alternate.
// A new key so an earlier saved Shogun preference does not keep overriding the original model.
const KEY='crossfire.ronin.model.v2';
export function readRoninModel(storage){try{return (storage??globalThis.localStorage)?.getItem(KEY)==='shogun'?'shogun':'original';}catch{return 'original';}}
export function saveRoninModel(value,storage){try{(storage??globalThis.localStorage)?.setItem(KEY,value==='shogun'?'shogun':'original');}catch{}}
export function setupRoninModelChoice(select,getRonin){select.value=readRoninModel();select.addEventListener('change',()=>{saveRoninModel(select.value);getRonin()?.setModelVariant(select.value);});}
