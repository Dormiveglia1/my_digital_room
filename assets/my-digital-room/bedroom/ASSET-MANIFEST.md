# Bedroom asset manifest

## Locked base

- `base/bedroom-master.png` — approved bedroom composition. Do not overwrite.

## Overlay assets to produce

- `overlays/ship-map-plaque.png` — persistent Bedroom navigation control. Completed; transparent PNG.
- `overlays/crew-manifest.png` — profile state replacing the photo wall. Implement as a dynamic web panel so personal details remain editable.
- `overlays/computer-desktop.png` — screen-only desktop state. Implement as dynamic web UI so project folders remain editable.
- `overlays/photo-wall.png` — default photo wall and optional expanded thumbnails. Implement as dynamic image layout so photos remain editable.

## Sprite assets to produce

- `sprites/leo-idle.png` — small, light-brown toy poodle sleeping state. Completed; transparent PNG.
- `sprites/leo-alert.png` — small, light-brown toy poodle alert state. Completed; transparent PNG.
- `sprites/turntable.png` — record player interaction overlay. Completed; transparent PNG.
- `sprites/gamepad-stand.png` — controller stand interaction overlay. Completed; transparent PNG.
- `sprites/gold-cube.png` — hidden collection-vault trigger. Completed; transparent PNG.

Each overlay or sprite must have transparent surroundings and be positioned in the site by its anchor coordinates, rather than baking it into the master image.
