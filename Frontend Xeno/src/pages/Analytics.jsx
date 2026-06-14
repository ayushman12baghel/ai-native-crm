import { useState, useEffect } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

/* ─── helpers ───────────────────────────────────────── */

function fmt(n)     { return (n || 0).toLocaleString('en-IN'); }
function pct(a, b)  { return b ? Math.round(((a || 0)/(b || 1))*100) + '%' : '—'; }
function rupee(n)   { return n ? '₹' + fmt(n) : '—'; }

const statusStyle = {
  Completed: { bg:'rgba(74,222,128,0.10)',  color:'#4ade80', border:'rgba(74,222,128,0.20)' },
  Sending:   { bg:'rgba(251,191,36,0.10)',  color:'#fbbf24', border:'rgba(251,191,36,0.20)' },
  Draft:     { bg:'rgba(113,113,122,0.15)', color:'#a1a1aa', border:'rgba(113,113,122,0.25)' },
};

function getCampaignStatus(c) {
  if (!c.audienceSize || c.audienceSize === 0) return 'Draft';
  if (c.sentCount > 0 && c.sentCount >= c.audienceSize) return 'Completed';
  if (c.sentCount > 0) return 'Sending';
  return 'Draft';
}

function Badge({ s }) {
  const st = statusStyle[s] ?? statusStyle.Draft;
  return (
    <span style={{ display:'inline-block', padding:'2px 10px', borderRadius:'999px',
      fontSize:'11px', fontWeight:500, background:st.bg, color:st.color,
      border:`1px solid ${st.border}` }}>
      {s}
    </span>
  );
}

/* ─── funnel bar ────────────────────────────────────── */

function FunnelRow({ label, value, total, color, hide }) {
  if (hide) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0',
      borderBottom:'1px solid rgba(255,255,255,0.05)', opacity:0.3 }}>
      <span style={{ fontSize:'12px', color:'#52525b', display:'flex', alignItems:'center', gap:'8px' }}>
        <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:color, display:'inline-block', flexShrink:0 }} />
        {label}
      </span>
      <span style={{ fontSize:'12px', color:'#3f3f46' }}>N/A</span>
    </div>
  );
  const safeVal = value || 0;
  const safeTot = total || 0;
  const ratio = safeTot ? (safeVal / safeTot) : 0;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'7px 0',
      borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize:'12px', color:'#71717a', display:'flex', alignItems:'center', gap:'8px', minWidth:'84px' }}>
        <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:color, display:'inline-block', flexShrink:0 }} />
        {label}
      </span>
      <div style={{ flex:1, height:'5px', background:'rgba(255,255,255,0.06)', borderRadius:'3px' }}>
        <div style={{ height:'5px', borderRadius:'3px', background:color, width:`${Math.round(ratio*100)}%`, transition:'width 0.5s' }} />
      </div>
      <span style={{ fontSize:'12px', fontWeight:500, color:'#e4e4e7', minWidth:'28px', textAlign:'right' }}>{fmt(safeVal)}</span>
      <span style={{ fontSize:'11px', color:'#52525b', minWidth:'36px', textAlign:'right' }}>{pct(safeVal, safeTot)}</span>
    </div>
  );
}

/* ─── status chip strip ─────────────────────────────── */

const statusChips = [
  { key:'sentCount',      label:'SENT',      color:'#7c3aed' },
  { key:'deliveredCount', label:'DELIVERED', color:'#16a34a' },
  { key:'opened',         label:'OPENED',    color:'#2563eb' },
  { key:'read',           label:'READ',      color:'#0891b2' },
  { key:'clicked',        label:'CLICKED',   color:'#d97706' },
  { key:'failedCount',    label:'FAILED',    color:'#dc2626' },
  { key:'converted',      label:'CONVERTED', color:'#ca8a04' },
];

/* ─── Analytics ─────────────────────────────────────── */

