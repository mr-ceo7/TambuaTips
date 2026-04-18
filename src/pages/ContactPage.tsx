import React, { useState, useEffect } from 'react';
import { SEO } from '../components/SEO';
import { FaWhatsapp, FaEnvelope } from 'react-icons/fa';
import { motion } from 'motion/react';
import apiClient from '../services/apiClient';

interface SupportContact {
  SUPPORT_EMAIL: string;
  SUPPORT_WHATSAPP: string;
  SUPPORT_WHATSAPP_NUMBER: string;
}

const DEFAULTS: SupportContact = {
  SUPPORT_EMAIL: 'tambuatips@gmail.com',
  SUPPORT_WHATSAPP: 'https://wa.me/254746957502',
  SUPPORT_WHATSAPP_NUMBER: '+254 746 957 502',
};

export function ContactPage() {
  const [contact, setContact] = useState<SupportContact>(DEFAULTS);

  useEffect(() => {
    apiClient.get<SupportContact>('/internal/support-contact')
      .then(res => setContact(res.data))
      .catch(() => {/* use defaults */});
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12 max-w-3xl font-sans text-zinc-300">
      <SEO title={'Contact Us'} />
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">Contact Support</h1>
        <p className="text-zinc-400">
          Experiencing issues with your premium subscription, or have a question about our predictions? Our team is available to assist you.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.a 
          href={`mailto:${contact.SUPPORT_EMAIL}`}
          target="_blank" 
          rel="noopener noreferrer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex flex-col items-center justify-center p-8 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-emerald-500/50 transition-colors group"
        >
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors text-zinc-400 group-hover:text-emerald-500">
            <FaEnvelope size={32} />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Email Support</h2>
          <p className="text-sm text-zinc-500 text-center">{contact.SUPPORT_EMAIL}</p>
          <p className="text-xs text-zinc-600 text-center mt-2">Expect a response within 24 hours.</p>
        </motion.a>

        <motion.a 
          href={contact.SUPPORT_WHATSAPP}
          target="_blank" 
          rel="noopener noreferrer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex flex-col items-center justify-center p-8 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-[#25D366]/50 transition-colors group"
        >
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-[#25D366]/20 transition-colors text-zinc-400 group-hover:text-[#25D366]">
            <FaWhatsapp size={32} />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">WhatsApp</h2>
          <p className="text-sm text-zinc-500 text-center">Instant messaging</p>
          <p className="text-xs text-zinc-600 text-center mt-2">Tap to chat instantly</p>
        </motion.a>
      </div>

      <div className="mt-12 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
        <h3 className="text-lg font-bold text-white mb-2">Premium Billing Issues?</h3>
        <p className="text-sm text-zinc-400">
          If your PayPal or M-Pesa transaction was successful but your tier wasn't upgraded, please directly forward your receipt via WhatsApp for immediate tier mapping.
        </p>
      </div>
    </div>
  );
}
