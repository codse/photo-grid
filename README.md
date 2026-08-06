# SheetFit

Passport / ID photo grid printer. Multi-person sheets, mixed sizes, per-cell drag crop. Everything stays local.

Inspired by tools like [idphoto4you](https://www.idphoto4you.com/) / [passportgrid](https://www.passportgrid.com/) — offline, no upload.

## Run

```bash
cd photo-grid
npm install
npm run dev
```

## Features

- Multiple people on one sheet (each with own photo + size)
- Mixed sizes packed automatically (shelf packer — e.g. 35×45 + 2×2)
- Per-cell drag to pan, scroll to zoom (independent crops)
- Brightness / contrast per person
- Paper presets: 3.5×5, 4×6, 5×7, A4, Letter, single photo, …
- Fill sheet or exact copy counts
- PNG / PDF @ 300 DPI + Print
- PWA offline (`npm run build`)

## How to use multi-person

1. **+ Add person** for each face
2. Drop a photo on each card, set size (or custom mm)
3. Optional: set **Min copies**; **Fill sheet** packs the rest round-robin
4. Click a cell on the preview → drag to pan that cell only
5. **Apply crop to all of X** if you want matching crops for one person

## Later

- Country picker like idphoto4you (73 standards)
- Background remove / white backdrop
- Expo mobile shell
