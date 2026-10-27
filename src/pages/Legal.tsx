import { Link, useLocation } from 'react-router-dom'
import { useEffect, type ReactNode } from 'react'
import { SUPPORT_EMAIL } from '../lib/format'

const UPDATED = '25 October 2026'

function Doc({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  const { hash } = useLocation()
  useEffect(() => { if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }) }, [hash])
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-2 text-xs text-muted">Last updated: {UPDATED}</p>
      <p className="mt-5 rounded-xl border border-line bg-card px-4 py-3 text-sm leading-relaxed text-white/90">{intro}</p>
      <div className="mt-8 space-y-7 text-sm leading-relaxed text-muted [&_a]:text-white [&_a]:underline [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_li]:pl-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_p+p]:mt-3 [&_strong]:text-white [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1.5">{children}</div>
      <p className="mt-12 border-t border-line pt-6 text-xs text-muted">
        Questions? Email <a className="text-white underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. See also our{' '}
        <Link className="text-white underline" to="/terms">Terms of Service</Link>, <Link className="text-white underline" to="/privacy">Privacy Policy</Link> and{' '}
        <Link className="text-white underline" to="/community-guidelines">Community Guidelines</Link>.
      </p>
    </article>
  )
}

const Mail = () => <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>

/* ───────────────────────────── TERMS OF SERVICE ───────────────────────────── */
export const Terms = () => (
  <Doc
    title="Terms of Service"
    intro="These Terms are the agreement between you and JaraPlug. By creating an account or using the platform you accept them. JaraPlug is for adults only (18+). Please read them, together with our Privacy Policy and Community Guidelines."
  >
    <section id="about"><h2>1. About JaraPlug</h2>
      <p>JaraPlug is an online platform where adults can discover provider profiles, message each other, request appointments and unlock exclusive photos and videos shared by providers. We provide the technology that connects users. We do not employ providers, we do not own the content they publish, and we are not a party to any arrangement made between users.</p></section>

    <section id="eligibility"><h2>2. Who can use JaraPlug</h2>
      <ul>
        <li>You must be <strong>at least 18 years old</strong> and legally allowed to use a service like this where you live.</li>
        <li>You confirm your age when you sign up. By ticking that box you declare that you are 18 or older and that this is true. Giving false information breaks these Terms and may lead to account removal.</li>
        <li>You must give accurate information and keep your sign-in details secure. You are responsible for everything done through your account.</li>
        <li>One person, one account. You may not sell, share or transfer your account.</li>
      </ul></section>

    <section id="accounts"><h2>3. Account types</h2>
      <p>When you finish sign-up you choose to be a <strong>client</strong> or a <strong>provider</strong>. This choice is fixed for the account. If you need both, use separate accounts with separate email addresses.</p>
      <ul>
        <li><strong>Clients</strong> can browse profiles, message, request appointments, buy credits and unlock content.</li>
        <li><strong>Providers</strong> can create a profile, publish content, receive requests and earn money from content sales. A provider profile is listed publicly only after our team has reviewed and approved it.</li>
      </ul></section>

    <section id="content"><h2>4. Content and consent</h2>
      <p>You are responsible for everything you upload, send or publish. By posting content you confirm that:</p>
      <ul>
        <li>you own it or have every right and licence needed to share it;</li>
        <li>everyone shown is an <strong>adult (18+) who has freely consented</strong> to the content being recorded and published on JaraPlug;</li>
        <li>it does not break the law or the <Link to="/community-guidelines">Community Guidelines</Link>.</li>
      </ul>
      <p>You keep ownership of your content. You give JaraPlug a non-exclusive, worldwide licence to store, process, display and deliver it, only as needed to run the platform and only to the audience you chose (public, members-only or paid). The licence ends when you delete the content, except for copies we must keep for legal reasons or for purchases that have already been made.</p>
      <p>Uploads are published straight away. We do not check every item before it appears, so we rely on reports and our own checks. We may remove or restrict any content, at any time, without notice, if we believe it breaks these Terms or the law.</p></section>

    <section id="credits"><h2>5. Credits and purchases</h2>
      <ul>
        <li><strong>How it works.</strong> Paid content is unlocked with in-app credits. At the time of writing, <strong>₦1,000 buys 10 credits</strong> (1 credit = ₦100). The current price is always shown before you pay.</li>
        <li><strong>Buying credits.</strong> Credits are bought through our payment partner, Paystack. They are added to your wallet only after the payment is confirmed. We never see or store your card details.</li>
        <li><strong>Unlocking content.</strong> Credits are deducted when you unlock an item, and access is granted to your account only. Access is personal and not transferable. You may not copy, record, download, share or resell what you unlock.</li>
        <li><strong>What credits are not.</strong> Credits are a prepaid right to use JaraPlug. They are not money, a bank deposit or electronic money. They cannot be withdrawn, exchanged for cash, transferred to another user or used outside JaraPlug, and they earn no interest.</li>
        <li><strong>Refunds.</strong> Purchased credits are non-refundable once added, except where the law requires it or where we agree otherwise. If we approve a refund for a specific unlock, the credits are returned to your wallet and access to that item ends. Report a problem from your Purchases page or by emailing <Mail />.</li>
        <li><strong>Free credits.</strong> We may occasionally add credits to an account as a gift or goodwill gesture. They have no cash value and may be removed if they were added in error or the account breaks these Terms.</li>
        <li><strong>Referral rewards.</strong> Clients may earn credits when a friend joins through their personal link. We may change, limit or pause the programme at any time. Rewards only apply to genuine new clients; fake or duplicate accounts, self-referrals or other abuse will lead to the credits being removed and may lead to account closure.</li>
        <li><strong>Prices and changes.</strong> We may change the credit price or the content prices at any time. Changes do not affect credits you already hold or content you have already unlocked.</li>
        <li><strong>Deleting your account.</strong> Any credits left in your wallet when your account is closed are forfeited.</li>
      </ul></section>

    <section id="providers"><h2>6. Provider earnings and withdrawals</h2>
      <ul>
        <li><strong>Commission.</strong> When a client unlocks a provider's content, JaraPlug keeps a platform commission (currently <strong>20%</strong>) and the rest is added to the provider's earnings. The exact split is shown on the Earnings page.</li>
        <li><strong>Withdrawing.</strong> Providers add a bank account in their name and request a withdrawal. We then send the money by bank transfer, normally <strong>within 24 hours</strong>. The minimum withdrawal is currently ₦1,000.</li>
        <li><strong>Your responsibility.</strong> Check your bank details carefully. We pay exactly the account you give us and cannot recover transfers sent to a wrong account because of an error in those details.</li>
        <li><strong>Holds and reversals.</strong> We may delay, withhold or reverse earnings or withdrawals where we reasonably suspect fraud, a chargeback, a refund, a breach of these Terms or an unlawful sale, or where the law or a payment partner requires it.</li>
        <li><strong>Independent providers.</strong> Providers are independent users, not employees, agents or partners of JaraPlug. Providers are responsible for their own taxes and for any licences or registrations their activity needs.</li>
      </ul></section>

    <section id="bookings"><h2>7. Appointment requests</h2>
      <p>A client can send a provider an appointment request. It is only an invitation to arrange a meeting. Requests carry no payment on JaraPlug. A request or an accepted request is <strong>never consent to any activity</strong>. Either person may decline, cancel or leave at any time and for any reason. JaraPlug does not organise, supervise or guarantee any meeting. Please read the safety advice in our <Link to="/community-guidelines#safety">Community Guidelines</Link>.</p></section>

    <section id="conduct"><h2>8. What you must not do</h2>
      <ul>
        <li>Break the law, or use JaraPlug to offer, request or arrange anything illegal.</li>
        <li>Post or share content involving anyone under 18, anything non-consensual, or intimate content of a person without their permission.</li>
        <li>Harass, threaten, blackmail, stalk or pressure anyone, or share someone's private details.</li>
        <li>Impersonate another person, or use a fake or misleading identity.</li>
        <li>Scam, spam or mislead users, including asking people to pay outside JaraPlug to avoid fees or to “verify” themselves.</li>
        <li>Record, copy, scrape, leak or resell content you unlocked, or help others to.</li>
        <li>Try to bypass payments, access controls, rate limits or security, or interfere with the platform.</li>
        <li>Create accounts to avoid a suspension or ban.</li>
      </ul>
      <p>The full rules are in the <Link to="/community-guidelines">Community Guidelines</Link>.</p></section>

    <section id="moderation"><h2>9. Reports, removal and suspension</h2>
      <p>Anyone can report a profile, message or item. Reports about non-consensual imagery, underage content, exploitation and impersonation are treated as priority and the content may be hidden immediately while we review it. We may remove content, restrict features, suspend or permanently close accounts, withhold earnings that relate to a breach, and report matters to the police or other authorities. We record the reason for our decisions. If you think we made a mistake, email <Mail /> and we will look again.</p></section>

    <section id="availability"><h2>10. Availability and changes</h2>
      <p>We work to keep JaraPlug available and accurate, but we provide it “as is” and “as available”. We may change, pause or stop any feature. We may update these Terms; when we make a material change we will notify you in the app or by email, and continued use after the change means you accept it.</p></section>

    <section id="liability"><h2>11. Our responsibility</h2>
      <ul>
        <li>JaraPlug is a platform. We do not control what users say or do, and we do not guarantee that any profile, content or person is accurate, safe or suitable. You deal with other users at your own risk and should use your judgment.</li>
        <li>To the fullest extent the law allows, JaraPlug is not liable for indirect or consequential loss, loss of profit, or for anything caused by other users, third-party services or events outside our reasonable control.</li>
        <li>Where we are found liable to you, our total liability is limited to the amount you paid to JaraPlug in the 12 months before the claim.</li>
        <li>Nothing in these Terms limits liability that cannot lawfully be limited, or your rights as a consumer under Nigerian law.</li>
      </ul>
      <p>You agree to cover JaraPlug for losses arising from content you post or from your breach of these Terms or the law.</p></section>

    <section id="law"><h2>12. Law and disputes</h2>
      <p>These Terms are governed by the laws of the Federal Republic of Nigeria. We encourage you to contact us first at <Mail /> so we can try to resolve any complaint informally. If that fails, the courts of Lagos State, Nigeria have jurisdiction, unless the law gives you the right to go elsewhere.</p></section>

    <section id="contact"><h2>13. Contact</h2>
      <p>Support and legal notices: <Mail />.</p></section>
  </Doc>
)

