// Separate art/combat test scene. The established arena's 240m bounds and enemy
// positions are reused; existing map layouts are never modified.
const colors=['#d8e3e5','#becfd4','#c8c7c1','#adc8d0'];
const plots=[];
for(const x of [-60,-36,-12,12,36,60])for(const z of [-60,-36,-12,12,36,60]){
 if(Math.abs(x)<60&&Math.abs(z)<60&&!(Math.abs(x)===36&&Math.abs(z)===36))continue;
 plots.push({x,z});
}
for(const a of [-60,-12,36])for(const side of [-1,1]){
 plots.push({x:side*84,z:a},{x:a,z:side*84});
}
export const ASSET_CITY={
 id:'city-test',label:'Asset City Test',
 modelUrl:'city-assets/licensed-city/city-test.glb?v=311',
 manifestUrl:'city-assets/licensed-city/city-test.json?v=311',
 buildings:plots.map((p,i)=>({id:'ASSET-'+i,...p,asset:i%4===0?'shop':'tower',tint:colors[i%colors.length],yaw:(i%4)*Math.PI/2})),
};
