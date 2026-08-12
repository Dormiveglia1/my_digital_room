# Collection Vault asset manifest

## Production base

- `base/collection-vault-empty.png` — the approved room base. Its eight lit shelf cubbies are deliberately empty; the gold 3×3 cube remains the room centerpiece.

## Dynamic content (build later)

Overlay user-uploaded collection entries onto fixed shelf slots rather than baking them into the illustration:

- `left-1` through `left-4`
- `right-1` through `right-4`

Each entry supports an image, title, description, date, and optional link. Empty slots stay visually empty.

## Reference only

- `base/collection-vault-master.png` is an earlier concept with example objects. Do not use it as a production background.

## Shared UI

Reuse `../bedroom/overlays/ship-map-plaque.png` as the persistent navigation affordance; its route/state is implemented in HTML, not embedded into content records.
