import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, X } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

/* ─── status badge ──────────────────────────────────── */

const badgeMap = {
  Completed: { bg: 'rgba(74,222,128,0.10)', color: '#4ade80', border: 'rgba(74,222,128,0.20)' },
  Sending:   { bg: 'rgba(251,191,36,0.10)', color: '#fbbf24', border: 'rgba(251,191,36,0.20)' },
  Draft:     { bg: 'rgba(113,113,122,0.15)',color: '#a1a1aa', border: 'rgba(113,113,122,0.25)' },
};

function Badge({ status }) {
  const s = badgeMap[status] ?? badgeMap.Draft;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 500,
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  );
}

/* ─── table header cell ─────────────────────────────── */

function TH({ children }) {
  return (
    <th style={{
      padding: '12px 20px',
      textAlign: 'left',
      fontSize: '11px',
      fontWeight: 500,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      color: '#52525b',
      whiteSpace: 'nowrap',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      {children}
    </th>
  );
}

/* ─── table data cell ───────────────────────────────── */

function TD({ children, bold, last }) {
  return (
    <td style={{
      padding: '13px 20px',
      fontSize: '13px',
      fontWeight: bold ? 500 : 400,
      color: bold ? '#e4e4e7' : '#71717a',
      whiteSpace: 'nowrap',
      borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.05)',
    }}>
      {children}
    </td>
  );
}

/* ─── derive campaign status ────────────────────────── */

function getCampaignStatus(c) {
  if (!c.audienceSize || c.audienceSize === 0) return 'Draft';
  if (c.sentCount > 0 && c.sentCount >= c.audienceSize) return 'Completed';
  if (c.sentCount > 0) return 'Sending';
  return 'Draft';
}

/* ─── format relative time ──────────────────────────── */

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
  return new Date(dateStr).toLocaleDateString();
}

/* ─── Dashboard ─────────────────────────────────────── */

