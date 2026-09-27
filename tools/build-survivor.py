import bpy, math, os
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(n,c):
 m=bpy.data.materials.new(n);m.diffuse_color=(*c,1);m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*c,1);m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.83;return m
skin=mat('sun weathered skin',(.55,.32,.19));shirt=mat('linen shirt',(.28,.24,.13));leather=mat('leather seams',(.15,.075,.035));pants=mat('canvas trousers',(.085,.18,.24));hair=mat('dark hair',(.095,.043,.019));eye=mat('eyes',(.012,.015,.011));metal=mat('aged brass',(.46,.33,.13));scarf=mat('ochre scarf',(.49,.22,.075))
def group(n,p):
 o=bpy.data.objects.new(n,None);bpy.context.collection.objects.link(o);o.location=p;return o
def ell(n,p,s,m,parent=None):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=p);o=bpy.context.object;o.name=n;o.scale=s;o.data.materials.append(m)
 for f in o.data.polygons:f.use_smooth=True
 if parent:o.parent=parent
 return o
def box(n,p,s,m,parent=None):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=n;o.scale=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m);b=o.modifiers.new('rounded stitched edges','BEVEL');b.width=min(s)*.22;b.segments=3;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=b.name)
 if parent:o.parent=parent
 return o
# Continuous tailored surfaces replace stacked capsules. Z-up, -Y forward.
def tailored(n,rings,m,parent=None,sides=24):
 vs=[];faces=[]
 for z,rx,ry,cy in rings:
  for i in range(sides):
   a=i*math.tau/sides;vs.append((math.cos(a)*rx,cy+math.sin(a)*ry,z))
 for k in range(len(rings)-1):
  for i in range(sides):
   a=k*sides+i;b=k*sides+(i+1)%sides;faces.append((a,b,b+sides,a+sides))
 faces.extend([tuple(reversed(range(sides))),tuple((len(rings)-1)*sides+i for i in range(sides))])
 if rings[-1][0]<rings[0][0]:faces=[tuple(reversed(f)) for f in faces]
 me=bpy.data.meshes.new(n);me.from_pydata(vs,[],faces);me.update();o=bpy.data.objects.new(n,me);bpy.context.collection.objects.link(o);o.data.materials.append(m)
 for f in me.polygons:f.use_smooth=True
 if parent:o.parent=parent
 return o
white=mat('ivory cotton',(.42,.36,.24))
tailored('fitted teal overshirt',[(.94,.182,.119,0),(1.02,.183,.122,0),(1.20,.215,.137,0),(1.32,.222,.131,0),(1.37,.262,.124,0),(1.415,.218,.105,0),(1.47,.11,.077,0)],shirt)
ell('neck',(0,.012,1.51),(.059,.058,.075),skin)
tailored('sculpted face',[(1.575,.052,.060,-.024),(1.60,.077,.081,-.018),(1.64,.098,.090,-.010),(1.70,.112,.099,0),(1.75,.114,.103,.003),(1.81,.104,.091,.009),(1.85,.071,.064,.012)],skin)
ell('nose',(0,-.099,1.711),(.018,.024,.028),skin)
for side in [-1,1]:
 ell('ear',(side*.115,0,1.726),(.024,.021,.044),skin)
 ell('eye white',(side*.045,-.093,1.747),(.018,.006,.011),white)
 ell('iris',(side*.044,-.103,1.747),(.008,.004,.009),eye)
 brow=ell('eyebrow',(side*.046,-.097,1.774),(.026,.007,.004),hair);brow.rotation_euler.y=side*.12
ell('lower lip',(0,-.096,1.654),(.026,.005,.004),leather)
# A single swept hair cap, with side locks instead of a ring of spheres.
tailored('swept hair cap',[(1.78,.114,.10,.012),(1.85,.119,.102,.009),(1.90,.075,.065,.018),(1.92,.015,.015,.023)],hair)
for side in [-1,1]:ell('temple hair',(side*.103,.015,1.773),(.020,.060,.043),hair)
box('shirt placket',(0,-.146,1.23),(.024,.013,.39),shirt)
for z in [1.08,1.18,1.28,1.38]:ell('shirt button',(0,-.157,z),(.009,.005,.009),metal)
for side in [-1,1]:
 box('shirt pocket',(side*.125,-.138,1.30),(.095,.014,.10),shirt)
 box('pocket welt',(side*.125,-.149,1.35),(.095,.01,.013),white)
