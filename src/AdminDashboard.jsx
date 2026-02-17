import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function AdminDashboard({ onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setUsers(data || []);
    setLoading(false);
  };

  const toggleApproval = async (userId, currentStatus) => {
    await supabase
      .from('profiles')
      .update({ approved: !currentStatus })
      .eq('id', userId);
    loadUsers();
  };

  const deleteUser = async (userId, userName) => {
    if (!confirm(`Weet je zeker dat je ${userName} wilt verwijderen?`)) return;

    const { error } = await supabase.rpc('delete_user_for_admin', {
      user_id: userId
    });

    if (error) {
      setMessage(`❌ Fout: ${error.message}`);
    } else {
      setMessage(`🗑️ ${userName} verwijderd`);
      loadUsers();
    }
  };

  const cardStyle = {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '20px',
    padding: '24px',
    marginBottom: '20px',
  };

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '12px',
    padding: '12px 16px',
    color: 'white',
    fontSize: '16px',
    outline: 'none',
    marginBottom: '12px',
  };

  return (
    <div className="min-h-screen pb-10"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      
      {/* Header */}
      <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '24px' }}>
          ←
        </button>
        <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '32px', color: '#10b981', letterSpacing: '2px' }}>
          ADMIN DASHBOARD
        </h1>
      </div>

      <div style={{ padding: '0 24px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{ ...cardStyle, textAlign: 'center', padding: '20px' }}>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '48px', color: '#10b981' }}>
              {users.length}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
              Gebruikers
            </div>
          </div>
          <div style={{ ...cardStyle, textAlign: 'center', padding: '20px' }}>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '48px', color: '#10b981' }}>
              {users.filter(u => u.approved).length}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
              Actief
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div style={{ 
            background: message.startsWith('✅') ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
            border: `1px solid ${message.startsWith('✅') ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
            borderRadius: '12px', padding: '12px', marginBottom: '20px',
            color: 'white', textAlign: 'center', fontSize: '14px'
          }}>
            {message}
          </div>
        )}

        {/* Help Button */}
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => setShowHelp(!showHelp)}
            style={{
              width: '100%',
              background: showHelp ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)',
              border: showHelp ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.12)',
              borderRadius: '16px',
              padding: '16px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>📚</span>
              <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', letterSpacing: '1px', color: '#10b981' }}>
                HOE MAAK IK EEN NIEUWE GEBRUIKER AAN?
              </span>
            </div>
            <span style={{ fontSize: '20px' }}>{showHelp ? '▼' : '▶'}</span>
          </button>
        </div>

        {/* Expandable Instructions */}
        {showHelp && (
          <div style={{ ...cardStyle, marginBottom: '20px' }}>
            <h3 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '20px', color: '#10b981', marginBottom: '20px', letterSpacing: '1px' }}>
              ✅ STAP-VOOR-STAP INSTRUCTIES
            </h3>
            
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '15px', lineHeight: '1.8' }}>
              
              {/* Stap 1 */}
              <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(16,185,129,0.1)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.3)' }}>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '18px', color: '#10b981', marginBottom: '8px', letterSpacing: '1px' }}>
                  📍 STAP 1: SUPABASE AUTHENTICATION
                </div>
                <ol style={{ marginLeft: '20px', marginTop: '12px' }}>
                  <li style={{ marginBottom: '8px' }}>Ga naar <strong style={{ color: '#10b981' }}>supabase.com</strong></li>
                  <li style={{ marginBottom: '8px' }}>Open jouw project</li>
                  <li style={{ marginBottom: '8px' }}>Klik links op <strong style={{ color: '#10b981' }}>Authentication</strong> (🔑 icoon)</li>
                  <li style={{ marginBottom: '8px' }}>Klik op <strong style={{ color: '#10b981' }}>Users</strong> tab</li>
                  <li style={{ marginBottom: '8px' }}>Klik rechtsboven op <strong style={{ color: '#10b981' }}>Add user</strong></li>
                  <li style={{ marginBottom: '8px' }}>Kies <strong style={{ color: '#10b981' }}>Create new user</strong></li>
                  <li style={{ marginBottom: '8px' }}>Vul in:
                    <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                      <li>Email: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>gebruiker@email.nl</code></li>
                      <li>Password: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>tijdelijkwachtwoord123</code></li>
                      <li>✅ Vink aan: <strong style={{ color: '#10b981' }}>Auto Confirm User</strong></li>
                    </ul>
                  </li>
                  <li style={{ marginBottom: '8px' }}>Klik <strong style={{ color: '#10b981' }}>Create user</strong></li>
                </ol>
              </div>

              {/* Stap 2 */}
              <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(16,185,129,0.1)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.3)' }}>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '18px', color: '#10b981', marginBottom: '8px', letterSpacing: '1px' }}>
                  📍 STAP 2: SQL EDITOR - PROFIEL AANMAKEN
                </div>
                <ol style={{ marginLeft: '20px', marginTop: '12px' }}>
                  <li style={{ marginBottom: '8px' }}>Klik links op <strong style={{ color: '#10b981' }}>SQL Editor</strong></li>
                  <li style={{ marginBottom: '8px' }}>Kopieer onderstaande code:</li>
                </ol>
                <pre style={{ 
                  background: 'rgba(0,0,0,0.5)', 
                  padding: '16px', 
                  borderRadius: '8px', 
                  overflow: 'auto',
                  fontSize: '13px',
                  color: '#10b981',
                  marginTop: '12px',
                  marginBottom: '12px',
                  border: '1px solid rgba(16,185,129,0.3)'
                }}>
{`INSERT INTO profiles (id, email, name, username, approved, role)
SELECT 
  id, 
  'gebruiker@email.nl',      -- ← PAS AAN: Email (moet matchen!)
  'Jan de Vries',            -- ← PAS AAN: Volledige naam
  'Jan',                     -- ← PAS AAN: Roepnaam (voor begroeting)
  true,                      -- ← Approved (laat staan)
  'user'                     -- ← Role (laat staan)
FROM auth.users 
WHERE email = 'gebruiker@email.nl';  -- ← PAS AAN: Zelfde email!`}
                </pre>
                <ol start="3" style={{ marginLeft: '20px' }}>
                  <li style={{ marginBottom: '8px' }}>Pas de 3 velden aan:
                    <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                      <li><strong>Email</strong>: Moet exact matchen met Stap 1</li>
                      <li><strong>Volledige naam</strong>: Bijv. "Pieter de Jong"</li>
                      <li><strong>Roepnaam</strong>: Bijv. "Pieter" (voor "Goedemorgen, Pieter!")</li>
                    </ul>
                  </li>
                  <li style={{ marginBottom: '8px' }}>Plak in SQL Editor</li>
                  <li style={{ marginBottom: '8px' }}>Klik <strong style={{ color: '#10b981' }}>Run</strong></li>
                  <li style={{ marginBottom: '8px' }}>Je ziet: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px', color: '#10b981' }}>Success. 1 row inserted.</code></li>
                </ol>
              </div>

              {/* Stap 3 */}
              <div style={{ padding: '16px', background: 'rgba(16,185,129,0.1)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.3)' }}>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '18px', color: '#10b981', marginBottom: '8px', letterSpacing: '1px' }}>
                  🎉 STAP 3: KLAAR!
                </div>
                <p style={{ marginBottom: '12px' }}>
                  De gebruiker kan nu inloggen met:
                </p>
                <ul style={{ marginLeft: '20px' }}>
                  <li>Email: het opgegeven emailadres</li>
                  <li>Wachtwoord: het tijdelijke wachtwoord</li>
                  <li>Begroeting: "Goedemorgen, [roepnaam]!"</li>
                </ul>
                <p style={{ marginTop: '16px', padding: '12px', background: 'rgba(16,185,129,0.2)', borderRadius: '8px', fontSize: '14px' }}>
                  💡 <strong>Tip:</strong> De gebruiker kan zijn wachtwoord later wijzigen in de app instellingen.
                </p>
              </div>

            </div>
          </div>
        )}

        {/* Users List */}
        <div style={cardStyle}>
          <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: '22px', color: '#10b981', marginBottom: '16px', letterSpacing: '1px' }}>
            ALLE GEBRUIKERS
          </h2>

          {loading ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '20px' }}>
              Laden...
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '20px' }}>
              Nog geen gebruikers
            </div>
          ) : (
            users.map(user => (
              <div key={user.id} style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontWeight: '600', color: 'white', fontSize: '16px' }}>
                    {user.name || 'Geen naam'}
                    {user.role === 'admin' && (
                      <span style={{ marginLeft: '8px', fontSize: '11px', background: 'rgba(16,185,129,0.3)', color: '#10b981', padding: '2px 8px', borderRadius: '20px' }}>
                        ADMIN
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                    {user.email}
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <span style={{
                      fontSize: '11px',
                      padding: '3px 10px',
                      borderRadius: '20px',
                      background: user.approved ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                      color: user.approved ? '#10b981' : '#ef4444',
                      border: `1px solid ${user.approved ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                    }}>
                      {user.approved ? '● Actief' : '● Geblokkeerd'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* Block/Unblock */}
                  {user.role !== 'admin' && (
                    <button
                      onClick={() => toggleApproval(user.id, user.approved)}
                      style={{
                        background: user.approved ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                        border: `1px solid ${user.approved ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`,
                        color: user.approved ? '#ef4444' : '#10b981',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      {user.approved ? 'Blokkeer' : 'Activeer'}
                    </button>
                  )}
                  {/* Delete */}
                  {user.role !== 'admin' && (
                    <button
                      onClick={() => deleteUser(user.id, user.name)}
                      style={{
                        background: 'rgba(239,68,68,0.2)',
                        border: '1px solid rgba(239,68,68,0.4)',
                        color: '#ef4444',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
