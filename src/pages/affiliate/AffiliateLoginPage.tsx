/**
 * AffiliateLoginPage — combined login + register for the affiliate portal.
 * Clean, premium dark-themed design matching the main TambuaTips aesthetic.
 */

import React, { useState } from 'react';
import { useAffiliate } from '../../context/AffiliateContext';
import { CheckCircle, AlertCircle, Phone, ArrowRight, Loader2 } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';

export function AffiliateLoginPage() {
  const { googleLogin, requestPhoneOtp, phoneLogin } = useAffiliate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [usePhone, setUsePhone] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      setError('');
      setSuccess('');
      setLoading(true);
      try {
        await googleLogin(credentialResponse.credential);
      } catch (err: any) {
        setError(err.message || 'Google Authentication failed');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 9) {
      setError("Please enter a valid phone number");
      return;
    }
    setError('');
    setLoading(true);
    try {
      await requestPhoneOtp(phone, name || undefined);
      setSuccess("Verification code sent via SMS!");
      setStep('otp');
    } catch (err: any) {
      setError(err.message || "Failed to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      setError("Please enter the verification code");
      return;
    }
    setError('');
    setLoading(true);
    try {
      await phoneLogin(phone, otp);
    } catch (err: any) {
      setError(err.message || "Invalid verification code.");
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Brand background image */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: 'url(/brand-ad.jpeg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }} />
      {/* Dark overlay for readability */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
      }} />

      <div style={{
        width: '100%', maxWidth: '440px', position: 'relative', zIndex: 1,
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <p style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 0.25rem' }}>
            TambuaTips
          </p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', margin: 0 }}>
            Affiliate Program
          </h1>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          padding: '2rem',
          backdropFilter: 'blur(20px)',
        }}>
          
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#fca5a5', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem',
            }}>
              <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
              {error}
            </div>
          )}

          {success && (
            <div style={{
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
              color: '#6ee7b7', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.875rem',
              display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem',
            }}>
              <CheckCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
              {success}
            </div>
          )}

          {!usePhone ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '1rem', marginBottom: '1.5rem' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google Authentication Failed')}
                  theme="filled_black"
                  shape="pill"
                  size="large"
                  text="continue_with"
                />
              </div>

              <div style={{ position: 'relative', margin: '1.5rem 0' }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.1)' }}></div>
                </div>
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', fontSize: '0.875rem' }}>
                  <span style={{ background: '#111827', padding: '0 0.5rem', color: '#9ca3af' }}>Or</span>
                </div>
              </div>

              <button
                onClick={() => { setUsePhone(true); setError(''); setSuccess(''); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white', padding: '0.75rem', borderRadius: '12px', fontWeight: 600, fontSize: '0.95rem',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <Phone style={{ width: '18px', height: '18px' }} />
                Continue with Phone
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {step === 'phone' ? (
                <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      style={{
                        width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white', padding: '0.75rem 1rem', borderRadius: '12px',
                        fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      Phone Number
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Phone style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#6b7280' }} />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="254712345678"
                        style={{
                          width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                          color: 'white', padding: '0.75rem 1rem 0.75rem 2.8rem', borderRadius: '12px',
                          fontSize: '0.95rem', outline: 'none', transition: 'all 0.2s',
                        }}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%', background: '#10b981', color: '#111827',
                      padding: '0.875rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem',
                      border: 'none', cursor: loading ? 'wait' : 'pointer', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      opacity: loading ? 0.7 : 1, marginTop: '0.5rem'
                    }}
                  >
                    {loading ? <Loader2 className="animate-spin" style={{ width: '18px', height: '18px', animation: "spin 1s linear infinite" }} /> : (
                      <>Send Verification Code <ArrowRight style={{ width: '18px', height: '18px' }} /></>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', color: '#d1d5db', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      Verification Code
                    </label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter 5-digit code"
                      style={{
                        width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white', padding: '0.75rem 1rem', borderRadius: '12px',
                        fontSize: '1.25rem', outline: 'none', transition: 'all 0.2s', textAlign: 'center', letterSpacing: '0.2em'
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%', background: '#10b981', color: '#111827',
                      padding: '0.875rem', borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem',
                      border: 'none', cursor: loading ? 'wait' : 'pointer', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      opacity: loading ? 0.7 : 1, marginTop: '0.5rem'
                    }}
                  >
                    {loading ? <Loader2 style={{ width: '18px', height: '18px', animation: "spin 1s linear infinite" }} /> : 'Verify & Login'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                    style={{
                      background: 'none', border: 'none', color: '#9ca3af', fontSize: '0.875rem',
                      cursor: 'pointer', marginTop: '0.5rem', textDecoration: 'underline'
                    }}
                  >
                    Change phone number
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => { setUsePhone(false); setError(''); setSuccess(''); }}
                style={{
                  background: 'none', border: 'none', color: '#9ca3af', fontSize: '0.875rem',
                  cursor: 'pointer', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                Back to Google Login
              </button>
            </div>
          )}

          <p style={{ color: '#6b7280', fontSize: '0.75rem', textAlign: 'center', marginTop: '2rem', lineHeight: 1.5 }}>
            New accounts will be automatically registered and sent for approval.
          </p>
        </div>

        <p style={{ color: '#4b5563', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem' }}>
          © {new Date().getFullYear()} TambuaTips Affiliate Program
        </p>
      </div>
    </div>
  );
}