tailored('belt',[(.942,.192,.126,0),(.977,.192,.126,0)],leather);box('brass buckle',(0,-.147,.962),(.057,.020,.039),metal)
for side in [-1,1]:
 leg=group('leg_L' if side<0 else 'leg_R',(side*.105,0,.91))
 tailored('cargo shorts',[(.05,.112,.122,0),(0,.112,.122,0),(-.10,.107,.12,0),(-.28,.092,.106,0),(-.38,.086,.093,0)],pants,leg)
 box('cargo pocket',(side*.093,0,-.24),(.024,.13,.13),pants,leg)
 knee=group('knee_L' if side<0 else 'knee_R',(0,0,-.43));knee.parent=leg
 tailored('shin',[(.08,.067,.074,0),(.02,.068,.073,0),(-.12,.073,.076,.015),(-.25,.051,.054,.01),(-.34,.043,.05,0)],skin,knee)
 ell('deck shoes',(0,-.044,-.383),(.075,.136,.065),leather,knee)
 ell('rubber sole',(0,-.044,-.431),(.073,.131,.012),white,knee)
 for z in [-.03,.02]:box('shoe laces',(0,z-.07,-.321),(.080,.012,.009),white,knee)
 arm=group('arm_L' if side<0 else 'arm_R',(side*.239,0,1.365))
 tailored('shirt sleeve',[(.04,.048,.045,0),(.005,.070,.066,0),(-.035,.070,.070,0),(-.12,.070,.072,0),(-.19,.066,.067,0)],shirt,arm)
 tailored('sleeve rolled cuff',[(-.176,.068,.070,0),(-.193,.068,.070,0)],shirt,arm)
 tailored('forearm',[(-.19,.061,.066,0),(-.24,.061,.066,-.007),(-.29,.054,.059,-.014),(-.35,.044,.049,-.025),(-.40,.039,.037,-.025),(-.44,.038,.031,-.025)],skin,arm)
 ell('hand',(0,-.025,-.455),(.047,.032,.067),skin,arm)
 ell('thumb',(-side*.04,-.04,-.44),(.019,.022,.038),skin,arm)
 for i in range(3):ell('fingers',((i-1)*.020,-.029,-.507),(.010,.015,.028),skin,arm)
# Compact canvas daypack leaves the silhouette visible.
box('canvas daypack',(0,.17,1.22),(.29,.155,.34),pants)
box('pack flap',(0,.18,1.38),(.31,.18,.06),leather)
for side in [-1,1]:box('shoulder strap',(side*.16,-.133,1.27),(.033,.023,.32),leather)
ell('scarf collar',(0,-.015,1.50),(.101,.087,.042),scarf)
o=box('scarf tail',(.062,-.128,1.41),(.065,.014,.14),scarf);o.rotation_euler.y=-.18
# Cloth seams and folded collar have actual thickness.
for side in [-1,1]:
 o=box('folded collar',(side*.074,-.09,1.457),(.095,.035,.11),white);o.rotation_euler.y=side*-.35
 for z in [1.03,1.055]:
  o=ell('waist cloth fold',(side*.115,-.124,z),(.070,.009,.011),shirt);o.rotation_euler.y=side*.12
 # Cheeks are part of the face surface, never separate beads.
 ell('upper eyelid',(side*.045,-.097,1.757),(.024,.012,.005),skin)
 o=ell('swept forelock',(side*.035,-.064,1.844),(.065,.043,.035),hair);o.rotation_euler.y=-.25
