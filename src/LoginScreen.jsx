import React, { useState } from 'react';
import { supabase } from './lib/supabase';

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Ongeldig e-mailadres of wachtwoord');
      setLoading(false);
      return;
    }

    // Check if user is approved
    const { data: profile } = await supabase
      .from('profiles')
      .select('approved, role, username, name')
      .eq('id', data.user.id)
      .single();

    if (!profile?.approved) {
      await supabase.auth.signOut();
      setError('Je account is nog niet goedgekeurd. Neem contact op met Cefas.');
      setLoading(false);
      return;
    }

    onLogin(data.user, profile);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      
      {/* Logo */}
      <div className="text-center mb-10">
        <h1 className="font-display text-7xl mb-2"
          style={{ 
            fontFamily: 'Bebas Neue, sans-serif',
            background: 'linear-gradient(to right, #10b981, #14b8a6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
          GOLF STATS
        </h1>
        <p style={{ color: 'rgba(167, 243, 208, 0.7)', fontSize: '14px' }}>
          Track. Analyze. Improve.
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-sm rounded-3xl p-8"
        style={{ 
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(10px)'
        }}>
        
        <h2 style={{ 
          fontFamily: 'Bebas Neue, sans-serif',
          fontSize: '28px',
          color: '#10b981',
          marginBottom: '24px',
          textAlign: 'center',
          letterSpacing: '2px'
        }}>
          INLOGGEN
        </h2>

        {/* Error */}
        {error && (
          <div className="rounded-xl p-4 mb-4 text-center text-sm"
            style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }}>
            {error}
          </div>
        )}

        {/* Email */}
        <div className="mb-4">
          <label style={{ fontSize: '11px', color: 'rgba(167,243,208,0.7)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>
            E-mailadres
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jouw@email.nl"
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              padding: '14px 16px',
              color: 'white',
              fontSize: '16px',
              outline: 'none',
            }}
          />
        </div>

        {/* Password */}
        <div className="mb-6">
          <label style={{ fontSize: '11px', color: 'rgba(167,243,208,0.7)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>
            Wachtwoord
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin(e)}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              padding: '14px 16px',
              color: 'white',
              fontSize: '16px',
              outline: 'none',
            }}
          />
        </div>

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={loading || !email || !password}
          style={{
            width: '100%',
            background: loading ? 'rgba(16,185,129,0.5)' : 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            border: 'none',
            borderRadius: '14px',
            padding: '16px',
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: '20px',
            letterSpacing: '2px',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {loading ? 'INLOGGEN...' : 'INLOGGEN'}
        </button>
      </div>

      {/* Footer */}
      <p style={{ marginTop: '32px', color: 'rgba(255,255,255,0.3)', fontSize: '12px', textAlign: 'center' }}>
        Geen account? Neem contact op met Cefas.
      </p>
    </div>
  );
}
