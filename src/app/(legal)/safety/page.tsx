import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Safety & Security",
  description:
    "How to stay safe finding roommates and rentals in Kazakhstan — verifying people, viewing rooms, handling deposits, and avoiding scams.",
  alternates: { canonical: "/safety" }
};

export default function SafetyPage() {
  return (
    <LegalPage
      title="Safety & Security"
      updated="July 2026"
      intro="Roomi helps students and young professionals across Kazakhstan find rooms and roommates. Most people on the platform are genuine, but renting and living with someone new always carries risk. Use the guidance below to protect yourself before, during, and after a match."
      sections={[
        {
          heading: "Before you meet",
          paragraphs: [
            "Keep the first conversations inside Roomi chat. You do not need to share your phone number, home address, or workplace to arrange a viewing."
          ],
          list: [
            "Ask for the person's university or employer and confirm details during a short video call before meeting.",
            "Be cautious if someone refuses a call, rushes you, or pushes the conversation to WhatsApp or Telegram immediately.",
            "Search the listing photos — recycled or stock-looking images are a common sign of a fake advert."
          ]
        },
        {
          heading: "Viewing a room",
          list: [
            "Always view the room in person before paying anything. Never rent based on photos alone.",
            "Bring a friend or tell someone where you are going, who you are meeting, and when you expect to be back.",
            "Meet during daylight and check that keys, locks, water, heating, and electricity actually work.",
            "Confirm who else lives in the apartment and who the contract will be with."
          ]
        },
        {
          heading: "Money and deposits",
          paragraphs: [
            "Financial pressure is the clearest warning sign of a scam. A legitimate landlord or roommate will never need a deposit before you have seen the room."
          ],
          list: [
            "Do not transfer a deposit, prepayment, or \"reservation fee\" (бронь) before viewing the room and meeting the person.",
            "Prefer traceable payments over cash, and always get a receipt or written confirmation of any money paid.",
            "Be extremely wary of anyone claiming to be abroad who asks you to pay before viewing.",
            "For a rental, agree the rent, deposit amount, utilities (коммунальные услуги), and move-in date in writing."
          ]
        },
        {
          heading: "Signing an agreement",
          paragraphs: [
            "A written rental agreement (договор аренды) protects both sides. Confirm the landlord actually has the right to rent the property, and keep a copy of the signed agreement and the passport/ID details of the other party."
          ]
        },
        {
          heading: "Living together safely",
          list: [
            "Agree house rules early — guests, quiet hours, cleaning, and how shared bills are split.",
            "Keep your valuables and documents secure, especially in the first weeks.",
            "Trust your instincts. If a living situation feels unsafe, prioritise leaving over losing a deposit."
          ]
        },
        {
          heading: "Reporting a problem",
          paragraphs: [
            "If a listing or profile looks fake, abusive, or fraudulent, use the Report button on the listing or profile so our team can review and remove it. If you are in immediate danger, contact the police at 102.",
            "Roomi is a platform that connects people; we do not own the listings and cannot guarantee any rental. Staying cautious is the best protection."
          ]
        }
      ]}
    />
  );
}
