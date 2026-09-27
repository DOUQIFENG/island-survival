from pathlib import Path
p=Path('tools/build-survivor.py')
s=p.read_text(encoding='utf-8-sig')
s=s.replace("b.width=.025", "b.width=min(s)*.22")
s=s.replace("faces.extend([tuple(reversed(range(sides))),tuple((len(rings)-1)*sides+i for i in range(sides))])", "faces.extend([tuple(reversed(range(sides))),tuple((len(rings)-1)*sides+i for i in range(sides))])\n if rings[-1][0]<rings[0][0]:faces=[tuple(reversed(f)) for f in faces]")
s=s.replace("(1.38,.267,.13,0),(1.46,.205,.11,0),(1.49,.09,.075,0)","(1.36,.245,.14,0),(1.40,.263,.13,0),(1.445,.22,.11,0),(1.47,.11,.077,0)")
s=s.replace("(1.59,.060,.068,-.015),(1.62,.092,.085,-.014),(1.71,.115,.099,0),(1.80,.109,.092,.005),(1.85,.074,.065,.012)","(1.575,.052,.060,-.024),(1.60,.077,.081,-.018),(1.64,.098,.090,-.010),(1.70,.112,.099,0),(1.75,.114,.103,.003),(1.81,.104,.091,.009),(1.85,.071,.064,.012)")
s=s.replace("(side*.253,0,1.395)","(side*.254,0,1.405)")
s=s.replace("(-.19,.059,.064,0),(-.29,.057,.061,-.009),(-.40,.037,.043,-.022)","(-.19,.061,.066,0),(-.24,.061,.066,-.007),(-.29,.054,.059,-.014),(-.35,.044,.049,-.025),(-.40,.037,.042,-.032)")
a=s.index('# Merge static parts')
s=s[:a]+'''# Cloth seams and folded collar have actual thickness.
for side in [-1,1]:
 o=box('folded collar',(side*.074,-.09,1.457),(.095,.035,.11),white);o.rotation_euler.y=side*-.35
 for z in [1.03,1.055]:
  o=ell('waist cloth fold',(side*.115,-.124,z),(.070,.009,.011),shirt);o.rotation_euler.y=side*.12
 ell('cheekbone',(side*.072,-.069,1.704),(.036,.026,.033),skin)
 ell('upper eyelid',(side*.045,-.097,1.757),(.024,.012,.005),skin)
 o=ell('swept forelock',(side*.035,-.064,1.844),(.065,.043,.035),hair);o.rotation_euler.y=-.25
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
  if parent and parent.startswith('arm_'):
   side=parent[-1];w=max(0,min(1,(1.205-z)/.10));groups[parent].add([v.index],1-w,'REPLACE');groups['elbow_'+side].add([v.index],w,'REPLACE')
  else:
   name=parent if parent in groups else ('head' if z>1.53 else 'spine' if z>1.01 else 'hips');groups[name].add([v.index],1,'REPLACE')
 o.parent=rig;mod=o.modifiers.new('weighted skeleton','ARMATURE');mod.object=rig
for o in empties:bpy.data.objects.remove(o,do_unlink=True)
# Consolidate meshes to one skinned object with material slots.
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join();bpy.context.object.name='SurvivorBody'
rig.animation_data_create()
for name,duration in [('Idle',60),('Walk',30)]:
 action=bpy.data.actions.new(name);rig.animation_data.action=action
 for f in range(0,duration+1,3):
  phase=f/duration*math.tau
  for b in rig.pose.bones:b.rotation_mode='XYZ';b.rotation_euler=(0,0,0)
  for i,side in enumerate(['L','R']):
   wave=math.sin(phase+i*math.pi)
   if name=='Walk':
    rig.pose.bones['leg_'+side].rotation_euler.x=wave*.40
    rig.pose.bones['knee_'+side].rotation_euler.x=max(0,-wave)*.60
    rig.pose.bones['arm_'+side].rotation_euler.x=-wave*.30
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
'''
p.write_text(s,encoding='utf-8')
