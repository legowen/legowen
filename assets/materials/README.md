# Original Blender material maps

These six original texture maps were baked in Blender 4.5.0 using the included
`bake-materials.py`, without add-ons, downloaded assets, AI images, or video.
Blender is free and is only needed to regenerate the textures. It is not a
website dependency. The portable Blender application stays outside this repo.

- `wood-*`: 512 × 512, elongated wood grain for the floor and desk.
- `plaster-*`: 256 × 256, quiet fine-grain plaster for the walls.
- `woven-*`: 256 × 256, woven fabric for the rug and soft furnishings.
- `*-color.png`: pale neutral color variations; use sRGB and multiply by the
  room's existing material color.
- `*-roughness.png`: linear roughness values; do not set sRGB color space.

All maps tile in both directions. The shader uses periodic 4D noise and integer
weave frequencies. All six PNGs together total approximately 518 KiB.

In Three.js, use `RepeatWrapping` for both axes. Suggested repeats: floor planks
and desk `(1, 1)`, large wall `(3, 2)`, rug `(1.5, 1)`. Keep anisotropy modest
(up to 4) and register each loaded texture with the room's disposal manager.
Clone textures before assigning different repeat values to shared materials.
Use a small bump scale (wood `.012`, plaster `.018`, rug `.025`) if reusing the
roughness texture as a bump map. Existing material colors remain art-directed.

Reproduce:

```text
blender --background --factory-startup --threads 4 --python bake-materials.py
```

Official Blender download used:
https://download.blender.org/release/Blender4.5/blender-4.5.0-windows-x64.zip

This is material texture authoring, not a fully modeled Blender scene or a
lighting bake of the room. Geometry and lighting remain procedural Three.js.
