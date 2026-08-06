import { ABOUT } from '@/legal/docs';
import { LegalDocument } from '@/legal/legal-document';

export default function AboutScreen() {
  return <LegalDocument doc={ABOUT} />;
}
