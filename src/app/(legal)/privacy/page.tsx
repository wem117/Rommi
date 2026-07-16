import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Roomi collects, uses, and protects your personal data as a roommate and housing platform in Kazakhstan.",
  alternates: { canonical: "/privacy" }
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="July 2026"
      intro="This Privacy Policy explains what personal data Roomi collects, why we collect it, and the choices you have. Roomi acts as the operator of your personal data and processes it in accordance with the Law of the Republic of Kazakhstan No. 94-V “On Personal Data and its Protection”. We aim to collect only what we need to run the Platform and to help you find a room or roommate safely."
      sections={[
        {
          heading: "1. Data we collect",
          list: [
            "Account data: your email address and authentication details (including data from Google sign-in if you use it).",
            "Profile data you choose to provide: name, age, gender, university, budget, lifestyle preferences, bio, and photos.",
            "Listing data: room details, location, price, and images you publish.",
            "Usage data: messages you send, listings you view or favourite, and reports you submit.",
            "Technical data: basic device and log information needed to operate and secure the service."
          ]
        },
        {
          heading: "2. How we use your data",
          list: [
            "To create your account and show your profile or listings to other users.",
            "To match you with compatible roommates and relevant rooms.",
            "To enable messaging between users.",
            "To moderate content, investigate reports, and keep the community safe.",
            "To maintain, secure, and improve the Platform."
          ]
        },
        {
          heading: "3. What other users can see",
          paragraphs: [
            "Your profile and any listings you publish are visible to other users to make matching possible. Do not put information in your public profile that you are not comfortable sharing. Your email and password are never shown to other users."
          ]
        },
        {
          heading: "4. Storage and processing",
          paragraphs: [
            "Your data is stored using Supabase (authentication, database, and file storage). We apply access controls so that private data — such as your messages and account details — is not publicly accessible. No online service can be guaranteed to be perfectly secure, so please use a strong, unique password."
          ]
        },
        {
          heading: "5. Legal basis and consent",
          paragraphs: [
            "We process your personal data on the basis of your consent (given when you create an account and publish a profile or listing), to perform our service to you, to comply with legal obligations, and for our legitimate interest in keeping the Platform safe. You may withdraw consent at any time by editing your profile or deleting your account, which may limit features that rely on that data."
          ]
        },
        {
          heading: "6. Cookies and local storage",
          paragraphs: [
            "Roomi uses strictly necessary cookies and browser local storage to keep you signed in, remember your language choice, and keep your last search filters. If analytics are enabled, aggregated, non-identifying usage statistics may be collected to improve the service. You can clear this data through your browser at any time."
          ]
        },
        {
          heading: "7. Sharing",
          paragraphs: [
            "We do not sell your personal data. We share data only with service providers that help us run the Platform (such as our authentication, database, and file-storage provider, Supabase) under appropriate confidentiality obligations, and where required by the law of the Republic of Kazakhstan or a lawful request from a competent authority."
          ]
        },
        {
          heading: "8. Data retention",
          paragraphs: [
            "We keep your personal data while your account is active. After you delete your account we remove or anonymise your personal data within a reasonable period, except where retention is required to comply with the law of the Republic of Kazakhstan, resolve disputes, or prevent fraud and abuse."
          ]
        },
        {
          heading: "9. Your rights",
          paragraphs: ["Under the personal-data legislation of the Republic of Kazakhstan you have the right to:"],
          list: [
            "Access and correct your personal data — you can view and edit it at any time from your account.",
            "Request deletion of your account and associated personal data.",
            "Withdraw consent to processing and control what you publish, including removing listings.",
            "Object to or restrict certain processing, and request information about how your data is handled.",
            "Change your interface language at any time; the choice is stored on your device."
          ]
        },
        {
          heading: "10. Children",
          paragraphs: [
            "Roomi is intended for users aged 18 and over. We do not knowingly collect personal data from anyone under 18; if we learn that we have, we will delete it."
          ]
        },
        {
          heading: "11. Changes and contact",
          paragraphs: [
            "We may update this Policy as the Platform evolves; material changes will be reflected by the “Last updated” date above. For any privacy question, to exercise your rights, or to request data deletion, contact us through the Support page."
          ]
        }
      ]}
    />
  );
}
