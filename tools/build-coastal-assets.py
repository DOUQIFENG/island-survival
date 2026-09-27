import bpy, math, random, os
from mathutils import Vector
random.seed(17)
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'public','assets','cinematic')
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def material(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.88
 return m
bark=material('weathered coconut bark',(.22,.14,.075));leaf=material('deep olive fronds',(.23,.39,.085));stone=material('weathered basalt',(.35,.39,.36));cloth=material('aged canvas',(.68,.54,.31));wood=material('driftwood',(.26,.19,.11))
def mesh(name,vs,fs,mat):
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);ob.data.materials.append(mat);return ob
def tube(name,points,radii,mat,sides=9):
 vs=[];fs=[]
 for k,p in enumerate(points):
  for j in range(sides):
   a=j*math.tau/sides;vs.append((p[0]+math.cos(a)*radii[k],p[1]+math.sin(a)*radii[k],p[2]))
 for k in range(len(points)-1):
  for j in range(sides):a=k*sides+j;b=k*sides+(j+1)%sides;fs.append((a,b,b+sides,a+sides))
 ob=mesh(name,vs,fs,mat)
 for f in ob.data.polygons:f.use_smooth=True
 return ob
def export(name,objects):
 bpy.ops.object.select_all(action='DESELECT')
 for ob in objects:ob.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,name+'.glb'),export_format='GLB',use_selection=True,export_yup=True)
 for ob in objects:ob.hide_set(True)
# Curved trunk and individually modeled leaflets rather than balls/cones.
obs=[];points=[(.65*(i/20)**2,.16*math.sin(i/7),i*.23) for i in range(21)]
obs.append(tube('curved trunk',points,[.19-.09*i/20 for i in range(21)],bark,12))
for j in range(12):
 a=j*math.tau/12+.12;length=2.4+random.random()*.7;vs=[];fs=[]
 def center(t):return Vector((.65+math.cos(a)*length*t,.05+math.sin(a)*length*t,4.6+.65*math.sin(t*math.pi)-1.05*t*t))
 side=Vector((-math.sin(a),math.cos(a),0))
 for k in range(1,21):
  t=k/22;c=center(t);w=.36*math.sin(math.pi*t)**.7
  for sign in (-1,1):
   tip=c+side*w*sign+Vector((math.cos(a)*.23,math.sin(a)*.23,-.16))
   n=len(vs);vs.extend([tuple(center(t-.026)),tuple(tip),tuple(center(t+.045)),tuple(c+Vector((0,0,.035)))]);fs.extend([(n,n+1,n+3),(n+1,n+2,n+3)])
 ob=mesh('palm frond '+str(j),vs,fs,leaf);obs.append(ob)
export('palm',obs)
# Layered irregular rock, with deterministic sculpted surface.
obs=[]
for j in range(3):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3,radius=1,location=(j*.3,0,j*.16));ob=bpy.context.object;ob.name='coastal basalt'
 for v in ob.data.vertices:
  co=v.co;factor=1+.12*math.sin(co.x*11+co.y*7)+.06*math.cos(co.z*19);co*=factor;co.x*=1.2;co.y*=.8;co.z*=.7
 ob.data.materials.append(stone);obs.append(ob)
export('rock',obs)
# Ruin arch built from individual eroded voussoirs, not a torus.
obs=[]
def block(name,loc,scale,mat):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);ob=bpy.context.object;ob.name=name;ob.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);ob.data.materials.append(mat)
 bevel=ob.modifiers.new('worn stone edges','BEVEL');bevel.width=.045;bevel.segments=2;bpy.context.view_layer.objects.active=ob;bpy.ops.object.modifier_apply(modifier=bevel.name);return ob
for sign in (-1,1):
 for k in range(9):obs.append(block('masonry column',(sign*1.8+random.uniform(-.04,.04),0,k*.5+.25),(.65,.8,.47),stone))
for k in range(13):
 a=k*math.pi/12;ob=block('arch voussoir',(math.cos(a)*1.8,0,4.5+math.sin(a)*1.8),(.55,.82,.6),stone);ob.rotation_euler.y=a-math.pi/2;obs.append(ob)
export('ruin',obs)
# Cloth shelter and supporting stakes, modeled with sagging canvas.
obs=[];vs=[];fs=[]
for side in (-1,1):
 start=len(vs)
 for i in range(13):
  for j in range(9):
   t=i/12;u=j/8;vs.append((side*t*1.8,(u-.5)*3.5,2.5-2*t-.15*math.sin(t*math.pi)*math.sin(u*math.pi)))
 for i in range(12):
  for j in range(8):a=start+i*9+j;fs.append((a,a+1,a+10,a+9))
obs.append(mesh('sagging canvas',vs,fs,cloth))
for y in (-1.7,1.7):obs.append(tube('shelter pole',[(0,y,0),(0,y,2.6)],[.065,.04],wood))
export('shelter',obs)
# Save editable source, including every exported model.
for ob in bpy.data.objects:ob.hide_set(False)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'art-source','coastal-assets.blend'))
print('ASSET_EXPORT_COMPLETE',OUT)