export default function Dashboard() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns]   = useState([]);
  const [customers, setCustomers]   = useState([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [campRes, custRes] = await Promise.all([
          axios.get(`${API_BASE}/campaigns?t=${Date.now()}`),
          axios.get(`${API_BASE}/customers?t=${Date.now()}`),
        ]);
        setCampaigns(campRes.data || []);
        setCustomers(custRes.data || []);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  /* ── KPI calculations ── */
  const totalCustomers = customers.length;
  const campaignsSent  = campaigns.length;
  const totalAudience  = campaigns.reduce((sum, c) => sum + (c.audienceSize || 0), 0);
  const totalDelivered = campaigns.reduce((sum, c) => sum + (c.deliveredCount || 0), 0);
  const deliveryRate   = totalAudience > 0
    ? `${Math.round((totalDelivered / totalAudience) * 100)}%`
    : '—';

  const kpis = [
    { label: 'Total customers',    value: isLoading ? '—' : totalCustomers.toLocaleString(), sub: 'from database',         green: false },
    { label: 'Campaigns sent',     value: isLoading ? '—' : String(campaignsSent),           sub: 'all time',              green: false },
    { label: 'Avg delivery rate',  value: isLoading ? '—' : deliveryRate,                    sub: 'across all campaigns',  green: true  },
    { label: 'Total audience',     value: isLoading ? '—' : totalAudience.toLocaleString(),  sub: 'customers targeted',    green: false },
  ];

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <div style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', paddingTop:'120px' }}>
        <div style={{ textAlign:'center' }}>
          <Loader2 size={32} style={{ color:'#52525b', animation:'spin 1s linear infinite' }} />
          <p style={{ fontSize:'13px', color:'#52525b', marginTop:'12px' }}>Loading dashboard…</p>
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
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'28px' }}>
        <div>
          <h1 style={{ fontSize:'22px', fontWeight:600, color:'#f4f4f5', letterSpacing:'-0.02em', margin:0 }}>
            Overview
          </h1>
          <p style={{ fontSize:'13px', color:'#52525b', marginTop:'4px' }}>Live data from backend</p>
        </div>
        <button
          onClick={() => navigate('/new-campaign')}
          style={{
            display:'flex', alignItems:'center', gap:'6px',
            padding:'8px 16px',
            fontSize:'13px', fontWeight:500,
            color:'#a1a1aa',
            background:'transparent',
            border:'1px solid rgba(255,255,255,0.10)',
            borderRadius:'8px',
            cursor:'pointer',
            transition:'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.22)'; e.currentTarget.style.color='#f4f4f5'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.10)'; e.currentTarget.style.color='#a1a1aa'; }}
        >
          <Plus size={14} />
          New campaign
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(4, minmax(0,1fr))',
        gap:'14px',
        marginBottom:'32px',
      }}>
        {kpis.map(k => (
          <div key={k.label} style={{
            background:'#111113',
            border:'1px solid rgba(255,255,255,0.07)',
            borderRadius:'12px',
            padding:'20px 22px',
          }}>
            <p style={{ fontSize:'11px', fontWeight:500, color:'#52525b', marginBottom:'12px', textTransform:'none', letterSpacing:'0' }}>
              {k.label}
            </p>
            <p style={{ fontSize:'30px', fontWeight:700, color:'#f4f4f5', letterSpacing:'-0.03em', lineHeight:1, marginBottom:'8px' }}>
              {k.value}
            </p>
            <p style={{ fontSize:'12px', fontWeight:500, color: k.green ? '#4ade80' : '#52525b' }}>
              {k.sub}
            </p>
          </div>
        ))}
      </div>

      {/* ── Recent Campaigns ── */}
      <div>
        <h2 style={{ fontSize:'14px', fontWeight:600, color:'#f4f4f5', marginBottom:'12px', letterSpacing:'-0.01em' }}>
          Recent campaigns
        </h2>

        <div style={{
          background:'#111113',
          border:'1px solid rgba(255,255,255,0.07)',
          borderRadius:'12px',
          overflow:'hidden',
        }}>
          {campaigns.length === 0 ? (
            <div style={{ padding:'40px 20px', textAlign:'center' }}>
              <p style={{ fontSize:'13px', color:'#52525b' }}>No campaigns yet. Create one to get started!</p>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'700px' }}>
                <thead>
                  <tr>
                    <TH>Campaign</TH>
                    <TH>Channel</TH>
                    <TH>Audience</TH>
                    <TH>Delivered</TH>
                    <TH>Failed</TH>
                    <TH>Created</TH>
                    <TH>Status</TH>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c, i) => {
                    const last = i === campaigns.length - 1;
                    const status = getCampaignStatus(c);
                    return (
                      <tr
                        key={c.id}
                        className="cursor-pointer hover:bg-zinc-800/40 transition-colors"
                        onClick={() => setSelectedCampaign(c)}
                      >
                        <TD bold last={last}>{c.name || '—'}</TD>
                        <TD last={last}>{c.channel || '—'}</TD>
                        <TD last={last}>
                          {c.audienceSize ?? '—'}{' '}
                          <span style={{ color:'#3f3f46' }}>customers</span>
                        </TD>
                        <TD last={last}>{c.deliveredCount ?? '—'}</TD>
                        <TD last={last}>{c.failedCount ?? '—'}</TD>
                        <TD last={last}>{timeAgo(c.createdAt)}</TD>
                        <td style={{
                          padding:'13px 20px',
                          whiteSpace:'nowrap',
                          borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.05)',
                        }}>
                          <Badge status={status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-[#121214] border border-zinc-800/60 rounded-xl w-full max-w-2xl p-6 shadow-2xl relative">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-semibold text-zinc-100 mb-2">
                  {selectedCampaign.name || 'Unnamed Campaign'}
                </h2>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-800/50 text-zinc-300 border border-zinc-700/50 uppercase tracking-wider">
                  {selectedCampaign.channel || 'EMAIL'}
                </span>
              </div>
              <button
                onClick={() => setSelectedCampaign(null)}
                className="text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div>
              <h3 className="text-sm font-medium text-zinc-400 mb-2">Message Copy</h3>
              <div className="bg-[#09090B] border border-zinc-800/60 p-4 rounded-lg text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                {selectedCampaign.messageBody || selectedCampaign.message_body || 'No message copy available for this campaign.'}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
