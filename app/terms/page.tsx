import type { Metadata } from "next";
import { PolicyPageLayout, PolicySection } from "@/components/PolicyPageLayout";

export const metadata: Metadata = {
  title: "Terms of Service — Ravi Programming Academy",
};

const LAST_UPDATED = "September 13, 2026";

export default function TermsOfServicePage() {
  return (
    <PolicyPageLayout title="Terms of Service" lastUpdated={LAST_UPDATED}>
      <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
        These Terms of Service (&quot;Terms&quot;) govern your use of Ravi Programming Academy (&quot;the
        platform&quot;), an educational website for practicing programming and SQL. By creating an account
        or using the platform, you agree to these Terms. If you do not agree, please do not use the platform.
      </p>

      <PolicySection heading="1. Educational Use Only">
        <p>
          The platform is provided for educational purposes — practicing coding and SQL problems, tracking
          your own learning progress, and receiving automated feedback. It is intended for use by enrolled
          students of Ravi Programming Academy. You may not use the platform for commercial purposes, resell
          access to it, or use it to provide code-execution services to anyone else.
        </p>
      </PolicySection>

      <PolicySection heading="2. Your Responsibilities">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Provide accurate information when creating your account and keep your name and contact details up to date.</li>
          <li>Keep your password confidential and do not share your account with anyone else — you are responsible for all activity that occurs under your account.</li>
          <li>Notify us promptly if you believe your account has been accessed without your permission.</li>
        </ul>
      </PolicySection>

      <PolicySection heading="3. Acceptable Use">
        <p>When using the platform, you agree that you will not:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Submit code intended to attack, disrupt, or gain unauthorized access to the platform, the code execution service, or any other student&apos;s account or data.</li>
          <li>Attempt to circumvent rate limits, execution time limits, or any other safeguard put in place to keep the platform usable for everyone.</li>
          <li>Use scripts, bots, or automated tools to create accounts, submit solutions, or otherwise interact with the platform in place of a real person.</li>
          <li>Copy another student&apos;s submitted solution and submit it as your own, or otherwise misrepresent work that is not your own for grading purposes.</li>
          <li>Send spam, upload malicious files, or use the platform to distribute content unrelated to your coursework.</li>
          <li>Attempt to access another user&apos;s account, submissions, or personal information without authorization.</li>
        </ul>
        <p>
          Code you write to solve practice problems — including code that intentionally explores edge cases,
          fails on purpose, or behaves unexpectedly as part of learning — is expected and welcome. This
          section is about abuse of the platform itself, not about how you approach a problem.
        </p>
      </PolicySection>

      <PolicySection heading="4. Account Suspension">
        <p>
          We may suspend or terminate your account if we reasonably believe you have violated these Terms,
          including for the acceptable-use violations described in Section 3, or if your account shows signs
          of being compromised or used for automated abuse. Where practical, we will try to notify you of the
          reason. If you believe your account was suspended in error, contact us using the information in
          Section 9.
        </p>
      </PolicySection>

      <PolicySection heading="5. Intellectual Property">
        <p>
          Problem statements, sample datasets, platform design, and underlying software are owned by Ravi
          Programming Academy or licensed to us, and are provided for your personal, educational use only —
          you may not redistribute or republish them elsewhere.
        </p>
        <p>
          Code and SQL queries you write and submit remain your own work. By submitting a solution, you allow
          us to store it, run it, and display it back to you (for example, in your submission history and on
          leaderboards) as part of operating the platform.
        </p>
      </PolicySection>

      <PolicySection heading="6. Payments and Refunds">
        <p>
          Some problems and features require a one-time purchase of lifetime access. Prices are shown before
          you pay, and payment is processed securely by Razorpay — we never see or store your card number or
          other card details. We do store a record of the transaction itself (the amount, its status, and a
          payment reference from Razorpay), which is used to confirm your purchase and grant access.
        </p>
        <p>
          Refunds are considered on a case-by-case basis rather than under a fixed automatic policy. If
          you&apos;d like to request a refund, contact us using the information in Section 9 and we will
          review your request.
        </p>
      </PolicySection>

      <PolicySection heading="7. Service Availability">
        <p>
          The platform runs on a single server and depends on third-party services, including our
          authentication provider and code execution service. We aim to keep the platform available and
          responsive, but we do not guarantee uninterrupted access — the platform may be temporarily
          unavailable for maintenance, updates, or due to issues outside our control, including outages of
          the services we depend on.
        </p>
      </PolicySection>

      <PolicySection heading="8. Limitation of Liability">
        <p>
          The platform is provided &quot;as is&quot;, for educational use, without warranties of any kind. To
          the fullest extent permitted by law, Ravi Programming Academy is not liable for any indirect,
          incidental, or consequential damages arising from your use of, or inability to use, the platform —
          including loss of submission history or progress data. Nothing in these Terms limits any liability
          that cannot be limited under applicable law.
        </p>
      </PolicySection>

      <PolicySection heading="9. Changes to These Terms and Contact Us">
        <p>
          We may update these Terms as the platform evolves. When we do, we will update the &quot;Last
          updated&quot; date at the top of this page. Continuing to use the platform after an update means
          you accept the revised Terms. If you have questions about these Terms, including refund requests
          described in Section 6, contact us at{" "}
          <a href="mailto:raviprogrammingacademyweb@gmail.com" className="text-secondary hover:underline">
            raviprogrammingacademyweb@gmail.com
          </a>.
        </p>
      </PolicySection>
    </PolicyPageLayout>
  );
}