# Smooth anatomical ring profiles rather than leaving hard horizontal bands.
for obj in list(bpy.context.scene.objects):
 if obj.type!='MESH':continue
 if obj.name.startswith(('sculpted face',)):
  bpy.context.view_layer.objects.active=obj
  sub=obj.modifiers.new('anatomical surface refinement','SUBSURF');sub.levels=2
  bpy.ops.object.modifier_apply(modifier=sub.name)
 # Lower the whole head onto the neck, preserving the facial feature registration.
 if obj.parent is None and obj.name.startswith(('sculpted face','nose','ear','eye white','iris','eyebrow','lower lip','swept hair','temple hair','upper eyelid','swept forelock')):
  obj.location.z-=.055
# Reference-led casual survivor: no rigid pack, scarf rings or toy accessories.
remove_prefixes=('canvas daypack','pack flap','shoulder strap','scarf collar','scarf tail','folded collar','shirt pocket','pocket welt','shirt placket','shirt button','waist cloth fold','cargo pocket')
for obj in list(bpy.context.scene.objects):
 if obj.name.startswith(remove_prefixes):bpy.data.objects.remove(obj,do_unlink=True)
# One continuous shirt with a smoothly weighted shoulder, not socket-like sleeves.
bpy.context.view_layer.update()
cloth=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith(('fitted teal','shirt sleeve','sleeve rolled'))]
for obj in cloth:
 world=obj.matrix_world.copy();obj.parent=None;obj.matrix_world=world
bpy.ops.object.select_all(action='DESELECT')
for obj in cloth:obj.select_set(True)
bpy.context.view_layer.objects.active=cloth[0];bpy.ops.object.join();obj=bpy.context.object
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
mod=obj.modifiers.new('seamless shoulder fabric','REMESH');mod.mode='VOXEL';mod.voxel_size=.005
bpy.ops.object.modifier_apply(modifier=mod.name)
mod=obj.modifiers.new('relaxed fabric','SMOOTH');mod.factor=1;mod.iterations=8
bpy.ops.object.modifier_apply(modifier=mod.name)
mod=obj.modifiers.new('cloth budget','DECIMATE');mod.ratio=.5;bpy.ops.object.modifier_apply(modifier=mod.name)
obj.name='continuous_tshirt'
for face in obj.data.polygons:face.use_smooth=True
# Keep the shirt one coherent fabric instead of contrasting toy-like panels.
# Narrow neckline follows the shirt opening.
tailored('jersey neckline',[(1.455,.119,.080,0),(1.469,.11,.077,0)],shirt)

# Weld overlapping skin pieces into continuous surfaces before skinning.
# Group by limb so fingers, palm and wrist share topology, not intersecting shells.
bpy.context.view_layer.update()
skin_sets={}
for obj in list(bpy.context.scene.objects):
 if obj.type=='MESH' and len(obj.data.materials) and obj.data.materials[0]==skin:
  key=obj.parent.name if obj.parent else 'head_neck'
  skin_sets.setdefault(key,[]).append(obj)
for key,parts in skin_sets.items():
 parent=parts[0].parent
 for obj in parts:
  world=obj.matrix_world.copy();obj.parent=None;obj.matrix_world=world
 bpy.ops.object.select_all(action='DESELECT')
 for obj in parts:obj.select_set(True)
 bpy.context.view_layer.objects.active=parts[0]
 bpy.ops.object.join();obj=bpy.context.object
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 rem=obj.modifiers.new('continuous anatomical skin','REMESH');rem.mode='VOXEL';rem.voxel_size=.004;rem.use_smooth_shade=True
 bpy.ops.object.modifier_apply(modifier=rem.name)
 smooth=obj.modifiers.new('soft tissue transitions','SMOOTH');smooth.factor=1.0;smooth.iterations=5
 bpy.ops.object.modifier_apply(modifier=smooth.name)
 dec=obj.modifiers.new('runtime topology budget','DECIMATE');dec.ratio=.45
 bpy.ops.object.modifier_apply(modifier=dec.name)
 for face in obj.data.polygons:face.use_smooth=True
 obj.name='continuous_skin_'+key
 if parent:
  world=obj.matrix_world.copy();obj.parent=parent;obj.matrix_world=world

