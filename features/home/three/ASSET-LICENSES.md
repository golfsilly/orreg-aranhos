# Home scene asset provenance

The room, equipment, uniform tailoring, surgical clogs, rigging and animations are custom procedural assets.

`medical-anatomy.json` is a cropped, subdivided, triangulated and resized derivative of the
MakeHuman HM08 basemesh, released under CC0 1.0 Universal in September 2020.
The visible upper-body geometry from the `body` group is retained, together with joint
coordinates used to construct the animated skeleton. The neck, shoulders, arms,
wrists and fingers retain their continuous source topology. Covered skin faces
are hidden underneath the uniforms at runtime. `medical-uniform.json` derives
from the same asset's `helper-tights` clothing topology, with a continuous
hip-and-leg garment. `medical-scan.json` retains the complete anatomical body
for the simulated imaging screens. These are demonstration models, not scans
of a patient. No MakeHuman program code is distributed.

- Source asset: https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/3dobjs/base.obj
- Asset license: https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.ASSETS.md
- Project license explanation: https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md
- Original asset copyright holders: Data Collection AB, Joel Palmius, Jonas Hauquier (2020).
- Source SHA256: `8e761e6624b8f54536409135d1636da63b32486a90d4897f84e121d144f6fb4c`.
- Conversion: `node scripts/build-medical-anatomy.mjs <path-to-base.obj>`.

The skin maps in `public/models/medical/` derive from the CC0 MakeHuman system
assets `middleage_asian_male` and `middleage_asian_female` by makehuman_system.
They are resized to 2048 px and encoded as WebP for browser delivery. Original
UV coordinates and smooth normals are retained in the anatomical mesh.

- Catalog and licenses: https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html
- Archive: https://files2.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip
- Male source: `skins/middleage_asian_male/middleage_lightskinned_male_diffuse2.png`.
- Female source: `skins/middleage_asian_female/middleage_lightskinned_female_diffuse2.png`.