export default function Analytics() {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCampaigns() {
      setIsLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/campaigns?t=${Date.now()}`);
        const data = res.data || [];
        setCampaigns(data);
        if (data.length > 0) {
          setSelectedId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch campaigns for analytics:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCampaigns();
  }, []);

  if (isLoading) {
    return (
      <div style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', paddingTop:'120px' }}>
        <div style={{ textAlign:'center' }}>
          <Loader2 size={32} style={{ color:'#52525b', animation:'spin 1s linear infinite' }} />
          <p style={{ fontSize:'13px', color:'#52525b', marginTop:'12px' }}>Loading analytics…</p>
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

  if (campaigns.length === 0) {
    return (
      <div style={{ width:'100%', textAlign:'center', paddingTop:'120px' }}>
        <p style={{ fontSize:'14px', color:'#52525b' }}>No campaigns found. Create one to view analytics.</p>
      </div>
    );
  }

  const c = campaigns.find(x => x.id === selectedId) || campaigns[0];
  const isWA  = c.channel === 'WhatsApp';
  const isSMS = c.channel === 'SMS';
  const status = getCampaignStatus(c);

  // Safely fallback metrics not yet in backend
  const sent = c.sentCount || 0;
  const delivered = c.deliveredCount || 0;
  const opened = c.opened || 0;
  const read = c.read || 0;
  const clicked = c.clicked || 0;
  const failed = c.failedCount || 0;
  const converted = c.converted || 0;
  const revenue = c.revenue || 0;
  const audience = c.audienceSize || 0;

  return (
    <div style={{ width: '100%' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom:'24px' }}>
        <h1 style={{ fontSize:'22px', fontWeight:600, color:'#f4f4f5', letterSpacing:'-0.02em', margin:0 }}>
          Analytics
        </h1>
        <p style={{ fontSize:'13px', color:'#52525b', marginTop:'4px' }}>
          Campaign delivery &amp; attributed revenue
        </p>
      </div>

      {/* ── Campaign selector ── */}
      <div style={{ position:'relative', display:'inline-block', marginBottom:'24px' }}>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          style={{
            appearance:'none', WebkitAppearance:'none',
            background:'#111113', border:'1px solid rgba(255,255,255,0.09)',
            borderRadius:'8px', padding:'9px 40px 9px 14px',
            fontSize:'13px', fontWeight:500, color:'#e4e4e7', cursor:'pointer', outline:'none',
          }}
        >
          {campaigns.map(x => <option key={x.id} value={x.id}>{x.name || `Campaign #${x.id}`}</option>)}
        </select>
        <ChevronDown size={14} style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', color:'#52525b', pointerEvents:'none' }} />
      </div>

      {/* ── Top meta row ── */}
      <div style={{
        display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap',
        marginBottom:'20px',
      }}>
        <span style={{ fontSize:'13px', color:'#71717a' }}>{c.channel || '—'} · {fmt(audience)} recipients</span>
        <Badge s={status} />
      </div>

      {/* ── KPI strip ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:'12px', marginBottom:'20px' }}>
        {[
          { label:'Sent',        value: fmt(sent)      },
          { label:'Delivered',   value: fmt(delivered) + ' · ' + pct(delivered, sent) },
          { label: isWA ? 'Read' : isSMS ? 'Delivered' : 'Opened',
            value: isWA ? fmt(read) + ' · ' + pct(read, delivered)
                        : isSMS ? '—'
                        : fmt(opened) + ' · ' + pct(opened, delivered) },
          { label:'Conversions', value: converted ? fmt(converted) + ' · ' + pct(converted, sent) : '—' },
        ].map(k => (
          <div key={k.label} style={{ background:'#111113', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'10px', padding:'16px 18px' }}>
            <p style={{ fontSize:'11px', color:'#52525b', marginBottom:'8px' }}>{k.label}</p>
            <p style={{ fontSize:'17px', fontWeight:600, color:'#f4f4f5', letterSpacing:'-0.02em' }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* ── Two-col detail ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px', marginBottom:'14px' }}>

        {/* Funnel */}
        <div style={{ background:'#111113', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'12px', padding:'18px 20px' }}>
          <p style={{ fontSize:'13px', fontWeight:500, color:'#f4f4f5', marginBottom:'14px' }}>Delivery funnel</p>
          <FunnelRow label="Sent"      value={sent}      total={sent}      color="#7c3aed" />
          <FunnelRow label="Delivered" value={delivered} total={sent}      color="#16a34a" />
          <FunnelRow label="Opened"    value={opened}    total={delivered} color="#2563eb" hide={isWA || isSMS} />
          <FunnelRow label="Read"      value={read}      total={delivered} color="#0891b2" hide={!isWA} />
          <FunnelRow label="Clicked"   value={clicked}   total={delivered} color="#d97706" hide={isSMS || isWA} />
          <FunnelRow label="Failed"    value={failed}    total={sent}      color="#dc2626" />
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:'7px' }}>
            <span style={{ fontSize:'12px', color:'#71717a', display:'flex', alignItems:'center', gap:'8px' }}>
              <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#ca8a04', display:'inline-block' }} />
              Converted
            </span>
            <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
              <span style={{ fontSize:'12px', fontWeight:500, color:'#e4e4e7' }}>{converted || '—'}</span>
              <span style={{ fontSize:'11px', color:'#52525b' }}>{converted ? pct(converted, sent) : ''}</span>
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div style={{ background:'#111113', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'12px', padding:'18px 20px' }}>
          <p style={{ fontSize:'13px', fontWeight:500, color:'#f4f4f5', marginBottom:'6px' }}>Attributed revenue</p>
          <p style={{ fontSize:'32px', fontWeight:700, color:'#f4f4f5', letterSpacing:'-0.03em', lineHeight:1, margin:'10px 0 4px' }}>
            {rupee(revenue)}
          </p>
          <p style={{ fontSize:'12px', color:'#52525b', marginBottom:'20px' }}>
            {converted ? `From ${converted} orders placed within 7 days of delivery` : 'No conversions attributed yet'}
          </p>

          <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:'14px' }}>
            <p style={{ fontSize:'11px', fontWeight:600, color:'#3f3f46', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'8px' }}>
              Attribution query
            </p>
            <pre style={{
              fontFamily:'ui-monospace, monospace', fontSize:'11px',
              background:'#0d0d0f', borderRadius:'6px', padding:'10px 12px',
              color:'#52525b', lineHeight:'1.7', margin:0, overflowX:'auto',
              border:'1px solid rgba(255,255,255,0.05)',
            }}>
{`SELECT SUM(o.order_value)
FROM orders o
JOIN communications c
  ON o.id = c.attributed_order_id
WHERE c.campaign_id = ?`}
            </pre>
          </div>
        </div>
      </div>

      {/* ── Status breakdown strip ── */}
      <div style={{ background:'#111113', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'12px', padding:'18px 20px' }}>
        <p style={{ fontSize:'13px', fontWeight:500, color:'#f4f4f5', marginBottom:'14px' }}>Communication status breakdown</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,minmax(0,1fr))', gap:'8px' }}>
          {statusChips.map(({ key, label, color }) => {
            const val = c[key] || 0; // fallback to 0
            const applicable = !(
              (key === 'opened'  && (isWA || isSMS)) ||
              (key === 'read'    && !isWA) ||
              (key === 'clicked' && (isWA || isSMS))
            );
            return (
              <div key={key} style={{
                textAlign:'center', padding:'12px 6px',
                borderRadius:'8px',
                background: applicable ? `${color}14` : 'rgba(255,255,255,0.02)',
                border:`1px solid ${applicable ? color + '28' : 'rgba(255,255,255,0.04)'}`,
              }}>
                <div style={{ fontSize:'16px', fontWeight:600, color: applicable ? '#f4f4f5' : '#3f3f46' }}>
                  {applicable ? fmt(val) : '—'}
                </div>
                <div style={{ fontSize:'9px', fontWeight:600, color: applicable ? color : '#3f3f46',
                  textTransform:'uppercase', letterSpacing:'0.06em', marginTop:'4px' }}>
                  {label}
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize:'11px', color:'#3f3f46', marginTop:'10px' }}>
          {c.channel} channel ·&nbsp;
          {isWA  && 'OPENED/CLICKED not tracked · READ = WhatsApp read receipt'}
          {isSMS && 'OPENED/READ/CLICKED not tracked (SMS has no engagement callbacks)'}
          {!isWA && !isSMS && 'READ not tracked · OPENED and CLICKED tracked via email pixel'}
        </p>
      </div>

    </div>
  );
}
