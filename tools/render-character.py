import bpy, os
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'public/assets/cinematic/survivor.glb'))
for o in bpy.context.scene.objects:
 if o.animation_data:o.animation_data.action=None
 if o.type=='ARMATURE':
  for b in o.pose.bones:b.rotation_mode='XYZ';b.rotation_euler=(0,0,0)
bpy.ops.mesh.primitive_plane_add(size=200)
floor=bpy.context.object;floor.location.z=-.025
mat=bpy.data.materials.new('studio slate');mat.diffuse_color=(.07,.10,.095,1);floor.data.materials.append(mat)
for loc,power,size in [((-3,-4,5),420,5),((4,-1,3),220,4),((0,3,4),500,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(2.6,-6,2.6));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,1))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.45
scene=bpy.context.scene;scene.camera=cam;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.world.color=(.2,.2,.2);scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(ROOT,'output/qa/character-refined.png');bpy.ops.render.render(write_still=True)
