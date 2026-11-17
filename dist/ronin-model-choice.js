const KEY='crossfire.ronin.model';
export function readRoninModel(storage){try{return (storage??globalThis.localStorage)?.getItem(KEY)==='original'?'original':'shogun';}catch{return 'shogun';}}
export function saveRoninModel(value,storage){try{(storage??globalThis.localStorage)?.setItem(KEY,value==='original'?'original':'shogun');}catch{}}
export function setupRoninModelChoice(select,getRonin){select.value=readRoninModel();select.addEventListener('change',()=>{saveRoninModel(select.value);getRonin()?.setModelVariant(select.value);});}
