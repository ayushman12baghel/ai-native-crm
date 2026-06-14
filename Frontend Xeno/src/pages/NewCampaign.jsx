import { useState } from 'react';
import { Wand2, Send, RotateCcw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api') + '/campaigns';

/* ─── sub-components ────────────────────────────────── */

function SectionLabel({ children }) {
  return (
    <p style={{ fontSize:'11px', fontWeight:600, color:'#52525b', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'10px' }}>
      {children}
    </p>
  );
}

function StatPill({ label, value }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'3px' }}>
      <span style={{ fontSize:'22px', fontWeight:700, color:'#f4f4f5', letterSpacing:'-0.03em', lineHeight:1 }}>
        {value}
      </span>
      <span style={{ fontSize:'11px', color:'#52525b' }}>{label}</span>
    </div>
  );
}

/* ─── NewCampaign ───────────────────────────────────── */

export default function NewCampaign() {
  const [prompt, setPrompt]           = useState('');
  const [isLoading, setIsLoading]     = useState(false);
  const [draft, setDraft]             = useState(null);      // parsed AI response
  const [channel, setChannel]         = useState('WHATSAPP');
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [launchStatus, setLaunchStatus] = useState('idle');   // idle | launching | success | error
  const [launchResult, setLaunchResult] = useState(null);     // backend response on launch
  const [error, setError]             = useState('');

  /* ── Step 1: Generate draft ── */
  async function handleGenerate(e) {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;
    setIsLoading(true);
    setDraft(null);
    setError('');

    try {
      const res = await axios.post(`${API_BASE}/draft`, { prompt: prompt.trim() });
      let rawText = res.data;
      if (typeof rawText === 'string') {
        rawText = rawText.replace(/```(?:json)?/gi, '').trim();
      }
      const data = typeof rawText === 'string' ? JSON.parse(rawText) : rawText;
      setDraft(data);
      setSelectedVariantIndex(0);
      setChannel(data.channel_type || data.channel || data.message_variants?.[0]?.channel || 'WHATSAPP');
    } catch (err) {
      console.error('Draft generation failed:', err);
      setError(err.response?.data?.error || err.message || 'Failed to generate draft. Is the backend running?');
    } finally {
      setIsLoading(false);
    }
  }

  /* ── Step 3: Discard ── */
  function handleDiscard() {
    setDraft(null);
    setSelectedVariantIndex(0);
    setLaunchStatus('idle');
    setLaunchResult(null);
    setError('');
    // keep prompt so user can re-edit
  }

  /* ── Full reset ── */
  function handleFullReset() {
    setPrompt('');
    setDraft(null);
    setSelectedVariantIndex(0);
    setIsLoading(false);
    setLaunchStatus('idle');
    setLaunchResult(null);
    setError('');
  }

  /* ── Step 4: Approve & Launch ── */
  async function handleLaunch() {
    if (!draft) return;
    setLaunchStatus('launching');
    setError('');

    try {
      const payload = {
        campaign_name:      draft.campaign_name,
        targeting_criteria: draft.targeting_criteria,
        targeting_value:    draft.targeting_value,
        channel_type:       channel,
        message_body:       draft.message_variants ? (draft.message_variants[selectedVariantIndex]?.body || draft.message_variants[selectedVariantIndex]?.text || draft.message_variants[selectedVariantIndex]?.message) : (draft.message_body || ''),
      };

      const res = await axios.post(`${API_BASE}/launch`, payload);
      setLaunchResult(res.data);
      setLaunchStatus('success');
    } catch (err) {
      console.error('Campaign launch failed:', err);
      setError(err.response?.data?.error || err.message || 'Launch failed');
      setLaunchStatus('error');
    }
  }

  /* ─────────────────────────────────────────────────────
     Render: Success State
     ───────────────────────────────────────────────────── */
  if (launchStatus === 'success') {
    return (
      <div style={{ width:'100%', maxWidth:'640px', margin:'0 auto', paddingTop:'48px', textAlign:'center' }}>
        <div style={{
          width:'56px', height:'56px', borderRadius:'50%',
          background:'rgba(74,222,128,0.12)', border:'1px solid rgba(74,222,128,0.25)',
          display:'flex', alignItems:'center', justifyContent:'center',
          margin:'0 auto 20px',
        }}>
          <CheckCircle2 size={28} style={{ color:'#4ade80' }} />
        </div>
        <h2 style={{ fontSize:'22px', fontWeight:600, color:'#f4f4f5', marginBottom:'8px' }}>
          Campaign Successfully Launched!
        </h2>
        <p style={{ fontSize:'13px', color:'#71717a', marginBottom:'8px', lineHeight:'1.6' }}>
          "{draft?.campaign_name}" is now being delivered.
        </p>
        {launchResult && (
          <div style={{
            display:'inline-flex', gap:'24px', justifyContent:'center',
            background:'#111113', border:'1px solid rgba(255,255,255,0.07)',
            borderRadius:'10px', padding:'16px 28px', marginBottom:'24px',
          }}>
            {launchResult.segment_size != null && (
              <StatPill value={launchResult.segment_size} label="customers targeted" />
            )}
            {launchResult.sent != null && (
              <StatPill value={launchResult.sent} label="messages sent" />
            )}
            {launchResult.failed != null && launchResult.failed > 0 && (
              <StatPill value={launchResult.failed} label="failed" />
            )}
          </div>
        )}
        <div>
          <button
            onClick={handleFullReset}
            style={{
              padding:'9px 22px', fontSize:'13px', fontWeight:500,
              background:'transparent', color:'#a1a1aa',
              border:'1px solid rgba(255,255,255,0.10)', borderRadius:'8px', cursor:'pointer',
              transition:'border-color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.25)'}
            onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.10)'}
          >
            Create another campaign
          </button>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────
     Render: Main Flow
     ───────────────────────────────────────────────────── */
  return (
    <div style={{ width:'100%', maxWidth:'720px', margin:'0 auto', padding:'24px' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom:'28px' }}>
        <h1 style={{ fontSize:'22px', fontWeight:600, color:'#f4f4f5', letterSpacing:'-0.02em', margin:0 }}>
          New campaign
        </h1>
        <p style={{ fontSize:'13px', color:'#52525b', marginTop:'4px' }}>
          Describe your goal — AI handles segmentation and copy
        </p>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{
          display:'flex', alignItems:'center', gap:'10px',
          background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.20)',
          borderRadius:'10px', padding:'12px 16px', marginBottom:'16px',
        }}>
          <AlertCircle size={16} style={{ color:'#ef4444', flexShrink:0 }} />
          <p style={{ fontSize:'13px', color:'#fca5a5', margin:0 }}>{error}</p>
        </div>
      )}

      {/* ── Prompt card (shown when no draft yet) ── */}
      {!draft && (
        <form onSubmit={handleGenerate} style={{
          background:'#111113',
          border:'1px solid rgba(255,255,255,0.07)',
          borderRadius:'12px',
          padding:'22px 24px',
          marginBottom:'16px',
        }}>
          <SectionLabel>What's the goal of this campaign?</SectionLabel>
          <p style={{ fontSize:'12px', color:'#52525b', marginBottom:'12px' }}>
            Write in plain English. The AI will find the right audience and draft your message.
          </p>

          <textarea
            rows={4}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            disabled={isLoading}
            placeholder="e.g. Find customers who bought winter gear last year but haven't purchased in 6 months. Offer them a 20% discount to come back."
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleGenerate(e);
              }
            }}
            style={{
              width:'100%',
              background:'#0d0d0f',
              border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:'8px',
              padding:'12px 14px',
              fontSize:'13px',
              color:'#e4e4e7',
              resize:'none',
              outline:'none',
              fontFamily:'inherit',
              lineHeight:'1.6',
              boxSizing:'border-box',
              opacity: isLoading ? 0.5 : 1,
            }}
            onFocus={e  => e.target.style.borderColor = 'rgba(74,222,128,0.35)'}
            onBlur={e   => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
          />

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'12px' }}>
            <span style={{ fontSize:'11px', color:'#3f3f46' }}>
              Powered by Gemini 2.5 Flash · tool calling · no raw SQL
            </span>
            <button
              type="submit"
              disabled={!prompt.trim() || isLoading}
              style={{
                display:'flex', alignItems:'center', gap:'7px',
                padding:'9px 18px',
                fontSize:'13px', fontWeight:500,
                background: (!prompt.trim() || isLoading) ? 'rgba(74,222,128,0.15)' : '#16a34a',
                color: (!prompt.trim() || isLoading) ? '#4ade80' : '#fff',
                border:'none', borderRadius:'8px',
                cursor: (!prompt.trim() || isLoading) ? 'default' : 'pointer',
                transition:'background 0.15s',
              }}
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              {isLoading ? 'Generating…' : 'Generate campaign'}
            </button>
          </div>
        </form>
      )}

      {/* ── Loading skeleton ── */}
      {isLoading && !draft && (
        <div style={{
          background:'#111113',
          border:'1px solid rgba(255,255,255,0.07)',
          borderRadius:'12px',
          padding:'24px',
        }}>
          {[80, 55, 95, 65].map((w, i) => (
            <div key={i} style={{
              height:'12px', borderRadius:'6px',
              background:'rgba(255,255,255,0.05)',
              width:`${w}%`,
              marginBottom: i < 3 ? '12px' : 0,
              animation:'pulse 1.4s ease-in-out infinite',
            }} />
          ))}
        </div>
      )}

      {/* ── Draft review card ── */}
      {draft && !isLoading && (
        <div style={{
          background:'#111113',
          border:'1px solid rgba(74,222,128,0.15)',
          borderRadius:'12px',
          padding:'22px 24px',
        }}>
          {/* AI badge */}
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'18px' }}>
            <div style={{
              width:'20px', height:'20px', borderRadius:'50%',
              background:'rgba(74,222,128,0.12)', border:'1px solid rgba(74,222,128,0.25)',
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span style={{ fontSize:'13px', fontWeight:500, color:'#a1a1aa' }}>
              AI generated — review before launching
            </span>
          </div>

          {/* Campaign name */}
          {draft.campaign_name && (
            <h3 style={{ fontSize:'18px', fontWeight:600, color:'#f4f4f5', marginBottom:'16px', letterSpacing:'-0.02em' }}>
              {draft.campaign_name}
            </h3>
          )}

          {/* Segment stats */}
          <div style={{
            display:'flex', gap:'32px', flexWrap:'wrap',
            paddingBottom:'18px', marginBottom:'18px',
            borderBottom:'1px solid rgba(255,255,255,0.06)',
          }}>
            {draft.segment_size != null && (
              <StatPill value={draft.segment_size} label="customers matched" />
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:'3px' }}>
              <select
                 value={channel}
                 onChange={e => setChannel(e.target.value)}
                 style={{
                   background:'#111113', border:'1px solid rgba(255,255,255,0.09)',
                   borderRadius:'6px', padding:'4px 28px 4px 10px',
                   fontSize:'14px', fontWeight:600, color:'#f4f4f5', 
                   outline:'none', cursor:'pointer', appearance:'none',
                   backgroundImage:`url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2371717a%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")`,
                   backgroundRepeat:'no-repeat', backgroundPosition:'right 8px center',
                 }}
               >
                 <option value="WHATSAPP">WHATSAPP</option>
                 <option value="EMAIL">EMAIL</option>
                 <option value="SMS">SMS</option>
               </select>
               <span style={{ fontSize:'11px', color:'#52525b', marginTop:'4px' }}>channel</span>
            </div>
          </div>

          {/* Targeting criteria */}
          {draft.targeting_criteria && (
            <div style={{ marginBottom:'16px' }}>
              <SectionLabel>Targeting criteria</SectionLabel>
              <p style={{ fontSize:'13px', color:'#71717a', background:'#0d0d0f', borderRadius:'6px', padding:'10px 12px', margin:0 }}>
                {draft.targeting_criteria}
                {draft.targeting_value && <span style={{ color:'#52525b' }}> — value: {draft.targeting_value}</span>}
              </p>
            </div>
          )}

          {/* Message body */}
          {draft.message_body && (
            <div style={{ marginBottom:'16px' }}>
              <SectionLabel>Message</SectionLabel>
              <div style={{
                background:'#0d0d0f',
                border:'1px solid rgba(255,255,255,0.06)',
                borderRadius:'8px',
                padding:'14px 16px',
              }}>
                <p style={{ fontSize:'13px', color:'#a1a1aa', lineHeight:'1.65', margin:0 }}>
                  {draft.message_body}
                </p>
              </div>
            </div>
          )}

          {/* Message variants (if the AI returns an array) */}
          {draft.message_variants && draft.message_variants.length > 0 && (
            <div style={{ marginBottom:'20px' }}>
              <SectionLabel>Select and edit your message variant</SectionLabel>
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {draft.message_variants.map((v, i) => (
                  <div 
                    key={i} 
                    onClick={() => setSelectedVariantIndex(i)}
                    style={{
                      background: selectedVariantIndex === i ? 'rgba(74,222,128,0.06)' : '#0d0d0f',
                      border: selectedVariantIndex === i ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(255,255,255,0.06)',
                      borderRadius:'8px',
                      padding:'14px 16px',
                      cursor:'pointer',
                      transition:'all 0.15s ease',
                    }}
                  >
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                      <p style={{ 
                        fontSize:'11px', fontWeight:600, margin:0,
                        color: selectedVariantIndex === i ? '#4ade80' : '#52525b', 
                        textTransform:'uppercase', letterSpacing:'0.06em' 
                      }}>
                        {v.label || v.variant || `Variant ${i + 1}`}
                      </p>
                      {selectedVariantIndex === i && (
                        <span style={{ fontSize:'11px', color:'#4ade80', fontWeight:500 }}>
                          Selected
                        </span>
                      )}
                    </div>
                    <textarea
                      value={v.body || v.text || v.message || ''}
                      onChange={e => {
                        const newVariants = [...draft.message_variants];
                        newVariants[i] = { ...v, body: e.target.value };
                        setDraft({ ...draft, message_variants: newVariants });
                      }}
                      style={{
                        width:'100%',
                        background:'transparent',
                        border:'none',
                        color: selectedVariantIndex === i ? '#e4e4e7' : '#a1a1aa',
                        fontSize:'13px',
                        lineHeight:'1.65',
                        resize:'vertical',
                        outline:'none',
                        fontFamily:'inherit',
                        minHeight:'80px',
                        padding: 0,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end' }}>
            <button
              onClick={handleDiscard}
              disabled={launchStatus === 'launching'}
              style={{
                display:'flex', alignItems:'center', gap:'6px',
                padding:'8px 16px', fontSize:'13px', fontWeight:500,
                background:'transparent', color:'#71717a',
                border:'1px solid rgba(255,255,255,0.09)', borderRadius:'8px',
                cursor: launchStatus === 'launching' ? 'default' : 'pointer',
                opacity: launchStatus === 'launching' ? 0.5 : 1,
              }}
            >
              <RotateCcw size={13} />
              Discard
            </button>
            <button
              onClick={handleLaunch}
              disabled={launchStatus === 'launching'}
              style={{
                display:'flex', alignItems:'center', gap:'7px',
                padding:'8px 18px', fontSize:'13px', fontWeight:500,
                background: launchStatus === 'launching' ? 'rgba(22,163,74,0.7)' : '#16a34a',
                color:'#fff',
                border:'none', borderRadius:'8px',
                cursor: launchStatus === 'launching' ? 'default' : 'pointer',
                transition:'background 0.15s',
              }}
            >
              {launchStatus === 'launching'
                ? <Loader2 size={14} className="animate-spin" />
                : <Send size={13} />
              }
              {launchStatus === 'launching' ? 'Launching…' : 'Approve & launch'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.9; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
