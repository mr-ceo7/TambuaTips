import React from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';

export function PrivacyPolicy() {
  usePageTitle('Privacy Policy');

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12 max-w-4xl font-sans text-zinc-300">
      <h1 className="text-3xl font-display font-bold text-white mb-6">Privacy Policy</h1>
      <p className="mb-4 text-sm text-zinc-500">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-white mb-3">1. Information We Collect</h2>
          <p>
            When you use TambuaTips, we automatically collect certain information about your device, including information about your web browser, IP address, time zone, and some of the cookies that are installed on your device. Additionally, if you create an account using Google Single Sign-On, we collect your name, email address, and profile picture provided dynamically by Google.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">2. How We Use Your Information</h2>
          <p>
            We use the personal information collected to:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-zinc-400">
            <li>Provide, operate, and maintain our premium betting intelligence services.</li>
            <li>Monitor user authentication sessions.</li>
            <li>Process transactions securely.</li>
            <li>Communicate with you regarding updates, offers, and support.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">3. Cookies and Tracking</h2>
          <p>
            We use Secure, HttpOnly cookies for session verification and site navigation. By using TambuaTips, you consent to the active tracking cookies necessary merely to operate the application.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">4. Information Sharing</h2>
          <p>
            We do not sell your personal data. We may share information with trusted third-party providers (such as payment processors) exclusively for the purpose of delivering our premium service. We may also disclose your information if required by law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">5. Data Rights</h2>
          <p>
            You possess the right to access, alter, delete, or correct your personal data. If you authenticated via Google SSO and wish to withdraw your account or correct your information, you may contact us or update your overarching Google Account profiles.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-3">6. Contact Us</h2>
          <p>
            For privacy inquiries, please contact us via our provided social channels or reach out to our official support network.
          </p>
        </section>
      </div>
    </div>
  );
}