# Balanced stylized head and restrained functional clothing details.
bpy.context.view_layer.update()
for o in list(bpy.context.scene.objects):
 if o.type!='MESH' or o.parent:continue
 world=o.matrix_world.copy();inv=world.inverted()
 for v in o.data.vertices:
  pos=world@v.co
  if pos.z>1.53:
   weight=min(1,(pos.z-1.53)/.10)
   pos.x*=1+.13*weight;pos.y*=1+.08*weight
   v.co=inv@pos
# Fine placket, shaped pocket flap and cloth cuffs, all close to the body.
box('field shirt placket',(0,-.140,1.20),(.014,.006,.32),shirt)
for z in [1.07,1.18,1.29,1.37]:ell('dark horn button',(0,-.147,z),(.005,.003,.005),metal)
box('field pocket',(-.113,-.142,1.295),(.082,.009,.086),shirt)
flap=box('field pocket flap',(-.113,-.151,1.335),(.086,.009,.021),shirt)
# Small hip pouch follows pelvis instead of a rigid box on the back.
box('utility pouch',(.182,.075,.928),(.115,.080,.155),leather)
box('utility flap',(.182,.028,.982),(.12,.017,.044),leather)
ell('pouch clasp',(.182,.016,.971),(.012,.006,.010),metal)
# An asymmetric swept lock gives a silhouette without the old bead-like fringe.
lock=ell('swept lock',(.035,-.073,1.813),(.073,.043,.041),hair)
lock.rotation_euler.y=-.3
# Fuse the hair silhouette; no visible stacked hair beads.
bpy.context.view_layer.update()
parts=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith(('swept hair','temple hair','swept forelock','swept lock'))]
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();o=bpy.context.object
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
m=o.modifiers.new('continuous swept hairstyle','REMESH');m.mode='VOXEL';m.voxel_size=.003
bpy.ops.object.modifier_apply(modifier=m.name)
m=o.modifiers.new('soft hair transitions','SMOOTH');m.factor=1;m.iterations=12
bpy.ops.object.modifier_apply(modifier=m.name)
m=o.modifiers.new('hair topology budget','DECIMATE');m.ratio=.35
bpy.ops.object.modifier_apply(modifier=m.name)
for f in o.data.polygons:f.use_smooth=True
# Thin triangular open collar follows the neckline, not a ring around the neck.
for side in [-1,1]:
 verts=[(side*.018,-.072,1.466),(side*.10,-.081,1.434),(side*.085,-.128,1.355),(side*.035,-.113,1.408)]
 me=bpy.data.meshes.new('collar');me.from_pydata(verts,[],[(0,1,2,3)]);me.update()
 o=bpy.data.objects.new('field collar',me);bpy.context.collection.objects.link(o);o.data.materials.append(shirt)
 m=o.modifiers.new('cloth thickness','SOLIDIFY');m.thickness=.004;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=m.name)
# A real deforming skeleton. Bind the continuous arm surface across the elbow.
bpy.context.view_layer.update()
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
empties=[o for o in bpy.context.scene.objects if o.type=='EMPTY']
anchors={o.name:o.matrix_world.translation.copy() for o in empties}
armdata=bpy.data.armatures.new('SurvivorSkeleton');rig=bpy.data.objects.new('SurvivorRig',armdata);bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
def bone(name,head,tail,parent=None):
 b=armdata.edit_bones.new(name);b.head=head;b.tail=tail
 if parent:b.parent=armdata.edit_bones[parent]
bone('hips',(0,0,.9),(0,0,1.10));bone('spine',(0,0,1.10),(0,0,1.48),'hips');bone('head',(0,0,1.48),(0,0,1.85),'spine')
for side in ['L','R']:
 leg=anchors['leg_'+side];knee=anchors['knee_'+side];arm=anchors['arm_'+side];elbow=arm+Vector((0,-.008,-.24))
 bone('leg_'+side,leg,knee,'hips');bone('knee_'+side,knee,knee+Vector((0,0,-.4)),'leg_'+side)
 bone('arm_'+side,arm,elbow,'spine');bone('elbow_'+side,elbow,arm+Vector((0,-.03,-.48)),'arm_'+side)
