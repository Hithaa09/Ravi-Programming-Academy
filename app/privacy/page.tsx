import type { Metadata } from "next";
import { PolicyPageLayout, PolicySection } from "@/components/PolicyPageLayout";

export const metadata: Metadata = {
  title: "Privacy Policy — Ravi Programming Academy",
};

const LAST_UPDATED = "September 13, 2026";

export default function PrivacyPolicyPage() {
  return (
    <PolicyPageLayout title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
        Ravi Programming Academy (&quot;we&quot;, &quot;us&quot;, or &quot;the platform&quot;) is an educational
        website where students practice programming and SQL problems, track their progress, and receive
        automated feedback on their submissions. This Privacy Policy explains what information we collect
        when you use the platform, how we use it, and the choices available to you. By creating an account
        or using the platform, you agree to the practices described here.
      </p>

      <PolicySection heading="1. Information We Collect">
        <p>We collect the following information as part of normal use of the platform:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong className="text-on-surface">Account information</strong> — your name and email address, provided at signup or supplied by Google if you sign in with your Google account.</li>
          <li><strong className="text-on-surface">Authentication credentials</strong> — if you sign up with a password, it is created and stored by our authentication provider, Supabase; we never see or store your password in plain text (see Section 3).</li>
          <li><strong className="text-on-surface">Submissions</strong> — the code and SQL queries you write and submit, along with the verdict, execution time, and memory usage returned for each one.</li>
          <li><strong className="text-on-surface">Account activity</strong> — problems solved, submission history, streaks, and leaderboard standing, used to build your dashboard and progress statistics.</li>
          <li><strong className="text-on-surface">Basic technical data</strong> — sign-in timestamps and, for signup, login, and password-reset requests specifically, your IP address, which we use briefly to prevent automated abuse (see Section 5).</li>
          <li><strong className="text-on-surface">Purchase records</strong> — if you buy lifetime access, we store the transaction amount, its status, and a payment reference from Razorpay, our payment processor, so we can confirm your purchase and grant access. See Section 6 for details.</li>
        </ul>
        <p>We never see or store your card number or other card details — those are handled entirely by Razorpay. We also do not collect government-issued IDs or any data unrelated to using the platform.</p>
      </PolicySection>

      <PolicySection heading="2. How We Use Your Information">
        <p>We use the information above only to operate and improve the platform:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>To create and secure your account, and to recognize you when you sign in.</li>
          <li>To run, grade, and store your code and SQL submissions so you can review your own history.</li>
          <li>To calculate your progress statistics, streaks, and leaderboard position.</li>
          <li>To send account-related emails, such as email verification and password-reset links.</li>
          <li>To detect and prevent abuse of the platform, such as automated account creation or excessive submission volume.</li>
        </ul>
        <p>
          We do not sell your data, use it for advertising, or share it with third parties for marketing
          purposes. Your instructors and platform administrators can see your submissions and activity
          in order to review your progress and provide support — that visibility is a normal part of how
          the platform is used for teaching.
        </p>
      </PolicySection>

      <PolicySection heading="3. Authentication via Supabase">
        <p>
          Account sign-up and sign-in are handled by Supabase Auth, a third-party authentication service.
          Supabase stores your email address and a securely hashed version of your password — we do not
          have access to your password in plain text, and neither does Supabase. When you sign in, Supabase
          issues a session token stored in your browser as a cookie, which is how the platform recognizes
          you on later visits without asking you to log in again on every page.
        </p>
      </PolicySection>

      <PolicySection heading="4. Signing In With Google">
        <p>
          If you choose to sign in with Google instead of creating a password, Google shares your name and
          email address with us (and Supabase, as our authentication provider) so that we can create or
          recognize your account. We do not receive your Google password, and we only request the minimum
          information needed to identify you — we do not access your Gmail, Google Drive, or any other
          Google service.
        </p>
      </PolicySection>

      <PolicySection heading="5. Code Execution via Judge0">
        <p>
          When you click Run or Submit on a programming or SQL problem, the code or query you wrote is sent
          to Judge0, the code execution service that compiles and runs it in an isolated sandbox and returns
          the output, any errors, and timing/memory statistics. This happens for every Run and every Submit —
          it is how the platform is able to grade your work automatically.
        </p>
        <p>
          Depending on how this instance of the platform is configured, Judge0 may run on our own
          infrastructure or be provided by a third-party Judge0 hosting service. In either case, the only
          data sent to Judge0 is the code or query you submitted and the input needed to run it — never your
          name, email, or account details. Submitted code is used solely to produce a result for you and is
          not used for any other purpose.
        </p>
      </PolicySection>

      <PolicySection heading="6. Payments via Razorpay">
        <p>
          If you purchase lifetime access, payment is processed by Razorpay, a third-party payment processor.
          Razorpay collects and handles your card or payment method details directly — we never see, receive,
          or store your card number or other payment credentials. What we do store, on our own side, is a
          record of the transaction itself: the amount, its status, and a payment reference Razorpay gives us,
          which we use to confirm your purchase and grant you access. Refund requests are handled as described
          in our Terms of Service.
        </p>
      </PolicySection>

      <PolicySection heading="7. Data Security">
        <p>We take reasonable, practical steps to protect your information:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Passwords are never stored by us directly — they are held and hashed by Supabase, our authentication provider.</li>
          <li>All traffic between your browser and the platform, and between the platform and its database, is encrypted in transit.</li>
          <li>Administrator access is restricted to accounts explicitly granted an administrator role, which cannot be self-assigned by any user.</li>
          <li>Automated rate limiting is in place on account creation, sign-in, password reset, and code execution to reduce the impact of abuse or a compromised account.</li>
        </ul>
        <p>
          No online service can guarantee perfect security. We work to protect your data but cannot promise
          it will never be compromised.
        </p>
      </PolicySection>

      <PolicySection heading="8. Data Retention">
        <p>
          We retain your account information and submission history for as long as your account remains
          active, since your submission history is what your dashboard, streaks, and progress tracking are
          built from. If your account is suspended, your data is kept but your access is restricted until an
          administrator reinstates it. If you would like your account and associated data deleted, contact
          us using the information in Section 10 — we will remove your account and personal information
          within a reasonable time, except where a short retention period is needed to prevent fraud or
          abuse of the platform.
        </p>
      </PolicySection>

      <PolicySection heading="9. Your Rights and Choices">
        <p>You can:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Update your full name and password at any time from your account Settings page.</li>
          <li>Request a copy of the personal information we hold about you.</li>
          <li>Request that your account and associated data be corrected or deleted.</li>
        </ul>
        <p>
          Some of these — such as changing your email address or deleting your account — currently require
          contacting an administrator rather than a self-service button in the app, since this platform is
          designed for a small, instructor-managed group of students. See Section 10 for how to reach us.
        </p>
      </PolicySection>

      <PolicySection heading="10. Contact Us">
        <p>
          If you have questions about this Privacy Policy, or want to access, correct, or delete your data,
          contact your course administrator or reach us at{" "}
          <a href="mailto:raviprogrammingacademyweb@gmail.com" className="text-secondary hover:underline">
            raviprogrammingacademyweb@gmail.com
          </a>.
        </p>
      </PolicySection>

      <PolicySection heading="11. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time as the platform changes. If we make material
          changes, we will update the &quot;Last updated&quot; date at the top of this page. Continuing to
          use the platform after an update means you accept the revised policy.
        </p>
      </PolicySection>
    </PolicyPageLayout>
  );
}
