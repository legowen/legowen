"""Original seamless room textures, baked by Blender 4.5 (CPU, no add-ons).

Run: blender --background --factory-startup --python bake-materials.py
Only small PNG textures are served by the portfolio; Blender is an authoring tool.
"""
from pathlib import Path
import math
import bpy

OUT = Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.mesh.primitive_plane_add(size=2)
plane = bpy.context.object
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 1
scene.render.bake.margin = 0
scene.view_settings.view_transform = 'Standard'


def texture(kind, u_scale, v_scale, noise_scale, low, high, rough_low, rough_high, size=256):
    material = bpy.data.materials.new(kind)
    material.use_nodes = True
    plane.data.materials.clear()
    plane.data.materials.append(material)
    nodes, links = material.node_tree.nodes, material.node_tree.links
    nodes.clear()
    uv = nodes.new('ShaderNodeTexCoord')
    separate = nodes.new('ShaderNodeSeparateXYZ')
    links.new(uv.outputs['UV'], separate.inputs[0])

    def math_node(operation, a, b=None):
        node = nodes.new('ShaderNodeMath')
        node.operation = operation
        if isinstance(a, (int, float)):
            node.inputs[0].default_value = a
        else:
            links.new(a, node.inputs[0])
        if b is not None:
            if isinstance(b, (int, float)):
                node.inputs[1].default_value = b
            else:
                links.new(b, node.inputs[1])
        return node.outputs[0]

    # A 4D torus makes the noise continuous across all four image borders.
    u = math_node('MULTIPLY', separate.outputs['X'], 2 * math.pi)
    v = math_node('MULTIPLY', separate.outputs['Y'], 2 * math.pi)
    combine = nodes.new('ShaderNodeCombineXYZ')
    links.new(math_node('MULTIPLY', math_node('COSINE', u), u_scale), combine.inputs['X'])
    links.new(math_node('MULTIPLY', math_node('SINE', u), u_scale), combine.inputs['Y'])
    links.new(math_node('MULTIPLY', math_node('COSINE', v), v_scale), combine.inputs['Z'])
    noise = nodes.new('ShaderNodeTexNoise')
    noise.noise_dimensions = '4D'
    links.new(combine.outputs[0], noise.inputs['Vector'])
    links.new(math_node('MULTIPLY', math_node('SINE', v), v_scale), noise.inputs['W'])
    noise.inputs['Scale'].default_value = noise_scale
    noise.inputs['Detail'].default_value = 2
    noise.inputs['Roughness'].default_value = .65
    factor = noise.outputs['Fac']
    if kind == 'woven':
        # Integer yarn frequencies retain seamless wrapping.
        warp = math_node('ABSOLUTE', math_node('SINE', math_node('MULTIPLY', u, 32)))
        weft = math_node('ABSOLUTE', math_node('SINE', math_node('MULTIPLY', v, 32)))
        weave = math_node('MULTIPLY', warp, weft)
        factor = math_node('ADD', math_node('MULTIPLY', weave, .7), math_node('MULTIPLY', factor, .3))
    ramp = nodes.new('ShaderNodeValToRGB')
    links.new(factor, ramp.inputs[0])
    emission = nodes.new('ShaderNodeEmission')
    links.new(ramp.outputs['Color'], emission.inputs['Color'])
    output = nodes.new('ShaderNodeOutputMaterial')
    links.new(emission.outputs[0], output.inputs['Surface'])
    image_node = nodes.new('ShaderNodeTexImage')
    nodes.active = image_node
    for suffix, lo, hi, color_space in [('color', low, high, 'sRGB'), ('roughness', rough_low, rough_high, 'Non-Color')]:
        ramp.color_ramp.elements[0].color = (*lo, 1)
        ramp.color_ramp.elements[1].color = (*hi, 1)
        image = bpy.data.images.new(f'{kind}-{suffix}', width=size, height=size, alpha=False)
        image.colorspace_settings.name = color_space
        image_node.image = image
        bpy.ops.object.bake(type='EMIT')
        image.filepath_raw = str(OUT / f'{kind}-{suffix}.png')
        image.file_format = 'PNG'
        image.save()
        bpy.data.images.remove(image)
    bpy.data.materials.remove(material)


# Pale neutral color maps multiply the existing art-directed Three.js colors.
texture('wood', 10, .35, 4, (.46, .43, .38), (.91, .88, .81), (.52,)*3, (.85,)*3, size=512)
texture('plaster', 1, 1, 24, (.69,)*3, (.95,)*3, (.76,)*3, (.98,)*3)
texture('woven', 1, 1, 8, (.48,)*3, (.94,)*3, (.76,)*3, (.98,)*3)
print('Baked six seamless 256–512px room material maps.')
