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
      body: 'A one-time Lifetime purchase removes ads and lifts free caps (5 exports/day, 2 people per sheet). Restores with your Apple ID via RevenueCat.',
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
      body: 'The app helps you compose printable sheets. It does not guarantee acceptance by any government, embassy, visa center, or photo lab. You are responsible for checking current rules. We are not liable for rejected applications or related costs.',
    },
    {
      heading: 'Contact',
      body: 'support@codse.com',
    },
  ],
};

export const DISCLAIMER: LegalDoc = {
  title: 'Disclaimer',
  updated: '2026-08-07',
  sections: [
    {
      heading: 'Not an official issuer',
      body: 'Passport Photo Print is not affiliated with, endorsed by, or acting on behalf of any government, embassy, passport office, visa center, or ID authority.',
    },
    {
      heading: 'No guarantee of acceptance',
      body: 'We do not guarantee that any photo, sheet, or export created with this app will be accepted for a passport, visa, ID, license, or any other purpose. Requirements change by country and document type. You are solely responsible for confirming current official rules (size, background, expression, head size, quality, and anything else they require) before you print or submit.',
    },
    {
      heading: 'Rejection and costs',
      body: 'CODSE and Passport Photo Print are not responsible if your photos or application are rejected, delayed, or returned — including reprint fees, lab fees, travel costs, missed appointments, or any other loss. Use of the app is at your own risk.',
    },
    {
      heading: 'Print quality',
      body: 'Final print quality depends on your lab, paper, printer, and how the file is printed (for example “fit to page” can warp sizes). Export at the size shown in the app, then follow your lab’s instructions.',
    },
    {
      heading: 'Liability',
      body: 'To the fullest extent allowed by law, CODSE is not liable for rejected applications, reprint costs, consequential damages, or any other damages arising from use of the app.',
    },
  ],
};

export const HELP: LegalDoc = {
  title: 'Help',
  updated: '2026-08-07',
  sections: [
    {
      heading: 'Make a sheet',
      body: '1. Take a photo or pick one from your library.\n2. Crop to the passport frame.\n3. Check print size and paper on the sheet screen.\n4. Share or save the export for your photo lab.',
    },
    {
      heading: 'Print size',
      body: 'Open Print size on Home (or Size & paper) to pick a country template and paper like 4×6 in. Your choice stays until you change it.',
    },
    {
      heading: 'Export DPI & format',
      body: 'In Settings → Export, set DPI (300 is standard for labs; 600 is sharper/larger files) and default JPG or PNG. You can still switch format on the Share screen.',
    },
    {
      heading: 'Cut guides',
      body: 'Cut guides draw light crop marks on the sheet. Turn the default on or off in Settings. You can also toggle them per sheet.',
    },
    {
      heading: 'Saved sheets',
      body: 'On Share, tap the bookmark to keep a sheet in Saved. Everything stays on this device.',
    },
    {
      heading: 'Pro',
      body: 'Lifetime Pro removes ads, lifts the free daily export cap (5/day), and lets you put more than 2 people on one sheet. Tap GET PRO on Home to buy or restore. Purchases use your Apple ID.',
    },
    {
      heading: 'Need more help?',
      body: 'Email support@codse.com. Include your app version from Settings.',
    },
  ],
};

export const FAQ: LegalDoc = {
  title: 'FAQ',
  updated: '2026-08-07',
  sections: [
    {
      heading: 'Will my embassy accept these photos?',
      body: 'We size to common templates, but rules change. Always check the latest official requirements for your document before you submit. We do not guarantee acceptance by any authority or lab.',
    },
    {
      heading: 'What if my photos get rejected?',
      body: 'That risk is yours. We are not responsible for rejected passports, visas, IDs, or reprints — whether due to size, background, lighting, expression, print quality, or rule changes. Confirm official specs yourself before you submit.',
    },
    {
      heading: 'What DPI should I use?',
      body: '300 DPI is what most photo labs expect. Use 600 only if you need extra sharpness and your lab accepts larger files.',
    },
    {
      heading: 'JPG or PNG?',
      body: 'JPG is smaller and fine for most labs. PNG is lossless if you want maximum quality or transparent workflows.',
    },
    {
      heading: 'Does the app work offline?',
      body: 'Yes for cropping, packing, and export. Camera, library, purchases, and ads need network when those features run.',
    },
    {
      heading: 'Where are my photos stored?',
      body: 'On your device. Bookmarked sheets live in Saved in the app sandbox. We do not upload your photos to a CODSE cloud.',
    },
    {
      heading: 'How do I restore Pro?',
      body: 'Open GET PRO → Restore purchase (same Apple ID that bought Lifetime).',
    },
    {
      heading: 'The sheet looks wrong at the lab',
      body: 'Confirm paper size (e.g. 4×6), export DPI, and that the lab prints without “fit to page” scaling. Cut guides help you trim after printing.',
    },
  ],
};

