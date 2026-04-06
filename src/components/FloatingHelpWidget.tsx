import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Mail, Phone } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
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

export function FloatingHelpWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [contact, setContact] = useState<SupportContact>(DEFAULTS);

  useEffect(() => {
    apiClient.get<SupportContact>('/internal/support-contact')
      .then(res => setContact(res.data))
      .catch(() => {/* use defaults */});
  }, []);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-24 md:bottom-6 right-4 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 ${
          isOpen 
            ? 'bg-zinc-800 border border-zinc-700 text-zinc-300 rotate-90' 
            : 'bg-emerald-500 text-zinc-950 shadow-emerald-500/30 animate-bounce hover:shadow-emerald-500/50'
        }`}
        style={{ animationDuration: '3s' }}
        title="Need help?"
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>

      {/* Help Panel */}
      {isOpen && (
        <div className="fixed bottom-40 md:bottom-20 right-4 z-40 w-72 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="p-4 border-b border-zinc-800 bg-linear-to-r from-emerald-500/10 to-transparent">
            <h3 className="text-sm font-bold text-white">Need Help? 👋</h3>
            <p className="text-[10px] text-zinc-400 mt-0.5">Our support team is ready to assist you.</p>
          </div>
          <div className="p-3 space-y-2">
            <a
              href={contact.SUPPORT_WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 hover:bg-[#25D366]/20 transition-all group"
            >
              <div className="w-9 h-9 rounded-full bg-[#25D366]/20 flex items-center justify-center text-[#25D366] group-hover:scale-110 transition-transform">
                <FaWhatsapp size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Chat on WhatsApp</p>
                <p className="text-[10px] text-zinc-500">Instant replies</p>
              </div>
            </a>
            <a
              href={`mailto:${contact.SUPPORT_EMAIL}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 transition-all group"
            >
              <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 group-hover:scale-110 transition-all">
                <Mail size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Email Support</p>
                <p className="text-[10px] text-zinc-500">{contact.SUPPORT_EMAIL}</p>
              </div>
            </a>
          </div>
          <div className="px-4 py-2.5 border-t border-zinc-800 bg-zinc-950/50">
            <p className="text-[9px] text-zinc-600 text-center">Typically responds within a few minutes</p>
          </div>
        </div>
      )}
    </>
  );
}
