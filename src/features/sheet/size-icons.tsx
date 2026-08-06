import type { ComponentType } from 'react';
import type { IconProps } from 'phosphor-react-native';
import { AirplaneTakeoffIcon } from 'phosphor-react-native/src/icons/AirplaneTakeoff';
import { CheckCircleIcon } from 'phosphor-react-native/src/icons/CheckCircle';
import { CreditCardIcon } from 'phosphor-react-native/src/icons/CreditCard';
import { FileIcon } from 'phosphor-react-native/src/icons/File';
import { FlagIcon } from 'phosphor-react-native/src/icons/Flag';
import { GlobeHemisphereEastIcon } from 'phosphor-react-native/src/icons/GlobeHemisphereEast';
import { GlobeHemisphereWestIcon } from 'phosphor-react-native/src/icons/GlobeHemisphereWest';
import { IdentificationBadgeIcon } from 'phosphor-react-native/src/icons/IdentificationBadge';
import { IdentificationCardIcon } from 'phosphor-react-native/src/icons/IdentificationCard';
import { ImageSquareIcon } from 'phosphor-react-native/src/icons/ImageSquare';
import { LeafIcon } from 'phosphor-react-native/src/icons/Leaf';
import { MapPinIcon } from 'phosphor-react-native/src/icons/MapPin';
import { MountainsIcon } from 'phosphor-react-native/src/icons/Mountains';
import { PrinterIcon } from 'phosphor-react-native/src/icons/Printer';
import { RulerIcon } from 'phosphor-react-native/src/icons/Ruler';
import { UserFocusIcon } from 'phosphor-react-native/src/icons/UserFocus';
import type { RegionId } from '@/features/sheet/size-catalog';

export type PhIcon = ComponentType<IconProps>;

export const SIZE_PAGE_ICON = RulerIcon;
export const REGION_SECTION_ICON = GlobeHemisphereWestIcon;
export const PHOTO_SECTION_ICON = UserFocusIcon;
export const PAPER_SECTION_ICON = PrinterIcon;
export const SELECTED_CHECK_ICON = CheckCircleIcon;

export const REGION_ICONS: Record<RegionId, PhIcon> = {
  nepal: MountainsIcon,
  us: FlagIcon,
  eu: GlobeHemisphereWestIcon,
  argentina: MapPinIcon,
  canada: LeafIcon,
  other: GlobeHemisphereEastIcon,
};

/** Pick an icon from photo preset id / label. */
export function iconForPhotoPreset(id: string, label: string): PhIcon {
  const hay = `${id} ${label}`.toLowerCase();
  if (/visa|schengen|nrn/.test(hay)) return AirplaneTakeoffIcon;
  if (/wallet|credit/.test(hay)) return CreditCardIcon;
  if (/nid|badge|citizenship|id-/.test(hay)) return IdentificationBadgeIcon;
  if (/passport|2x2|1x1|identification/.test(hay)) return IdentificationCardIcon;
  return UserFocusIcon;
}

export function iconForPaper(paperId: string): PhIcon {
  if (paperId === 'a4' || paperId === 'letter' || paperId === 'a5') {
    return FileIcon;
  }
  if (paperId === '4x6' || paperId === '3.5x5' || paperId === '5x7') {
    return ImageSquareIcon;
  }
  return PrinterIcon;
}
