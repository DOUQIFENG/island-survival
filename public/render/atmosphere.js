import * as THREE from '/vendor/three.module.js';
export function detailTexture(){
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d'),im=ctx.createImageData(256,256);let seed=17;
 for(let i=0;i<im.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=218+(seed%26);im.data[i]=n;im.data[i+1]=n;im.data[i+2]=n;im.data[i+3]=255;}
 ctx.putImageData(im,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,1);return t;
}
export function sky(){return new THREE.Mesh(new THREE.SphereGeometry(360,40,24),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{sun:{value:new THREE.Vector3(-.45,.72,.52).normalize()}},vertexShader:`varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 v;uniform vec3 sun;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
 void main(){vec3 d=normalize(v);float h=max(d.y,0.);float s=max(dot(d,sun),0.);vec3 c=mix(vec3(.68,.87,.92),vec3(.10,.46,.72),pow(h,.45));c+=vec3(1.,.89,.65)*pow(s,18.)*.45;c+=vec3(1.,.85,.57)*smoothstep(.9994,.9999,s)*3.;vec2 p=d.xz/(max(d.y,.05)+.3)*2.;float cloud=noise(p*2.)*.6+noise(p*4.)*.25+noise(p*8.)*.15;float a=smoothstep(.49,.77,cloud)*smoothstep(.0,.12,h);c=mix(c,vec3(.95,.98,1.)+pow(s,10.)*.35,a*.85);gl_FragColor=vec4(c,1.);}` }));}
export function ocean(){const uniforms={time:{value:0},eye:{value:new THREE.Vector3()}};const m=new THREE.ShaderMaterial({uniforms,transparent:false,side:THREE.DoubleSide,
 vertexShader:`uniform float time;varying vec3 wp;varying vec3 norm;void main(){vec3 p=position;float a=p.x*.52+p.z*.24-time*.8;float b=p.x*.2-p.z*.7-time*1.1;p.y+=sin(a)*.08+sin(b)*.045;norm=normalize(vec3(-cos(a)*.0416-cos(b)*.009,1.,-cos(a)*.0192+cos(b)*.0315));wp=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
 fragmentShader:`uniform vec3 eye;uniform float time;varying vec3 wp;varying vec3 norm;
 void main(){vec3 n=normalize(norm+vec3(sin(wp.x*6.+wp.z*3.+time)*.055,0,cos(wp.z*7.-time)*.055));vec3 v=normalize(eye-wp);float fres=pow(1.-max(dot(v,n),0.),4.);vec3 color=mix(vec3(.02,.42,.52),vec3(.40,.77,.86),fres);vec3 l=normalize(vec3(-.45,.72,.52));float spec=pow(max(dot(reflect(-l,n),v),0.),130.);color+=vec3(1.,.96,.82)*spec*.65;float crest=sin(wp.x*.52+wp.z*.24-time*.8);color+=vec3(.04,.11,.10)*smoothstep(.82,1.,crest);float dist=length(eye-wp);color=mix(color,vec3(.65,.85,.91),1.-exp(-dist*.004));gl_FragColor=vec4(color,1.);}`});
 const g=new THREE.PlaneGeometry(600,600,170,170);g.rotateX(-Math.PI/2);const mesh=new THREE.Mesh(g,m);mesh.position.y=-.14;return mesh;
}