bpy.ops.object.mode_set(mode='OBJECT')
for o in meshes:
 parent=o.parent.name if o.parent else None;world=o.matrix_world.copy();o.parent=None;o.matrix_world=world
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 groups={b.name:o.vertex_groups.new(name=b.name) for b in armdata.bones}
 for v in o.data.vertices:
  z=v.co.z
  if o.name.startswith('continuous_tshirt'):
   side='L' if v.co.x<0 else 'R';w=max(0,min(1,(abs(v.co.x)-.175)/.10))
   groups['spine'].add([v.index],1-w,'REPLACE');groups['arm_'+side].add([v.index],w,'REPLACE')
  elif parent and parent.startswith('knee_') and o.name.startswith('shin'):
   side=parent[-1];w=max(0,min(1,(.56-z)/.14));groups['leg_'+side].add([v.index],1-w,'REPLACE');groups[parent].add([v.index],w,'REPLACE')
  elif parent and parent.startswith('arm_'):
   side=parent[-1];w=max(0,min(1,(1.175-z)/.14));groups[parent].add([v.index],1-w,'REPLACE');groups['elbow_'+side].add([v.index],w,'REPLACE')
  else:
   if o.name.startswith('continuous_skin_head_neck'):
    w=max(0,min(1,(z-1.45)/.11));groups['head'].add([v.index],w,'REPLACE');groups['spine'].add([v.index],1-w,'REPLACE')
   else:
    name=parent if parent in groups else ('head' if z>1.53 else 'spine' if z>1.01 else 'hips');groups[name].add([v.index],1,'REPLACE')
 o.parent=rig;mod=o.modifiers.new('weighted skeleton','ARMATURE');mod.object=rig
for o in empties:bpy.data.objects.remove(o,do_unlink=True)
# Consolidate meshes to one skinned object with material slots.
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join();bpy.context.object.name='SurvivorBody'
# Anchor the lowest sole to the world ground, eliminating rest-pose hovering.
bpy.context.view_layer.update()
lowest=min((bpy.context.object.matrix_world@v.co).z for v in bpy.context.object.data.vertices)
rig.location.z-=lowest
rig.animation_data_create()
for name,duration in [('Idle',60),('Walk',30),('Run',22)]:
 action=bpy.data.actions.new(name);rig.animation_data.action=action
 for f in sorted(set(range(0,duration+1,3)) | {duration}):
  phase=f/duration*math.tau
  for b in rig.pose.bones:b.rotation_mode='XYZ';b.rotation_euler=(0,0,0)
  for i,side in enumerate(['L','R']):
   wave=math.sin(phase+i*math.pi)
   if name in ('Walk','Run'):
    rig.pose.bones['leg_'+side].rotation_euler.x=wave*(.55 if name=='Run' else .32)
    rig.pose.bones['knee_'+side].rotation_euler.x=max(0,-wave)*(.9 if name=='Run' else .52)
    rig.pose.bones['arm_'+side].rotation_euler.x=-wave*(.42 if name=='Run' else .24)
   rig.pose.bones['elbow_'+side].rotation_euler.x=-.12-(max(0,wave)*.18 if name=='Walk' else 0)
  rig.pose.bones['spine'].rotation_euler.y=math.sin(phase)*(.025 if name=='Walk' else .009)
  for b in rig.pose.bones:b.keyframe_insert(data_path='rotation_euler',frame=f)
 track=rig.animation_data.nla_tracks.new();track.name=name;strip=track.strips.new(name,0,action);track.mute=True
rig.animation_data.action=None
for b in rig.pose.bones:b.rotation_euler=(0,0,0)
bpy.context.scene.frame_set(0)
out=os.path.join(ROOT,'public/assets/cinematic/survivor.glb')
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',export_yup=True,export_animation_mode='ACTIONS')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'art-source/survivor.blend'))
print('SURVIVOR_EXPORTED',out)
