import { inToMm } from './units';

export type SizePreset = {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
  group: string;
};

export type PaperPreset = {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
};

/** Passport / ID photo sizes (width × height). */
export const PHOTO_PRESETS: SizePreset[] = [
  {
    id: 'passport-eu',
    label: '35×45 mm (EU / UK / AU / IN)',
    widthMm: 35,
    heightMm: 45,
    group: 'Passport',
  },
  {
    id: 'passport-us',
    label: '2×2 in (US)',
    widthMm: inToMm(2),
    heightMm: inToMm(2),
    group: 'Passport',
  },
  {
    id: 'passport-canada',
    label: '50×70 mm (Canada)',
    widthMm: 50,
    heightMm: 70,
    group: 'Passport',
  },

  /* Argentina — official is 4×4 cm; 1.5×1.5 in used at some consulates */
  {
    id: 'ar-passport-4x4',
    label: 'Argentina Passport / DNI 4×4 cm',
    widthMm: 40,
    heightMm: 40,
    group: 'Argentina',
  },
  {
    id: 'ar-1.5x1.5',
    label: 'Argentina 1.5×1.5 in',
    widthMm: inToMm(1.5),
    heightMm: inToMm(1.5),
    group: 'Argentina',
  },

  /* Nepal */
  {
    id: 'np-passport',
    label: 'Nepal Passport 35×45 mm',
    widthMm: 35,
    heightMm: 45,
    group: 'Nepal',
  },
  {
    id: 'np-nid',
    label: 'Nepal NID / ID Card 25×30 mm',
    widthMm: 25,
    heightMm: 30,
    group: 'Nepal',
  },
  {
    id: 'np-citizenship',
    label: 'Nepal Citizenship 35×45 mm',
    widthMm: 35,
    heightMm: 45,
    group: 'Nepal',
  },
  {
    id: 'np-nrn',
    label: 'Nepal NRN ID 25×30 mm',
    widthMm: 25,
    heightMm: 30,
    group: 'Nepal',
  },
  {
    id: 'np-visa-35x45',
    label: 'Nepal Visa 35×45 mm',
    widthMm: 35,
    heightMm: 45,
    group: 'Nepal',
  },
  {
    id: 'np-visa-2x2',
    label: 'Nepal Visa 2×2 in',
    widthMm: inToMm(2),
    heightMm: inToMm(2),
    group: 'Nepal',
  },
  {
    id: 'np-online-visa-1.5',
    label: 'Nepal Online Visa 1.5×1.5 in',
    widthMm: inToMm(1.5),
    heightMm: inToMm(1.5),
    group: 'Nepal',
  },

  {
    id: 'cm-4.5x3.5',
    label: '3.5×4.5 cm',
    widthMm: 35,
    heightMm: 45,
    group: 'Common',
  },
  {
    id: 'cm-4x3',
    label: '3×4 cm',
    widthMm: 30,
    heightMm: 40,
    group: 'Common',
  },
  {
    id: 'cm-4x4',
    label: '4×4 cm',
    widthMm: 40,
    heightMm: 40,
    group: 'Common',
  },
  {
    id: 'cm-5x5',
    label: '5×5 cm',
    widthMm: 50,
    heightMm: 50,
    group: 'Common',
  },
  {
    id: 'in-1.5x1.5',
    label: '1.5×1.5 in',
    widthMm: inToMm(1.5),
    heightMm: inToMm(1.5),
    group: 'Common',
  },
  {
    id: 'schengen-visa',
    label: 'Schengen Visa 35×45',
    widthMm: 35,
    heightMm: 45,
    group: 'Visa',
  },
  {
    id: 'china-visa',
    label: 'China Visa 33×48',
    widthMm: 33,
    heightMm: 48,
    group: 'Visa',
  },
  {
    id: 'japan-visa',
    label: 'Japan Visa 45×45',
    widthMm: 45,
    heightMm: 45,
    group: 'Visa',
  },
  {
    id: 'india-visa',
    label: 'India Visa 51×51',
    widthMm: 51,
    heightMm: 51,
    group: 'Visa',
  },
  {
    id: 'id-2x2',
    label: '2×2 in',
    widthMm: inToMm(2),
    heightMm: inToMm(2),
    group: 'ID',
  },
  {
    id: 'id-1x1',
    label: '1×1 in',
    widthMm: inToMm(1),
    heightMm: inToMm(1),
    group: 'ID',
  },
  {
    id: 'wallet',
    label: 'Wallet 2.5×3.5 in',
    widthMm: inToMm(2.5),
    heightMm: inToMm(3.5),
    group: 'Print',
  },
];

/** Printable paper / photo paper sizes. */
export const PAPER_PRESETS: PaperPreset[] = [
  {
    id: '3.5x5',
    label: '3.5×5 in (9×13 cm)',
    widthMm: inToMm(3.5),
    heightMm: inToMm(5),
  },
  { id: '4x6', label: '4×6 in (10×15 cm)', widthMm: inToMm(4), heightMm: inToMm(6) },
  { id: '5x7', label: '5×7 in (13×18 cm)', widthMm: inToMm(5), heightMm: inToMm(7) },
  { id: '6x8', label: '6×8 in', widthMm: inToMm(6), heightMm: inToMm(8) },
  { id: 'a4', label: 'A4', widthMm: 210, heightMm: 297 },
  { id: 'letter', label: 'Letter', widthMm: inToMm(8.5), heightMm: inToMm(11) },
  { id: 'a5', label: 'A5', widthMm: 148, heightMm: 210 },
  {
    id: 'single',
    label: 'Single photo',
    widthMm: 35,
    heightMm: 45,
  },
];

export const DEFAULT_PHOTO_ID = 'np-passport';
export const DEFAULT_PAPER_ID = '4x6';
