import {clone as cloneSkeleton} from '/vendor/utils/SkeletonUtils.js';
import {characterYaw,locomotionBlend,smoothYaw,isLocomoting} from '/shared/character-motion.js';
import {meadow} from './meadow.js';
import * as THREE from '/vendor/three.module.js';
import {OrbitControls} from '/vendor/OrbitControls.js';
import {GLTFLoader} from '/vendor/loaders/GLTFLoader.js';
import {mergeGeometries} from '/vendor/utils/BufferGeometryUtils.js';
import {terrain,isWater,hash,LANDMARKS} from '/shared/world.js';
import {groundHeight,cameraDirection} from '/shared/visual-math.js';
import {BUILDINGS} from '/shared/data.js';
import {sky,ocean,detailTexture} from './atmosphere.js';

const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.9,...extra});
const Y=new THREE.Vector3(0,1,0);
export class Renderer3D {
 constructor(game){
  this.game=game;this.canvas=game.canvas;this.scene=new THREE.Scene();this.scene.fog=new THREE.FogExp2(0xb2dce5,.011);
  this.camera=new THREE.PerspectiveCamera(52,1,.12,650);
  this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFShadowMap;
  this.controls=new OrbitControls(this.camera,this.canvas);Object.assign(this.controls,{enablePan:false,enableDamping:true,dampingFactor:.08,minDistance:5,maxDistance:28,minPolarAngle:.3,maxPolarAngle:1.42});
  // Left click is exclusively gameplay; middle drag rotates, right hold blocks.
  this.controls.mouseButtons={LEFT:null,MIDDLE:THREE.MOUSE.ROTATE,RIGHT:null};this.controls.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_PAN};
  this.controls.target.set(30,1.4,51);this.camera.position.set(33,4.6,45);
  this.entities=new Map();this.assets=new Map();this.sharedGeometries=new Set();this.sharedMaterials=new Set();this.pickables=[];this.layer=0;this.time=0;this.ready=false;this.lastFocus=null;this.ray=new THREE.Raycaster();this.ndc=new THREE.Vector2();
  this.detail=detailTexture();this.bark=material(0x79634c,{bumpMap:this.detail,bumpScale:.05});this.stone=material(0x697166,{bumpMap:this.detail,bumpScale:.12});this.leaf=material(0x435b2b,{side:THREE.DoubleSide,roughness:1});this.wood=material(0x695039,{bumpMap:this.detail,bumpScale:.045});
  this.surface=new THREE.Group();this.scene.add(this.surface);this.cave=new THREE.Group();this.cave.visible=false;this.scene.add(this.cave);
  this.sky=sky();this.scene.add(this.sky);this.water=ocean();this.surface.add(this.water);
  this.sun=new THREE.DirectionalLight(0xfff2d8,2.6);this.sun.position.set(-25,35,50);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-23,right:23,top:23,bottom:-23,near:1,far:130});this.sun.shadow.bias=-.0003;this.sun.shadow.normalBias=.035;this.scene.add(this.sun,this.sun.target);
  this.ambient=new THREE.HemisphereLight(0xc2e9ff,0x8c9064,2.1);this.scene.add(this.ambient);
  this.caveLight=new THREE.PointLight(0x72c9d1,28,22,1.4);this.caveLight.visible=false;this.scene.add(this.caveLight);
  this.sharedMaterials=new Set([this.bark,this.stone,this.leaf,this.wood]);this.makeTerrain();this.makeCave();this.makeGrass();this.addScenery();
  this.preview=new THREE.Mesh(new THREE.RingGeometry(.65,.73,48),new THREE.MeshBasicMaterial({color:0xe9cc88,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));this.preview.rotation.x=-Math.PI/2;this.preview.visible=false;this.scene.add(this.preview);
  this.resize();this.onResize=()=>this.resize();addEventListener('resize',this.onResize);
  this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.getElementById('networkStatus').textContent='图形上下文已暂停，请刷新恢复';});
  this.loadAssets();
 }
 resize(){const w=innerWidth,h=innerHeight;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);}
 h(x,z,layer=this.layer){return groundHeight(x,z,layer,this.game.seed);}
 mesh(geo,mat,parent,pos=[0,0,0]){const m=new THREE.Mesh(geo,mat);m.position.set(...pos);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 makeTerrain(){
  const geo=new THREE.PlaneGeometry(130,100,260,200);geo.rotateX(-Math.PI/2);geo.translate(58,0,42);const p=geo.attributes.position,colors=[];
  const palette={ocean:0x786d50,shallow:0x9f9171,lake:0x626a48,sand:0xe4cf97,grass:0x83a651,forest:0x618442,highland:0x8e978a};
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,this.h(x,z,0));const c=new THREE.Color(0x000000);for(const [dx,dz] of [[-.4,-.4],[.4,-.4],[-.4,.4],[.4,.4]]){const t=terrain(x+dx,z+dz,0,this.game.seed);c.add(new THREE.Color(palette[t]||palette.grass).multiplyScalar(.25));}c.multiplyScalar(.86+hash(x*13,z*13)*.24);colors.push(c.r,c.g,c.b);}
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();const mat=material(0xffffff,{vertexColors:true,map:this.detail,bumpMap:this.detail,bumpScale:.018});mat.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n vMapUv = position.xz * 0.55; vBumpMapUv = position.xz * 0.55;');};
  this.ground=new THREE.Mesh(geo,mat);this.ground.receiveShadow=true;this.surface.add(this.ground);
  // Coastal foam ribbons follow actual terrain boundaries, not square grid edges.
  const foamGeo=new THREE.BufferGeometry(),verts=[];
  for(let x=0;x<116;x+=.7)for(let z=0;z<84;z+=.7){const h=this.h(x,z,0);if(h>-.24&&h<-.04){const w=.19;verts.push(x-w,-.02,z-w,x+w,-.02,z-w,x+w,-.02,z+w,x-w,-.02,z-w,x+w,-.02,z+w,x-w,-.02,z+w);}}
  foamGeo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));this.foam=new THREE.Mesh(foamGeo,new THREE.MeshBasicMaterial({color:0xe8e8cd,transparent:true,opacity:.24,depthWrite:false,side:THREE.DoubleSide}));this.surface.add(this.foam);
 }
 makeCave(){const floor=this.mesh(new THREE.PlaneGeometry(34,34,1,1),this.stone,this.cave,[16,-.02,16]);floor.rotation.x=-Math.PI/2;
  const cells=[];for(let x=2;x<31;x++)for(let z=2;z<31;z++)if(terrain(x,z,1)==='wall')cells.push([x,z]);const geo=new THREE.DodecahedronGeometry(.85,1),ins=new THREE.InstancedMesh(geo,this.stone,cells.length),dummy=new THREE.Object3D();cells.forEach(([x,z],i)=>{dummy.position.set(x,1.6,z);dummy.scale.set(1,2.5,1);dummy.rotation.set(.1,hash(x,z)*6,.1);dummy.updateMatrix();ins.setMatrixAt(i,dummy.matrix);});ins.castShadow=ins.receiveShadow=true;this.cave.add(ins);
 }
 makeGrass(){this.grass=meadow((x,z)=>this.h(x,z,0));this.surface.add(this.grass);}
 async loadAssets(){const loader=new GLTFLoader();try{for(const name of ['palm','rock','ruin','shelter','survivor']){const gltf=await loader.loadAsync('/assets/cinematic/'+name+'.glb');if(name==='survivor'){gltf.scene.traverse(m=>{if(m.isMesh){m.castShadow=m.receiveShadow=true;this.sharedGeometries.add(m.geometry);this.sharedMaterials.add(m.material);}});this.characterClips=gltf.animations;this.assets.set(name,gltf.scene);continue;}const groups=new Map();gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(m=>{if(!m.isMesh)return;const geometry=m.geometry.clone().applyMatrix4(m.matrixWorld);const key=m.material.name;if(!groups.has(key))groups.set(key,{material:m.material,geometries:[]});groups.get(key).geometries.push(geometry);});const model=new THREE.Group();for(const {material:mat,geometries} of groups.values()){mat.side=THREE.DoubleSide;mat.bumpMap=this.detail;mat.bumpScale=name==='rock'?.16:.025;mat.needsUpdate=true;const merged=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());this.sharedGeometries.add(merged);this.sharedMaterials.add(mat);const m=new THREE.Mesh(merged,mat);m.castShadow=m.receiveShadow=true;model.add(m);}this.assets.set(name,model);}
    this.decor.clear();this.addDetailedScenery();this.entities.forEach(m=>this.disposeEntity(m));this.entities.clear();this.ready=true;document.body.dataset.assets='ready';
  }catch(e){console.error('Coastal asset loading failed',e);document.body.dataset.assets='fallback';}
 }
 disposeEntity(group){this.scene.remove(group);const geometries=new Set(),materials=new Set();group.traverse(m=>{if(m.geometry&&!this.sharedGeometries.has(m.geometry))geometries.add(m.geometry);if(m.material)for(const mat of (Array.isArray(m.material)?m.material:[m.material]))if(!this.sharedMaterials.has(mat))materials.add(mat);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
 asset(name){const source=this.assets.get(name);return source?(name==='survivor'?cloneSkeleton(source):source.clone(true)):null;}
 addScenery(){this.decor=new THREE.Group();this.surface.add(this.decor);}
 addDetailedScenery(){
  const palms=[];for(let x=5;x<111;x+=2.6)for(let z=6;z<77;z+=2.6){const t=terrain(x,z,0);if(!isWater(t)&&hash(x*3,z*3)>.8&&Math.hypot(x-30,z-51)>6)palms.push({x,z,s:.45+hash(x,z)*.25,r:hash(z,x)*6.28});}
  // Shared GLB geometries are instanced to keep a forest to two draw calls.
  this.instanceAsset('palm',palms,this.decor);
  const rocks=[];for(let x=3;x<113;x+=3)for(let z=4;z<79;z+=3){const t=terrain(x,z,0);if(['highland','sand'].includes(t)&&hash(x,z)>.73)rocks.push({x,z,s:t==='highland'?2+hash(z,x)*2:.5+hash(z,x),r:hash(x,z)*6});}this.instanceAsset('rock',rocks,this.decor);
  const shelter=this.asset('shelter');shelter.position.set(33,this.h(33,54,0),54);shelter.rotation.y=-.35;this.decor.add(shelter);
  const fire=this.building({type:'campfire'});fire.position.set(31.7,this.h(31.7,54,0),54);this.decor.add(fire);this.campfire=fire;
  for(const [x,z,s,r] of [[86,33,1.2,.5],[90,36,.8,.6],[19,21,.75,0]]){const ruin=this.asset('ruin');ruin.position.set(x,this.h(x,z,0),z);ruin.scale.setScalar(s);ruin.rotation.y=r;this.decor.add(ruin);}
  // Distant sea stacks provide parallax; these are genuine geometry, not a background photograph.
  for(const [x,z,s] of [[-22,45,12],[-32,11,15],[143,67,16],[110,105,10]]){const rock=this.asset('rock');rock.position.set(x,-2,z);rock.scale.set(s,s*2.2,s);this.decor.add(rock);}
 }
 instanceAsset(name,placements,parent){const source=this.assets.get(name);if(!source)return;source.children.forEach(m=>{const inst=new THREE.InstancedMesh(m.geometry,m.material,placements.length),d=new THREE.Object3D();placements.forEach((p,i)=>{d.position.set(p.x,this.h(p.x,p.z,0),p.z);d.rotation.y=p.r;d.scale.setScalar(p.s);d.updateMatrix();inst.setMatrixAt(i,d.matrix);});inst.castShadow=inst.receiveShadow=true;parent.add(inst);});}
 node(n){let g=new THREE.Group();if(['tree','palm'].includes(n.type)){const p=this.asset('palm');if(p){p.scale.setScalar(n.type==='tree'?.55:.48);g.add(p);}else this.mesh(new THREE.CylinderGeometry(.1,.2,3,8),this.bark,g,[0,1.5,0]);}
  else if(['rock','ore','stone'].includes(n.type)){const p=this.asset('rock');if(p){p.scale.setScalar(n.type==='stone'?.22:.62);g.add(p);}else this.mesh(new THREE.IcosahedronGeometry(.45,1),this.stone,g,[0,.3,0]);}
  else if(n.type==='branch'){for(let i=0;i<3;i++){const m=this.mesh(new THREE.CylinderGeometry(.022,.045,.75,7),this.wood,g,[i*.08,.07,0]);m.rotation.set(.2,0,1.2+i*.4);}}
  else if(n.type==='crystal'){for(let i=0;i<4;i++){const m=this.mesh(new THREE.ConeGeometry(.13,.6+i*.1,5),material(0x64bac5,{emissive:0x285d64,emissiveIntensity:.6}),g,[i*.13-.2,.3,i%2*.1]);m.rotation.z=(i-2)*.18;}}
  else {for(let i=0;i<7;i++){const leaf=this.mesh(new THREE.SphereGeometry(.23,6,4),this.leaf,g,[Math.cos(i)*.22,.2+Math.sin(i)*.07,Math.sin(i)*.22]);leaf.scale.set(.5,1.6,.4);leaf.rotation.z=i;}if(['berry','herb'].includes(n.type))for(let i=0;i<4;i++)this.mesh(new THREE.SphereGeometry(.055,6,4),material(n.type==='berry'?0x9b3540:0xe0bd85),g,[Math.cos(i*2)*.15,.5,Math.sin(i*2)*.15]);}
  g.userData.nodeId=n.id;g.userData.foliage=['tree','palm'].includes(n.type);return g;
 }
 actor(p,self){const model=this.asset('survivor');if(model){const mixer=new THREE.AnimationMixer(model);model.userData.mixer=mixer;model.userData.actions={};for(const clip of this.characterClips||[]){const action=mixer.clipAction(clip);action.play();action.setEffectiveWeight(clip.name==='Idle'?1:0);model.userData.actions[clip.name]=action;}model.userData.limbs=['leg_L','arm_L','leg_R','arm_R'].map(n=>model.getObjectByName(n));model.userData.knees=['knee_L','knee_R'].map(n=>model.getObjectByName(n));return model;}const g=new THREE.Group(),shirt=material(self?0x8d7955:0x507b78),skin=material(0xc29772),pants=material(0x3e443d);this.mesh(new THREE.CapsuleGeometry(.24,.48,5,10),shirt,g,[0,1.02,0]);this.mesh(new THREE.SphereGeometry(.19,14,10),skin,g,[0,1.62,0]);const hair=this.mesh(new THREE.SphereGeometry(.2,12,8),this.wood,g,[0,1.73,0]);hair.scale.y=.6;
  const limbs=[];for(const s of [-1,1]){const leg=new THREE.Group();leg.position.set(s*.13,.78,0);this.mesh(new THREE.CapsuleGeometry(.085,.48,4,8),pants,leg,[0,-.29,0]);this.mesh(new THREE.BoxGeometry(.17,.13,.29),this.wood,leg,[0,-.65,.045]);g.add(leg);limbs.push(leg);const arm=new THREE.Group();arm.position.set(s*.3,1.24,0);this.mesh(new THREE.CapsuleGeometry(.065,.4,4,8),shirt,arm,[0,-.24,0]);this.mesh(new THREE.SphereGeometry(.07,8,6),skin,arm,[0,-.52,0]);g.add(arm);limbs.push(arm);}
  const pack=this.mesh(new THREE.BoxGeometry(.4,.46,.2),this.wood,g,[0,1.12,-.24]);pack.rotation.x=.1;g.userData.limbs=limbs;return g;
 }
 enemy(e){const g=new THREE.Group();if(e.type==='boss'){const r=this.asset('rock');if(r){r.scale.set(1.7,3,1.4);g.add(r);}else this.mesh(new THREE.IcosahedronGeometry(1.2,1),this.stone,g,[0,1,0]);}else{const body=this.mesh(new THREE.SphereGeometry(.45,12,8),e.type==='crab'?material(0x8a4c32):this.wood,g,[0,.42,0]);body.scale.set(1,.7,1.4);for(let i=0;i<6;i++){const leg=this.mesh(new THREE.CylinderGeometry(.035,.05,.6,6),this.wood,g,[i%2?.4:-.4,.23,(Math.floor(i/2)-1)*.32]);leg.rotation.z=i%2?-1:1;}}
 return g;}
 building(b){const g=new THREE.Group(),type=b.type;
  if(type==='campfire'){for(let i=0;i<9;i++){const rock=this.mesh(new THREE.IcosahedronGeometry(.15,1),this.stone,g,[Math.cos(i*.7)*.44,.1,Math.sin(i*.7)*.44]);rock.scale.y=.7;}for(let i=0;i<3;i++){const log=this.mesh(new THREE.CylinderGeometry(.08,.11,.75,8),this.wood,g,[0,.13+i*.025,0]);log.rotation.set(Math.PI/2,i*1.1,0);}for(let i=0;i<3;i++){const f=this.mesh(new THREE.SphereGeometry(.17,8,8),material(0xffad35,{emissive:0xff7014,emissiveIntensity:3,transparent:true,opacity:.78}),g,[(i-1)*.1,.42,0]);f.scale.set(.8,2.2,.7);f.userData.flame=true;}const light=new THREE.PointLight(0xff9a43,14,9,1.8);light.position.y=1;g.add(light);}
  else if(type==='raft'){for(let i=0;i<7;i++){const log=this.mesh(new THREE.CylinderGeometry(.14,.14,2.8,10),this.wood,g,[(i-3)*.27,.1,0]);log.rotation.x=Math.PI/2;}this.mesh(new THREE.CylinderGeometry(.045,.07,2.8,8),this.wood,g,[0,1.4,0]);const sail=this.mesh(new THREE.PlaneGeometry(1.2,1.7),material(0xcbb991,{side:THREE.DoubleSide}),g,[.57,1.8,0]);}
  else if(type==='roof'){const asset=this.asset('shelter');if(asset){asset.scale.setScalar(.6);g.add(asset);}}
  else if(['wall','door'].includes(type)){for(let i=0;i<7;i++)this.mesh(new THREE.BoxGeometry(.17,1.9,.13),this.wood,g,[(i-3)*.18,.95,0]);}
  else if(type==='bed'){this.mesh(new THREE.BoxGeometry(.65,.12,1.6),material(0x858164),g,[0,.09,0]);}
  else if(['well','furnace'].includes(type)){const m=this.mesh(new THREE.CylinderGeometry(.5,.6,.8,14,1,true),this.stone,g,[0,.4,0]);m.material.side=THREE.DoubleSide;}
  else{const height=type==='workbench'?.8:type==='chest'?.45:.12;for(let i=0;i<6;i++)this.mesh(new THREE.BoxGeometry(.2,.12,1.1),this.wood,g,[(i-2.5)*.22,height,0]);if(height>.2)for(const x of [-.48,.48])for(const z of [-.4,.4])this.mesh(new THREE.BoxGeometry(.1,height,.1),this.wood,g,[x,height/2,z]);if(type==='chest')this.mesh(new THREE.BoxGeometry(1.2,.42,1),this.wood,g,[0,.26,0]);}
  return g;
 }
 setLayer(layer){if(layer===this.layer)return;this.layer=layer;this.surface.visible=!layer;this.cave.visible=!!layer;this.sky.visible=!layer;this.scene.background=layer?new THREE.Color(0x101b20):null;this.scene.fog.color.set(layer?0x101b20:0xb2dce5);this.sun.intensity=layer?.15:2.6;this.ambient.intensity=layer?.45:2.1;this.caveLight.visible=!!layer;this.lastFocus=null;}
 sync(dt){const g=this.game,s=g.self;if(!s)return;this.setLayer(s.z);const focus=g.predicted||s,point=new THREE.Vector3(focus.x,this.h(focus.x,focus.y)+1.25,focus.y);
  if(!this.lastFocus){const delta=point.clone().sub(this.controls.target);this.camera.position.add(delta);this.controls.target.copy(point);this.lastFocus=point.clone();}else{const delta=point.clone().sub(this.controls.target).multiplyScalar(1-Math.exp(-dt*7));this.controls.target.add(delta);this.camera.position.add(delta);}
  this.sun.position.set(focus.x-25,36,focus.y+38);this.sun.target.position.set(focus.x,0,focus.y);this.caveLight.position.set(focus.x,3.6,focus.y);this.pickables=[];const alive=new Set();
  const upsert=(key,entity,create)=>{alive.add(key);let m=this.entities.get(key);if(!m){m=create();m.position.set(entity.x,this.h(entity.x,entity.y),entity.y);this.entities.set(key,m);this.scene.add(m);}return m;};
  for(const n of g.state.nodes||[]){if(n.z!==s.z||n.hp<=0)continue;const m=upsert('n:'+n.id,n,()=>this.node(n));this.pickables.push(m);}
  for(const p of g.state.players||[]){if(p.z!==s.z)continue;const m=upsert('p:'+p.id,p,()=>this.actor(p,p.id===s.id));const pos=p.id===s.id?focus:p;const ground=isWater(terrain(pos.x,pos.y,s.z))?-.65:this.h(pos.x,pos.y);m.position.lerp(new THREE.Vector3(pos.x,ground,pos.y),1-Math.exp(-dt*16));m.rotation.y=smoothYaw(m.rotation.y,characterYaw(p.facing||0),dt);const moving=isLocomoting(p);const blend=locomotionBlend(m.userData.walkBlend||0,moving,dt);m.userData.walkBlend=blend;m.userData.stride=(m.userData.stride||0)+dt*(p.action==='run'?11:8);const stride=m.userData.stride;if(m.userData.mixer){const actions=m.userData.actions;actions.Idle?.setEffectiveWeight(1-blend);const run=locomotionBlend(m.userData.runBlend||0,moving&&p.action==='run',dt);m.userData.runBlend=run;actions.Walk?.setEffectiveWeight(blend*(actions.Run?1-run:1));actions.Run?.setEffectiveWeight(blend*run);m.userData.mixer.update(dt);}else {m.userData.limbs.forEach((l,i)=>{if(l)l.rotation.x=Math.sin(stride+([0,3].includes(i)?0:Math.PI))*.4*blend+Math.sin(this.time*1.8)*.016*(1-blend);});m.userData.knees?.forEach((k,i)=>{if(k)k.rotation.x=Math.max(0,Math.sin(stride+i*Math.PI))*.48*blend;});}}
  for(const e of g.state.enemies||[]){if(e.z!==s.z)continue;const m=upsert('e:'+e.id,e,()=>this.enemy(e));m.position.lerp(new THREE.Vector3(e.x,this.h(e.x,e.y),e.y),1-Math.exp(-dt*10));}
  for(const b of g.state.buildings||[]){if(b.z!==s.z)continue;const m=upsert('b:'+b.id,b,()=>this.building(b));m.position.set(b.x,BUILDINGS[b.type]?.water?-.06:this.h(b.x,b.y),b.y);m.rotation.y=(b.rotation||0)*Math.PI/2;if(b.type==='door'&&b.open)m.rotation.y+=Math.PI/2;}
  for(const d of g.state.drops||[]){if(d.z!==s.z)continue;upsert('d:'+d.id,d,()=>{const m=new THREE.Group();this.mesh(new THREE.IcosahedronGeometry(.13,1),material(0xdac790,{emissive:0x5a411a,emissiveIntensity:.4}),m,[0,.2,0]);return m;});}
  for(const [key,m] of this.entities)if(!alive.has(key)){this.disposeEntity(m);this.entities.delete(key);}
 }
 draw(t,dt){this.frameCount=(this.frameCount||0)+1;if(!this.perfStart)this.perfStart=t;if(t-this.perfStart>=2){document.body.dataset.renderFps=String(Math.round(this.frameCount/(t-this.perfStart)));this.frameCount=0;this.perfStart=t;}this.time=t;if(this.grass)this.grass.userData.wind.value=t;this.sync(dt);this.controls.enabled=!!this.game.self&&!this.game.ui?.isOpen();this.controls.update();this.camera.position.y=Math.max(this.camera.position.y,this.h(this.camera.position.x,this.camera.position.z)+.8);this.sky.position.copy(this.camera.position);this.water.material.uniforms.time.value=t;this.water.material.uniforms.eye.value.copy(this.camera.position);this.foam.material.opacity=.17+Math.sin(t*1.3)*.07;
  if(this.campfire)this.campfire.children.forEach(m=>{if(m.userData.flame)m.scale.y=1.6+Math.sin(t*11+m.position.x*12)*.5;});
  this.preview.visible=!!this.game.build;if(this.preview.visible){const p=this.unproject(this.game.input.pointer.x,this.game.input.pointer.y);this.preview.position.set(p.x,this.h(p.x,p.y)+.06,p.y);}
  for(const [key,m] of this.entities){if(!key.startsWith('n:'))continue;m.visible=!(m.userData.foliage&&Math.hypot(m.position.x-this.camera.position.x,m.position.z-this.camera.position.z)<4.5);}this.renderer.render(this.scene,this.camera);
 }
 direction(h,v){return cameraDirection(h,v,this.controls.getAzimuthalAngle());}
 cast(x,y){const r=this.canvas.getBoundingClientRect();this.ndc.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);this.ray.setFromCamera(this.ndc,this.camera);return this.ray;}
 unproject(x,y){const ray=this.cast(x,y);const hit=ray.intersectObject(this.layer?this.cave:this.ground,true)[0];if(hit)return {x:hit.point.x,y:hit.point.z};const p=new THREE.Vector3();if(ray.ray.intersectPlane(new THREE.Plane(Y,0),p))return {x:p.x,y:p.z};return {x:this.game.self?.x||30,y:this.game.self?.y||51};}
 pickNode(x,y){const hit=this.cast(x,y).intersectObjects(this.pickables,true)[0];if(!hit)return null;let object=hit.object;while(object&&!object.userData.nodeId)object=object.parent;return object?{id:object.userData.nodeId}:null;}
}
