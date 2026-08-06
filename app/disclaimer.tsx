import { DISCLAIMER } from '@/legal/docs';
import { LegalDocument } from '@/legal/legal-document';

export default function DisclaimerScreen() {
  return <LegalDocument doc={DISCLAIMER} />;
}
