import { HELP } from '@/legal/docs';
import { LegalDocument } from '@/legal/legal-document';

export default function HelpScreen() {
  return <LegalDocument doc={HELP} />;
}
