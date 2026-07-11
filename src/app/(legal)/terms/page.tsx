import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms governing your use of Roomi, the roommate and housing platform for Kazakhstan.",
  alternates: { canonical: "/terms" }
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="July 2026"
      intro="These Terms govern your access to and use of Roomi (the “Platform”). By creating an account or using the Platform, you agree to these Terms. If you do not agree, please do not use Roomi."
      sections={[
        {
          heading: "1. Who can use Roomi",
          paragraphs: [
            "You must be at least 18 years old and able to enter into a binding agreement to use Roomi. You agree to provide accurate information about yourself and to keep it up to date."
          ]
        },
        {
          heading: "2. What Roomi is (and is not)",
          paragraphs: [
            "Roomi is a platform that helps users discover rooms, listings, and potential roommates. We are not a landlord, letting agent, or party to any rental agreement between users. We do not own, manage, inspect, or guarantee any listing, and we are not responsible for the conduct of any user.",
            "Any agreement to rent a room or live together is made directly between the users involved."
          ]
        },
        {
          heading: "3. Your account",
          list: [
            "You are responsible for keeping your login credentials secure and for all activity under your account.",
            "You may sign in with email and password or with a supported provider such as Google.",
            "You may not impersonate another person, create accounts using false information, or transfer your account to someone else."
          ]
        },
        {
          heading: "4. Listings and content",
          paragraphs: [
            "You are responsible for the accuracy and legality of any listing, profile, message, or image you post. You confirm that you have the right to rent or advertise any property you list."
          ],
          list: [
            "No false, misleading, or fraudulent listings.",
            "No discrimination that is unlawful under the laws of the Republic of Kazakhstan.",
            "No harassment, hate speech, spam, or illegal activity.",
            "No content that infringes another person's rights."
          ]
        },
        {
          heading: "5. Moderation",
          paragraphs: [
            "We may review, hide, or remove content and may suspend or ban accounts that violate these Terms or that we reasonably believe to be harmful, fraudulent, or abusive. You can report listings and profiles for review."
          ]
        },
        {
          heading: "6. Fees",
          paragraphs: [
            "Browsing listings, discovering roommates, and messaging are currently available at no charge. If we introduce paid features in the future, we will make the pricing clear before you are charged."
          ]
        },
        {
          heading: "7. Disclaimer and liability",
          paragraphs: [
            "The Platform is provided “as is” without warranties of any kind. To the maximum extent permitted by law, Roomi is not liable for any loss arising from your interactions with other users, any rental agreement, or any content on the Platform. You use Roomi at your own risk and are responsible for your own safety — see our Safety & Security guidance."
          ]
        },
        {
          heading: "8. Changes and governing law",
          paragraphs: [
            "We may update these Terms from time to time; continued use of the Platform means you accept the updated Terms. These Terms are governed by the laws of the Republic of Kazakhstan.",
            "Questions about these Terms can be sent to our support contact listed in the app."
          ]
        }
      ]}
    />
  );
}
