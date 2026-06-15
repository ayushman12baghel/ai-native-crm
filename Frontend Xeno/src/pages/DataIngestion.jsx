import React, { useState } from 'react';
import Layout from '../components/Layout';
import ManualEntryForm from '../components/ManualEntryForm';
import CsvUploader from '../components/CsvUploader';

export default function DataIngestion() {
  const [activeTab, setActiveTab] = useState('csv');

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#f4f4f5', letterSpacing: '-0.02em', margin: 0 }}>
          Data Ingestion
        </h1>
        <p style={{ fontSize: '13px', color: '#a1a1aa', marginTop: '4px' }}>
          Import customers and their historical order data into your CRM.
        </p>
      </div>

      <div style={{
        display: 'inline-flex',
        background: '#111113',
        padding: '4px',
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.07)',
        marginBottom: '24px'
      }}>
        <button
          onClick={() => setActiveTab('csv')}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 500,
            borderRadius: '6px',
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'csv' ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: activeTab === 'csv' ? '#f4f4f5' : '#71717a',
            transition: 'all 0.2s ease',
          }}
        >
          Bulk CSV Upload
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 500,
            borderRadius: '6px',
            cursor: 'pointer',
            border: 'none',
            background: activeTab === 'manual' ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: activeTab === 'manual' ? '#f4f4f5' : '#71717a',
            transition: 'all 0.2s ease',
          }}
        >
          Manual Entry
        </button>
      </div>

      <div>
        {activeTab === 'csv' ? <CsvUploader /> : <ManualEntryForm />}
      </div>
    </div>
  );
}
