import { TERMS } from '@/legal/docs';
import { LegalDocument } from '@/legal/legal-document';

export default function TermsScreen() {
  return <LegalDocument doc={TERMS} />;
}
