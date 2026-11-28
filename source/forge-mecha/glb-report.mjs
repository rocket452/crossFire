// Reads a .glb directly (no renderer) and reports triangles, bones, animation clips, textures and file size.
// Usage: node source/forge-mecha/glb-report.mjs file.glb [--json]
// Triangles count every drawn instance: a mesh referenced by several nodes counts once per node.
import fs from 'node:fs';

export function readGlb(path){
 const buf=fs.readFileSync(path),dv=new DataView(buf.buffer,buf.byteOffset,buf.byteLength);
 if(dv.getUint32(0,true)!==0x46546c67)throw Error(path+' is not a binary glTF');
 let offset=12,json=null,bin=null;
 while(offset<buf.length){const len=dv.getUint32(offset,true),type=dv.getUint32(offset+4,true),chunk=buf.subarray(offset+8,offset+8+len);
  if(type===0x4e4f534a)json=JSON.parse(chunk.toString('utf8'));else if(type===0x004e4942)bin=chunk;offset+=8+len;}
 return{json,bin,size:buf.length};
}
function imageSize(bytes){
 if(bytes[0]===0x89&&bytes[1]===0x50)return[bytes.readUInt32BE(16),bytes.readUInt32BE(20)];
 if(bytes[0]===0xff&&bytes[1]===0xd8){let i=2;while(i<bytes.length){if(bytes[i]!==0xff){i++;continue;}const m=bytes[i+1];if(m>=0xc0&&m<=0xcf&&![0xc4,0xc8,0xcc].includes(m))return[bytes.readUInt16BE(i+7),bytes.readUInt16BE(i+5)];i+=2+bytes.readUInt16BE(i+2);}}
 if(bytes.toString('ascii',0,4)==='RIFF')return['webp','?'];return['?','?'];
}
export function report(path){
 const {json,bin,size}=readGlb(path),acc=json.accessors||[];
 const primTris=p=>{const mode=p.mode??4,count=p.indices!==undefined?acc[p.indices].count:acc[p.attributes.POSITION].count;return mode===4?count/3:mode===5||mode===6?Math.max(0,count-2):0;};
 const meshTris=(json.meshes||[]).map(m=>m.primitives.reduce((t,p)=>t+primTris(p),0));
 let triangles=0,skinned=0,meshNodes=0;
 for(const n of json.nodes||[])if(n.mesh!==undefined){triangles+=meshTris[n.mesh];meshNodes++;if(n.skin!==undefined)skinned++;}
 const skins=(json.skins||[]).map(s=>({joints:s.joints.length,names:s.joints.map(j=>json.nodes[j].name)}));
 const bones=new Set(skins.flatMap(s=>s.names));
 const clips=(json.animations||[]).map(a=>{let duration=0;for(const s of a.samplers){const input=acc[s.input];duration=Math.max(duration,input.max?.[0]??0);}return{name:a.name,channels:a.channels.length,duration:+duration.toFixed(4)};});
 const images=(json.images||[]).map(img=>{const view=json.bufferViews[img.bufferView],bytes=bin.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);return{name:img.name,mime:img.mimeType,size:imageSize(Buffer.from(bytes)),bytes:view.byteLength};});
 const materials=(json.materials||[]).map(m=>m.name);
 return{file:path,bytes:size,mb:+(size/1048576).toFixed(3),triangles,meshes:(json.meshes||[]).length,meshNodes,skinnedMeshNodes:skinned,skins:skins.length,bones:bones.size,boneNames:[...bones],clips,images,materials,nodes:(json.nodes||[]).length};
}
if(import.meta.url===`file://${process.argv[1]}`){
 const r=report(process.argv[2]);
 if(process.argv.includes('--json'))console.log(JSON.stringify(r,null,1));
 else{const {boneNames,...rest}=r;console.log(JSON.stringify(rest,null,1));}
}
