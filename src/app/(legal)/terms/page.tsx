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
          heading: "5. Prohibited activities",
          paragraphs: ["When using Roomi you must not:"],
          list: [
            "Post fraudulent listings, request deposits or “reservation” fees before a viewing, or attempt any rental scam.",
            "Harass, threaten, defame, or discriminate against other users on grounds prohibited by the laws of the Republic of Kazakhstan.",
            "Collect, scrape, or reuse other users' personal data or contact details without their consent.",
            "Upload malware, attempt to breach security, bypass rate limits, or access accounts or data that are not yours.",
            "Use the Platform for money laundering, subletting fraud, or any activity that is illegal under Kazakhstani law."
          ]
        },
        {
          heading: "6. Moderation, suspension, and termination",
          paragraphs: [
            "We may review, hide, or remove content, and may suspend or terminate accounts that violate these Terms or that we reasonably believe to be harmful, fraudulent, or abusive. Where practical and lawful we will give notice, but we may act immediately in cases of fraud, safety risk, or legal requirement.",
            "You may close your account at any time. Certain records may be retained where required by law or to resolve disputes, as described in our Privacy Policy."
          ]
        },
        {
          heading: "7. Reporting abuse",
          paragraphs: [
            "If a listing or profile is fake, abusive, or fraudulent, use the Report button on that listing or profile, or contact us through the Support page. Reports are routed to our moderation team for review. If you are in immediate danger, contact the police at 102."
          ]
        },
        {
          heading: "8. Intellectual property",
          paragraphs: [
            "The Roomi name, logo, interface, and software are owned by Roomi and protected under the intellectual-property laws of the Republic of Kazakhstan. You may not copy, modify, or redistribute them without permission.",
            "You keep ownership of the content you post (listings, photos, messages). By posting, you grant Roomi a non-exclusive, royalty-free licence to host and display that content for the purpose of operating the Platform."
          ]
        },
        {
          heading: "9. Fees",
          paragraphs: [
            "Browsing listings, discovering roommates, and messaging are currently available at no charge. If we introduce paid features in the future, we will make the pricing clear before you are charged."
          ]
        },
        {
          heading: "10. Disclaimer and limitation of liability",
          paragraphs: [
            "The Platform is provided “as is” and “as available” without warranties of any kind. To the maximum extent permitted by law, Roomi is not liable for any indirect or consequential loss, or for any loss arising from your interactions with other users, any rental agreement, or any content on the Platform. You use Roomi at your own risk and are responsible for your own safety — see our Safety & Security guidance."
          ]
        },
        {
          heading: "11. Dispute resolution and governing law",
          paragraphs: [
            "These Terms are governed by the laws of the Republic of Kazakhstan. We encourage you to contact our Support team first so we can try to resolve any issue informally.",
            "If a dispute cannot be resolved informally, it shall be submitted to the competent courts of the Republic of Kazakhstan, unless mandatory consumer-protection rules provide otherwise."
          ]
        },
        {
          heading: "12. Changes to these Terms",
          paragraphs: [
            "We may update these Terms from time to time. If a change is material we will take reasonable steps to notify you; continued use of the Platform after an update means you accept the revised Terms. Questions can be sent through the Support page."
          ]
        }
      ]}
    />
  );
}
