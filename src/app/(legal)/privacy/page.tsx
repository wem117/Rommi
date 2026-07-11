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
      intro="This Privacy Policy explains what personal data Roomi collects, why we collect it, and the choices you have. We aim to collect only what we need to run the Platform and to help you find a room or roommate safely."
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
          heading: "5. Sharing",
          paragraphs: [
            "We do not sell your personal data. We share data only with service providers that help us run the Platform (such as our hosting and database provider) and where required by the law of the Republic of Kazakhstan."
          ]
        },
        {
          heading: "6. Your choices and rights",
          list: [
            "You can view and edit your profile information at any time from your account.",
            "You can request deletion of your account and associated personal data.",
            "You can control your listings and remove them when they are no longer available.",
            "You can change your interface language at any time; the choice is stored on your device."
          ]
        },
        {
          heading: "7. Changes and contact",
          paragraphs: [
            "We may update this Policy as the Platform evolves; material changes will be reflected by the “Last updated” date above. For any privacy question or a data deletion request, contact us at the support address listed in the app."
          ]
        }
      ]}
    />
  );
}
