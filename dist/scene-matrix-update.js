// The renderer recomputes every object's matrices each frame, hidden or not. Most of the scene is hidden at any
// moment (pooled enemies, inactive heroes, bosses waiting for their phase), so hidden top-level groups are
// skipped and flagged. A flagged group recomputes its whole subtree on the first update after it is shown.
// Hidden objects inside visible groups still update as before. Object3D.localToWorld, getWorldPosition and
// updateWorldMatrix remain exact for hidden objects because they update their own parent chain.
export function skipHiddenRootMatrices(scene){
 scene.updateMatrixWorld=function(force){
  if(this.matrixAutoUpdate)this.updateMatrix();
  if(this.matrixWorldNeedsUpdate||force){
   if(this.matrixWorldAutoUpdate===true)this.matrixWorld.copy(this.matrix);
   this.matrixWorldNeedsUpdate=false;force=true;
  }
  const children=this.children;
  for(let i=0;i<children.length;i++){
   const child=children[i];
   if(child.visible)child.updateMatrixWorld(force);
   else child.matrixWorldNeedsUpdate=true;
  }
 };
 return scene;
}