/* ───────────────────────────── PRIVACY POLICY ───────────────────────────── */
export const Privacy = () => (
  <Doc
    title="Privacy Policy"
    intro="This policy explains what personal information JaraPlug collects, why we use it, who we share it with and the choices you have. We do not sell your personal data. We handle it in line with the Nigeria Data Protection Act 2023 (NDPA)."
  >
    <section id="who"><h2>1. Who we are</h2>
      <p>JaraPlug is the “data controller” for the information described here. You can contact us about privacy at <Mail />.</p></section>

    <section id="collect"><h2>2. What we collect</h2>
      <ul>
        <li><strong>Account information</strong> — your email address and name from sign-in (email and password, or your Google account), your username, display name and city, and your confirmation that you are 18 or older.</li>
        <li><strong>Provider profile</strong> — your biography, age, area, photos and the settings you choose for what is shown publicly.</li>
        <li><strong>Content</strong> — photos, videos and other media you upload. Stored privately and shown only to the audience you choose.</li>
        <li><strong>Messages</strong> — text, images and voice notes you send, and when messages are delivered and read.</li>
        <li><strong>Activity</strong> — appointment requests, favourites, purchases and unlocks, reports you file, notifications and support requests.</li>
        <li><strong>Payments and credits</strong> — your credit balance and history, and payment references and amounts. Card and bank details used to buy credits are handled by Paystack; <strong>we never see or store your card number</strong>.</li>
        <li><strong>Provider payout details</strong> — for providers who withdraw: bank name, account number and account name, used only to pay out your earnings.</li>
        <li><strong>Technical information</strong> — device and browser type, IP address, log and security events (for example failed sign-in or rate-limit events), and the approximate time of activity such as when you were last online.</li>
        <li><strong>Visit counts</strong> — to see how many people use the site we count visits using a daily-changing, one-way scrambled code made from your IP address and browser. It cannot be reversed or used to follow you from one day to the next, and no cookies are used.</li>
      </ul>
      <p>We do not ask for, and do not store, copies of identity documents.</p></section>

    <section id="use"><h2>3. How we use it</h2>
      <ul>
        <li>To create and run your account and deliver the service you asked for.</li>
        <li>To process payments, credits, earnings and withdrawals, and to keep accurate financial records.</li>
        <li>To show profiles and content to the right audience, and to deliver messages and notifications.</li>
        <li>To keep the platform safe: preventing fraud and abuse, enforcing our Terms, investigating reports and responding to requests from authorities.</li>
        <li>To contact you about your account, security, payments and support requests.</li>
        <li>To improve the service and fix problems.</li>
      </ul>
      <p>Our legal bases are: performing our contract with you, our legitimate interests in running a safe and secure platform, compliance with legal obligations, and your consent where we ask for it (you can withdraw consent at any time).</p></section>

    <section id="visible"><h2>4. What other users can see</h2>
      <ul>
        <li>Your username, display name and profile photo are visible to other users.</li>
        <li>Providers choose whether to show their age and area. <strong>Providers' legal names, phone numbers and private email addresses are never shown publicly.</strong></li>
        <li>Providers do not see who bought their content; they see sales amounts and the item only.</li>
        <li>Your messages are visible only to you and the person you are talking to.</li>
      </ul></section>

    <section id="share"><h2>5. Who we share it with</h2>
      <p>We share information only as needed to run JaraPlug:</p>
      <ul>
        <li><strong>Service providers</strong> who process data for us under agreements: our sign-in provider (Clerk), our payment partner (Paystack), and cloud hosting and media storage. They may only use the data to provide their service to us.</li>
        <li><strong>Authorities and legal requests</strong> where required by law, or where needed to protect people from harm, for example in cases involving minors, exploitation or non-consensual imagery.</li>
        <li><strong>A buyer of the business</strong> if JaraPlug is ever sold or merged, who must honour this policy.</li>
      </ul>
      <p>We do not sell your personal data or share it with advertisers. Some providers, such as cloud services, may process data outside Nigeria; where that happens we require appropriate safeguards as the NDPA requires.</p></section>

    <section id="retention"><h2>6. How long we keep it</h2>
      <ul>
        <li>Account, profile, message and media data are kept while your account is open.</li>
        <li>When you delete your account we erase your profile, your uploaded files and your personal details and anonymise the account. Remaining credits are forfeited.</li>
        <li>We keep transaction, withdrawal and audit records, in anonymised form where possible, for as long as tax, accounting and anti-fraud laws require.</li>
        <li>We may keep information longer where needed for an ongoing investigation, a legal claim or a legal request.</li>
      </ul></section>

    <section id="rights"><h2>7. Your rights</h2>
      <p>Under the NDPA you can ask to access, correct, delete, restrict or move your data and to object to certain uses. Most of this is self-service:</p>
      <ul>
        <li><strong>Export</strong> a copy of your data from Settings.</li>
        <li><strong>Delete</strong> your account from Settings.</li>
        <li><strong>Edit</strong> your profile and visibility settings at any time.</li>
      </ul>
      <p>For anything else, email <Mail />. We aim to respond within 30 days. If you are not satisfied, you may complain to the Nigeria Data Protection Commission (NDPC).</p></section>

    <section id="security"><h2>8. Security</h2>
      <ul>
        <li>Media is stored privately and delivered through short-lived signed links. Access is checked on our servers each time.</li>
        <li>Connections are encrypted, and access to administrative tools is restricted and logged.</li>
        <li>Bank details are used only to pay your withdrawals, and changing them sends you a notification.</li>
      </ul>
      <p>No system is completely secure. Use a strong password, keep your email account safe, and tell us straight away at <Mail /> if you think your account has been accessed by someone else.</p></section>

    <section id="cookies"><h2>9. Cookies and local storage</h2>
      <p>We use only what the service needs: your sign-in session and small items in your browser such as preferences. We do not use advertising or cross-site tracking cookies.</p></section>

    <section id="children"><h2>10. Under-18s</h2>
      <p>JaraPlug is not for anyone under 18 and we do not knowingly collect their data. If you believe a child has an account, email <Mail /> and we will act quickly.</p></section>

    <section id="changes"><h2>11. Changes to this policy</h2>
      <p>We may update this policy. If a change is significant we will notify you in the app or by email. The date at the top shows when it was last updated.</p></section>
  </Doc>
)

