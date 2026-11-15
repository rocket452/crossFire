import {HumanoidCharacter} from './humanoid-character.js?v=overall-performance-238';
// Solara and Rainbow Star use the same supplied mesh, rig, proportions and finish.
// Each hero owns her materials so element shaders and palette changes remain independent.
export const FEMALE_HERO_BODY=Object.freeze({height:2.59,roughness:.48,metalness:.28});
export function createFemaleHeroBody(model,variant){
 const character=new HumanoidCharacter(model,{variant,height:FEMALE_HERO_BODY.height});
 for(const mesh of character.meshes){mesh.material=mesh.material.clone();mesh.material.roughness=FEMALE_HERO_BODY.roughness;mesh.material.metalness=FEMALE_HERO_BODY.metalness;}
 return character;
}
