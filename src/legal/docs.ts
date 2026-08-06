/** Shared legal / about document body. */
export type LegalDoc = {
  title: string;
  updated: string;
  sections: { heading: string; body: string }[];
};

export const ABOUT: LegalDoc = {
  title: 'About',
  updated: '2026-08-06',
  sections: [
    {
      heading: 'Passport Photo Print',
      body: 'Make exact-size passport and ID photos on a pharmacy print sheet. Crop, pack, and export offline on this device.',
    },
    {
      heading: 'Who we are',
      body: 'Built by CODSE. Contact: support@codse.com',
    },
    {
      heading: 'Pro',
      body: 'A one-time Lifetime purchase removes ads. Restores with your Apple ID via RevenueCat.',
    },
  ],
};

export const PRIVACY: LegalDoc = {
  title: 'Privacy Policy',
  updated: '2026-08-06',
  sections: [
    {
      heading: 'Summary',
      body: 'Photos stay on your device unless you save or share them. We do not run a photo cloud for this app.',
    },
    {
      heading: 'Photos & files',
      body: 'Camera and library access are used only to create and export sheets. Bookmarked sheets are stored in the app sandbox on this device. Clearing the app removes them.',
    },
    {
      heading: 'Purchases & ads',
      body: 'In-app purchases go through Apple. We use RevenueCat to check your Lifetime entitlement. Ads (if shown) are served by Google AdMob and may use device advertising identifiers under their policies.',
    },
    {
      heading: 'Analytics',
      body: 'We do not sell your personal data. Store and ad partners may collect limited technical data required to run purchases and ads.',
    },
    {
      heading: 'Contact',
      body: 'Privacy questions: privacy@codse.com',
    },
  ],
};

export const TERMS: LegalDoc = {
  title: 'Terms of Use',
  updated: '2026-08-06',
  sections: [
    {
      heading: 'License',
      body: 'You get a personal, non-exclusive license to use Passport Photo Print. Do not reverse engineer, resell, or misuse the app.',
    },
    {
      heading: 'Photos you create',
      body: 'You are responsible for the photos you take, import, and print. Check size and acceptance rules for the document or country you need before submitting.',
    },
    {
      heading: 'Purchases',
      body: 'Lifetime is a one-time non-consumable purchase billed by Apple. Refunds follow Apple’s policies.',
    },
    {
      heading: 'Disclaimer',
      body: 'The app helps you compose printable sheets. It does not guarantee acceptance by any government, embassy, or photo lab.',
    },
    {
      heading: 'Contact',
      body: 'support@codse.com',
    },
  ],
};

export const DISCLAIMER: LegalDoc = {
  title: 'Disclaimer',
  updated: '2026-08-06',
  sections: [
    {
      heading: 'Not an official issuer',
      body: 'Passport Photo Print is not affiliated with any government passport or ID authority.',
    },
    {
      heading: 'Acceptance',
      body: 'Requirements change by country and document type. Always confirm current rules (size, background, expression, head size) before you print or submit.',
    },
    {
      heading: 'Print quality',
      body: 'Final print quality depends on your lab, paper, and printer settings. Export at the size shown in the app, then follow your lab’s instructions.',
    },
    {
      heading: 'Liability',
      body: 'To the fullest extent allowed by law, CODSE is not liable for rejected applications, reprint costs, or damages arising from use of the app.',
    },
  ],
};
