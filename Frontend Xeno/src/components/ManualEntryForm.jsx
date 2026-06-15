import React, { useState } from 'react';
import { UserPlus, Mail, Phone, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://ai-native-crm-production.up.railway.app/api';

export default function ManualEntryForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    initialOrderValue: ''
  });
  
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`${API_BASE}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          initialOrderValue: formData.initialOrderValue ? parseFloat(formData.initialOrderValue) : null
        })
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: 'Customer successfully added!' });
        setFormData({ name: '', email: '', phone: '', initialOrderValue: '' });
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to add customer' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Network error. Could not reach server.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: '#111113',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.07)',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: '#161618'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#f4f4f5', display: 'flex', alignItems: 'center', margin: 0 }}>
          <UserPlus size={20} style={{ marginRight: '8px', color: '#818cf8' }} />
          Quick Add Customer
        </h3>
        <p style={{ fontSize: '13px', color: '#a1a1aa', marginTop: '4px' }}>
          Manually enter a single customer's details.
        </p>
      </div>

      <div style={{ padding: '24px' }}>
        {status.message && (
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'flex-start',
            background: status.type === 'success' ? 'rgba(74,222,128,0.1)' : 'rgba(244,63,94,0.1)',
            color: status.type === 'success' ? '#4ade80' : '#f43f5e',
            border: `1px solid ${status.type === 'success' ? 'rgba(74,222,128,0.2)' : 'rgba(244,63,94,0.2)'}`
          }}>
            {status.type === 'success' ? (
              <CheckCircle size={20} style={{ marginRight: '12px', marginTop: '2px', flexShrink: 0, color: '#4ade80' }} />
            ) : (
              <AlertCircle size={20} style={{ marginRight: '12px', marginTop: '2px', flexShrink: 0, color: '#f43f5e' }} />
            )}
            <p style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>{status.message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#e4e4e7', marginBottom: '6px' }}>Full Name *</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, paddingLeft: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                <UserPlus size={16} style={{ color: '#71717a' }} />
              </div>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                style={{
                  display: 'block', width: '100%', padding: '10px 12px 10px 38px',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: '8px', fontSize: '14px', color: '#f4f4f5', boxSizing: 'border-box'
                }}
                placeholder="John Doe"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#e4e4e7', marginBottom: '6px' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, paddingLeft: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                  <Mail size={16} style={{ color: '#71717a' }} />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  style={{
                    display: 'block', width: '100%', padding: '10px 12px 10px 38px',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: '8px', fontSize: '14px', color: '#f4f4f5', boxSizing: 'border-box'
                  }}
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#e4e4e7', marginBottom: '6px' }}>Phone Number</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, paddingLeft: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                  <Phone size={16} style={{ color: '#71717a' }} />
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  style={{
                    display: 'block', width: '100%', padding: '10px 12px 10px 38px',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: '8px', fontSize: '14px', color: '#f4f4f5', boxSizing: 'border-box'
                  }}
                  placeholder="+1234567890"
                />
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#e4e4e7', marginBottom: '6px' }}>Initial Order Value (Optional)</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, paddingLeft: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                <DollarSign size={16} style={{ color: '#71717a' }} />
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                name="initialOrderValue"
                value={formData.initialOrderValue}
                onChange={handleChange}
                style={{
                  display: 'block', width: '100%', padding: '10px 12px 10px 38px',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: '8px', fontSize: '14px', color: '#f4f4f5', boxSizing: 'border-box'
                }}
                placeholder="0.00"
              />
            </div>
            <p style={{ fontSize: '12px', color: '#71717a', marginTop: '6px', margin: 0 }}>If provided, an order will be created immediately for this customer.</p>
          </div>

          <div style={{ paddingTop: '16px' }}>
            <button
              type="submit"
              disabled={loading || !formData.name}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                padding: '12px 16px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#fff',
                background: '#4f46e5',
                cursor: (loading || !formData.name) ? 'not-allowed' : 'pointer',
                opacity: (loading || !formData.name) ? 0.5 : 1,
                transition: 'background 0.2s',
              }}
            >
              {loading ? 'Adding Customer...' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
