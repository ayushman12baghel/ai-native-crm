import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

/* ─── helpers ───────────────────────────────────────── */

function fmt(n) {
  if (n == null) return '—';
  return '₹' + Number(n).toLocaleString('en-IN');
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}

function isDormant(dateStr) {
  if (!dateStr) return true;
  const diff = Date.now() - new Date(dateStr).getTime();
  const months = diff / (1000 * 60 * 60 * 24 * 30);
  return months > 6;
}

/* ─── table cells ───────────────────────────────────── */

function TH({ children, right }) {
  return (
    <th style={{
      padding:'11px 18px', textAlign: right ? 'right' : 'left',
      fontSize:'11px', fontWeight:500, textTransform:'uppercase',
      letterSpacing:'0.07em', color:'#52525b', whiteSpace:'nowrap',
      borderBottom:'1px solid rgba(255,255,255,0.06)', background:'#111113',
    }}>
      {children}
    </th>
  );
}

function TD({ children, bold, muted, right, last }) {
  return (
    <td style={{
      padding:'12px 18px', textAlign: right ? 'right' : 'left',
      fontSize:'13px', fontWeight: bold ? 500 : 400,
      color: bold ? '#e4e4e7' : muted ? '#3f3f46' : '#71717a',
      whiteSpace:'nowrap',
      borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.05)',
    }}>
      {children}
    </td>
  );
}

/* ─── Customers ─────────────────────────────────────── */

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery]         = useState('');

  useEffect(() => {
    async function fetchCustomers() {
      setIsLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/customers?t=${Date.now()}`);
        setCustomers(res.data || []);
      } catch (err) {
        console.error('Failed to fetch customers:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCustomers();
  }, []);

  const filtered = customers.filter(c =>
    (c.name || '').toLowerCase().includes(query.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(query.toLowerCase())
  );

  /* ── KPI calculations ── */
  const totalCustomers = customers.length;
  const totalSpentAll  = customers.reduce((sum, c) => sum + Number(c.totalSpent || 0), 0);
  const avgOrderValue  = totalCustomers > 0
    ? fmt(Math.round(totalSpentAll / Math.max(customers.reduce((s, c) => s + (c.totalOrders || 0), 0), 1)))
    : '—';

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <div style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', paddingTop:'120px' }}>
        <div style={{ textAlign:'center' }}>
          <Loader2 size={32} style={{ color:'#52525b', animation:'spin 1s linear infinite' }} />
          <p style={{ fontSize:'13px', color:'#52525b', marginTop:'12px' }}>Loading customers…</p>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'24px' }}>
        <div>
          <h1 style={{ fontSize:'22px', fontWeight:600, color:'#f4f4f5', letterSpacing:'-0.02em', margin:0 }}>
            Customers
          </h1>
          <p style={{ fontSize:'13px', color:'#52525b', marginTop:'4px' }}>
            {totalCustomers.toLocaleString()} total · from database
          </p>
        </div>

        {/* Search */}
        <div style={{ position:'relative' }}>
          <Search size={13} style={{ position:'absolute', left:'11px', top:'50%', transform:'translateY(-50%)', color:'#52525b', pointerEvents:'none' }} />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              background:'#111113', border:'1px solid rgba(255,255,255,0.09)',
              borderRadius:'8px', padding:'8px 14px 8px 32px',
              fontSize:'13px', color:'#e4e4e7', outline:'none',
              width:'240px', fontFamily:'inherit',
            }}
            onFocus={e  => e.target.style.borderColor='rgba(74,222,128,0.30)'}
            onBlur={e   => e.target.style.borderColor='rgba(255,255,255,0.09)'}
          />
        </div>
      </div>

      {/* ── Summary stats ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:'12px', marginBottom:'20px' }}>
        {[
          { label:'Total customers', value: totalCustomers.toLocaleString() },
          { label:'Avg order value', value: avgOrderValue },
          { label:'Total revenue',   value: fmt(Math.round(totalSpentAll)) },
        ].map(k => (
          <div key={k.label} style={{ background:'#111113', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'10px', padding:'14px 18px' }}>
            <p style={{ fontSize:'11px', color:'#52525b', marginBottom:'6px' }}>{k.label}</p>
            <p style={{ fontSize:'20px', fontWeight:600, color:'#f4f4f5', letterSpacing:'-0.02em' }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* ── Table ── */}
      <div style={{ background:'#111113', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'12px', overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'680px' }}>
            <thead>
              <tr>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Phone</TH>
                <TH right>Orders</TH>
                <TH right>Total spent</TH>
                <TH>Last order</TH>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding:'32px', textAlign:'center', fontSize:'13px', color:'#52525b' }}>
                    {query ? `No customers match "${query}"` : 'No customers found'}
                  </td>
                </tr>
              ) : (
                filtered.map((c, i) => {
                  const last = i === filtered.length - 1;
                  const dormant = isDormant(c.lastOrderAt);
                  const lastOrderText = timeAgo(c.lastOrderAt);
                  return (
                    <tr
                      key={c.id}
                      style={{ transition:'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}
                    >
                      <td style={{ padding:'12px 18px', borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                          {/* Avatar initials */}
                          <div style={{
                            width:'28px', height:'28px', borderRadius:'50%', flexShrink:0,
                            background:'rgba(74,222,128,0.10)', border:'1px solid rgba(74,222,128,0.18)',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:'11px', fontWeight:600, color:'#4ade80',
                          }}>
                            {(c.name || '?').split(' ').map(w=>w[0]).join('').slice(0,2)}
                          </div>
                          <span style={{ fontSize:'13px', fontWeight:500, color:'#e4e4e7', whiteSpace:'nowrap' }}>
                            {c.name || '—'}
                          </span>
                        </div>
                      </td>
                      <TD last={last}>{c.email || '—'}</TD>
                      <TD last={last} muted>{c.phone || '—'}</TD>
                      <TD last={last} right bold>{c.totalOrders ?? '—'}</TD>
                      <TD last={last} right bold>{fmt(c.totalSpent)}</TD>
                      <td style={{
                        padding:'12px 18px', whiteSpace:'nowrap',
                        borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.05)',
                      }}>
                        <span style={{
                          fontSize:'12px', fontWeight:500,
                          color: dormant ? '#fbbf24' : '#71717a',
                        }}>
                          {lastOrderText}
                        </span>
                        {dormant && (
                          <span style={{
                            marginLeft:'8px', fontSize:'10px', fontWeight:500,
                            background:'rgba(251,191,36,0.10)', color:'#fbbf24',
                            border:'1px solid rgba(251,191,36,0.20)',
                            padding:'1px 7px', borderRadius:'999px',
                          }}>
                            dormant
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{
          borderTop:'1px solid rgba(255,255,255,0.06)',
          padding:'10px 18px',
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <span style={{ fontSize:'12px', color:'#3f3f46' }}>
            Showing {filtered.length} of {totalCustomers} customers
          </span>
          <span style={{ fontSize:'11px', color:'#3f3f46' }}>Live data from backend</span>
        </div>
      </div>

    </div>
  );
}