/* ───────────────────────────── COMMUNITY GUIDELINES ───────────────────────────── */
export const Guidelines = () => (
  <Doc
    title="Community Guidelines"
    intro="JaraPlug works because people feel safe and respected. These rules apply to everyone: clients, providers and anyone who visits. Breaking them can lead to content removal, suspension or a permanent ban."
  >
    <section id="respect"><h2>1. Respect and consent come first</h2>
      <ul>
        <li>Treat everyone with dignity. No harassment, hate speech, threats, bullying or pressure.</li>
        <li><strong>A “no” means no.</strong> Accept it straight away, whether it is about a message, a request, a meeting or anything else.</li>
        <li>Consent must be clear, freely given and can be withdrawn at any time. A message, an appointment request or a payment is never consent to anything.</li>
      </ul></section>

    <section id="never"><h2>2. Never allowed — zero tolerance</h2>
      <p>These lead to immediate removal, a permanent ban and, where required, a report to law enforcement:</p>
      <ul>
        <li>Any content involving, or appearing to involve, <strong>anyone under 18</strong>.</li>
        <li>Content showing <strong>non-consensual acts</strong>, coercion, violence, or exploitation of any kind, and any sharing of intimate images of a person without their permission (including threats to share them).</li>
        <li>Trafficking, or any attempt to exploit or control another person.</li>
        <li>Impersonating another person or using someone else's photos or videos.</li>
        <li>Anything illegal, or using JaraPlug to arrange anything illegal.</li>
      </ul></section>

    <section id="content"><h2>3. What you can post</h2>
      <ul>
        <li><strong>Public content</strong> (visible to everyone) must be non-explicit and suitable for a general adult audience.</li>
        <li><strong>Members-only and paid content</strong> may be adult in nature but must be <strong>your own</strong>, show only <strong>consenting adults</strong>, and follow the law.</li>
        <li>Only post what you have the right to share. Do not post other people's content, or content that reveals someone's private details without their consent.</li>
        <li>Do not include phone numbers, addresses, social media handles or payment details in public profile text or content.</li>
        <li>Profile photos must clearly show the real person who owns the account.</li>
      </ul></section>

    <section id="messaging"><h2>4. Messaging and conduct</h2>
      <ul>
        <li>Be honest about who you are and what you offer.</li>
        <li>No spam, mass messages, scams or misleading offers.</li>
        <li><strong>Never send money outside JaraPlug</strong>, and never ask others to. Be careful of anyone who asks you to pay to “verify”, “unlock” or “secure” anything, or who pushes you to move to another app.</li>
        <li>Do not screenshot, record, leak or resell content that someone else has unlocked or sent you privately.</li>
        <li>Do not try to avoid a suspension by opening new accounts.</li>
      </ul></section>

    <section id="safety"><h2>5. Staying safe when you meet</h2>
      <p>JaraPlug does not supervise meetings. Protect yourself:</p>
      <ul>
        <li>Chat first and trust your instincts. If something feels wrong, stop.</li>
        <li>Meet in a <strong>public place</strong> the first time, and arrange your own transport.</li>
        <li>Tell a friend or family member where you are going, who you are meeting and when you expect to be back.</li>
        <li>Never share your home address, workplace, banking details or ID until you fully trust the person.</li>
        <li>Never feel obliged to continue. You can leave at any time.</li>
        <li>In an emergency call <strong>112</strong> (Nigeria's emergency number) or your local police, then report the user to us.</li>
      </ul></section>

    <section id="report"><h2>6. Reporting</h2>
      <p>Use the <strong>Report</strong> option on any profile, message or item and choose the reason. You can also email <Mail />. Reports are confidential: the person you report is not told who reported them.</p>
      <p><strong>Priority reports</strong> — non-consensual imagery, underage content, exploitation and impersonation — are reviewed first, and the content is hidden straight away while we check. Please do not repost or forward the content when you report it; describe it instead.</p></section>

    <section id="takedown"><h2>7. Takedown requests (intimate images shared without consent)</h2>
      <p>If intimate content of you has been shared on JaraPlug without your consent, report the item or email <Mail /> with a link or a description of where it appears. You do not need to be a JaraPlug user. We act promptly, can permanently remove the content, suspend the person who posted it and cooperate with the authorities. If you are under 18 in the content, or you feel unsafe, contact the police as well.</p></section>

    <section id="consequences"><h2>8. What happens when rules are broken</h2>
      <ul>
        <li>We may remove content, limit features, issue a warning, suspend the account, or ban it permanently, depending on how serious the breach is. Serious breaches skip the warnings.</li>
        <li>We may hold earnings connected to a breach, and we report suspected crimes to the authorities.</li>
        <li>We record the reason for every decision.</li>
      </ul></section>

    <section id="appeals"><h2>9. If you think we got it wrong</h2>
      <p>Email <Mail /> with your username and what happened. We will review your case again and tell you the outcome.</p></section>
  </Doc>
)
