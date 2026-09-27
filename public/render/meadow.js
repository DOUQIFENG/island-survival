import * as THREE from '/vendor/three.module.js';
import {hash,terrain} from '/shared/world.js';
export function meadow(height){
 const vertices=[],colors=[],indices=[];
 // Each tuft has seven curved, tapered blades with three segments and a raised center rib.
 for(let b=0;b<7;b++){
  const a=b*2.399, length=.22+hash(b,7)*.28, width=.035+hash(b,8)*.028;
  const ox=Math.cos(a)*.12,oz=Math.sin(a)*.12,base=vertices.length/3;
  for(let j=0;j<=3;j++){const t=j/3,bend=t*t*.28,w=width*(1-t)+.001;
   for(let edge=-1;edge<=1;edge++){vertices.push(ox+Math.cos(a)*bend-Math.sin(a)*w*edge,length*t,oz+Math.sin(a)*bend+Math.cos(a)*w*edge+(edge===0?.012*Math.sin(t*Math.PI):0));const c=new THREE.Color().setHSL(.25-t*.028,.48,.19+t*.13);colors.push(c.r,c.g,c.b);}}
  for(let j=0;j<3;j++)for(let k=0;k<2;k++){const i=base+j*3+k;indices.push(i,i+3,i+1,i+1,i+3,i+4);}
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
 const wind={value:0},mat=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,side:THREE.DoubleSide,roughness:1});
 mat.onBeforeCompile=s=>{s.uniforms.windTime=wind;s.vertexShader='uniform float windTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 vec3 root = (instanceMatrix * vec4(0.,0.,0.,1.)).xyz;
 float sway = sin(windTime*1.5+root.x*.65+root.z*.4)*.07+sin(windTime*2.3+root.z)*.025;
 transformed.x += sway*position.y*position.y;
 transformed.z += sway*.5*position.y;`);};
 const positions=[];for(let x=4;x<109;x+=.85)for(let z=7;z<77;z+=.85){const px=x+hash(x*21,z)*.5,pz=z+hash(x,z*31)*.5,t=terrain(px,pz,0);if(!['grass','forest'].includes(t)||hash(Math.floor(x/3),Math.floor(z/3))<.17)continue;if(Math.hypot(px-30,pz-51)<1.6||Math.hypot(px-33,pz-54)<2.3)continue;positions.push([px,pz]);}
 const mesh=new THREE.InstancedMesh(geo,mat,positions.length),d=new THREE.Object3D();positions.forEach(([x,z],i)=>{d.position.set(x,height(x,z),z);d.rotation.y=hash(x,z)*6.28;const s=.60+hash(z,x)*.7;d.scale.set(s,s,s);d.updateMatrix();mesh.setMatrixAt(i,d.matrix);mesh.setColorAt(i,new THREE.Color().setScalar(.8+hash(x*3,z)*.4));});mesh.receiveShadow=true;mesh.userData.wind=wind;return mesh;
}
