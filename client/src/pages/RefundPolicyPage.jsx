import { useEffect } from 'react';

export default function RefundPolicyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="page container" style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 20px' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', marginBottom: '12px', color: 'var(--slate-800)' }}>Refund & Cancellation Policy</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Last updated: May 2026</p>

      <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
        <h3 style={{ marginTop: '32px', marginBottom: '12px', color: 'var(--slate-800)', borderLeft: '3px solid var(--accent)', paddingLeft: '12px' }}>1. Overview</h3>
        <p style={{ marginBottom: '16px' }}>
          At Donate Plea, every contribution matters, and we want you to give with confidence. Donations are processed quickly and securely, and funds may go toward supporting the chosen cause shortly after a donation is made. <strong>Your donation goes directly toward the cause you choose to support.</strong>
        </p>
        <p style={{ marginBottom: '16px' }}>
          We know questions occasionally come up, and we review every legitimate concern fairly and in good faith. This policy explains when a refund may be available, how recurring (monthly) donations work, and how to reach us if something doesn't look right.
        </p>

        <h3 style={{ marginTop: '32px', marginBottom: '12px', color: 'var(--slate-800)', borderLeft: '3px solid var(--accent)', paddingLeft: '12px' }}>2. Donation Finality</h3>
        <p style={{ marginBottom: '16px' }}>
          Because donations help real causes — often within a short time of being received — contributions made through our platform are <strong>generally non-refundable</strong> once processed. This is consistent with standard practice across major crowdfunding platforms, and it allows support to reach the people and causes who need it without delay.
        </p>
        <p style={{ marginBottom: '16px' }}>
          That said, we review refund requests on a <strong>case-by-case basis</strong>, and we will always look at genuine concerns with care and good faith.
        </p>

        <h3 style={{ marginTop: '32px', marginBottom: '12px', color: 'var(--slate-800)', borderLeft: '3px solid var(--accent)', paddingLeft: '12px' }}>3. Eligible Refund Requests</h3>
        <p style={{ marginBottom: '16px' }}>While donations are generally final, we may consider a refund in situations such as:</p>
        <ul style={{ paddingLeft: '24px', marginBottom: '16px' }}>
          <li style={{ marginBottom: '8px' }}>A <strong>duplicate donation</strong> — you were charged more than once for the same intended gift</li>
          <li style={{ marginBottom: '8px' }}>An <strong>accidental or incorrect amount</strong> entered at checkout</li>
          <li style={{ marginBottom: '8px' }}>An <strong>unauthorized or fraudulent payment</strong> made without your permission</li>
          <li style={{ marginBottom: '8px' }}>A <strong>payment processing or technical error</strong></li>
          <li style={{ marginBottom: '8px' }}><strong>Verified misuse or fraud</strong> involving a campaign or its organizer</li>
        </ul>
        <p style={{ marginBottom: '16px' }}>If your situation falls into one of these categories, please reach out — we're here to help make it right.</p>

        <h3 style={{ marginTop: '32px', marginBottom: '12px', color: 'var(--slate-800)', borderLeft: '3px solid var(--accent)', paddingLeft: '12px' }}>4. Non-Refundable Situations</h3>
        <p style={{ marginBottom: '16px' }}>To keep support flowing to real causes, refunds are generally <strong>not</strong> granted for:</p>
        <ul style={{ paddingLeft: '24px', marginBottom: '16px' }}>
          <li style={{ marginBottom: '8px' }}>A simple change of mind or donor's remorse</li>
          <li style={{ marginBottom: '8px' }}>Dissatisfaction with how a campaign turns out</li>
          <li style={{ marginBottom: '8px' }}>Disagreement with a cause or its organizer</li>
          <li style={{ marginBottom: '8px' }}>Delays, or a campaign not meeting its goal or expectations</li>
          <li style={{ marginBottom: '8px' }}>Outcomes that differ from what you hoped for</li>
        </ul>
        <p style={{ marginBottom: '16px' }}>
          Charitable giving involves real-world uncertainty. A donation is a contribution toward a cause — not the purchase of a guaranteed result, timeline, or outcome.
        </p>

        <h3 style={{ marginTop: '32px', marginBottom: '12px', color: 'var(--slate-800)', borderLeft: '3px solid var(--accent)', paddingLeft: '12px' }}>5. Recurring / Monthly Donations</h3>
        <p style={{ marginBottom: '16px' }}>We're deeply grateful to our monthly supporters — recurring gifts provide steady, dependable help that lets causes plan ahead.</p>
        <ul style={{ paddingLeft: '24px', marginBottom: '16px' }}>
          <li style={{ marginBottom: '8px' }}>You can <strong>cancel a recurring (monthly) donation at any time.</strong></li>
          <li style={{ marginBottom: '8px' }}>Cancellation <strong>stops all future charges</strong> going forward.</li>
          <li style={{ marginBottom: '8px' }}>Cancellation does <strong>not</strong> retroactively refund donations that have already been processed.</li>
        </ul>
        <p style={{ marginBottom: '16px' }}>
          You can cancel recurring donations using the cancellation link provided in your donation receipt email, or by contacting our support team directly.
        </p>

        <h3 style={{ marginTop: '32px', marginBottom: '12px', color: 'var(--slate-800)', borderLeft: '3px solid var(--accent)', paddingLeft: '12px' }}>6. Refund Review Process</h3>
        <p style={{ marginBottom: '16px' }}>To review your request, we only need a few details to locate your donation. Please include:</p>
        <ul style={{ paddingLeft: '24px', marginBottom: '16px' }}>
          <li style={{ marginBottom: '8px' }}>Your <strong>full name</strong> (as entered at checkout)</li>
          <li style={{ marginBottom: '8px' }}>The <strong>email address</strong> used for the donation</li>
          <li style={{ marginBottom: '8px' }}>The <strong>approximate date</strong> of the donation</li>
          <li style={{ marginBottom: '8px' }}>The <strong>donation amount</strong></li>
          <li style={{ marginBottom: '8px' }}>A short <strong>explanation of the issue</strong></li>
        </ul>

        <h3 style={{ marginTop: '32px', marginBottom: '12px', color: 'var(--slate-800)', borderLeft: '3px solid var(--accent)', paddingLeft: '12px' }}>7. Refund Processing Time</h3>
        <p style={{ marginBottom: '16px' }}>
          We aim to review refund requests within <strong>5–7 business days</strong> of receiving the information above. If a refund is approved, it is returned to the original payment method used for the donation.
        </p>
        <p style={{ marginBottom: '16px' }}>
          Depending on your bank or card issuer, it may take an additional <strong>5–10 business days</strong> for the refunded amount to appear on your statement.
        </p>

        <h3 style={{ marginTop: '32px', marginBottom: '12px', color: 'var(--slate-800)', borderLeft: '3px solid var(--accent)', paddingLeft: '12px' }}>8. Fraud, Abuse & Payment Disputes</h3>
        <p style={{ marginBottom: '16px' }}>
          We're committed to protecting donors, organizers, and the integrity of the Platform. If you have a concern about a donation, <strong>please contact us first</strong> — in nearly all cases we can resolve it directly, and usually faster than a bank dispute.
        </p>
        <p style={{ marginBottom: '16px' }}>
          Filing a chargeback or payment dispute without first contacting us may delay resolution, and we reserve the right to respond to disputes with documentation of the transaction.
        </p>

        <h3 style={{ marginTop: '32px', marginBottom: '12px', color: 'var(--slate-800)', borderLeft: '3px solid var(--accent)', paddingLeft: '12px' }}>9. Contact Information</h3>
        <p style={{ marginBottom: '16px' }}>Questions, cancellations, or refund requests? We're happy to help. Please reach out to us via our <a href="/contact" style={{ color: 'var(--accent)', fontWeight: 'bold' }}>Contact Us</a> page.</p>

      </div>
    </div>
  );
}
