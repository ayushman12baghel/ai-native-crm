import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Trash2, Download } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://ai-native-crm-production.up.railway.app/api';

export default function CsvUploader() {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [errors, setErrors] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({ loading: false, type: '', message: '' });
  const fileInputRef = useRef(null);

  const expectedHeaders = ['Name', 'Email', 'Phone', 'Total Spend'];

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/csv') {
      processFile(droppedFile);
    } else {
      setUploadStatus({ type: 'error', message: 'Please upload a valid CSV file.' });
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (file) => {
    setFile(file);
    setUploadStatus({ loading: false, type: '', message: '' });
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        validateData(results.data, results.meta.fields);
      },
      error: (err) => {
        setUploadStatus({ type: 'error', message: `Error parsing CSV: ${err.message}` });
      }
    });
  };

  const validateData = (data, headers) => {
    // Check headers
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      setUploadStatus({ 
        type: 'error', 
        message: `Missing required columns: ${missingHeaders.join(', ')}` 
      });
      setFile(null);
      return;
    }

    let validRows = [];
    let rowErrors = [];

    data.forEach((row, index) => {
      const rowNum = index + 2; // +1 for 0-index, +1 for header row
      
      if (!row['Name'] || row['Name'].trim() === '') {
        rowErrors.push(`Row ${rowNum}: Name is required`);
        return; // skip this row
      }

      let orderValue = null;
      if (row['Total Spend']) {
        orderValue = parseFloat(row['Total Spend']);
        if (isNaN(orderValue) || orderValue < 0) {
          rowErrors.push(`Row ${rowNum}: Total Spend must be a positive number`);
          return;
        }
      }

      validRows.push({
        name: row['Name'].trim(),
        email: row['Email'] ? row['Email'].trim() : null,
        phone: row['Phone'] ? row['Phone'].trim() : null,
        initialOrderValue: orderValue
      });
    });

    setParsedData(validRows);
    setErrors(rowErrors);
  };

  const handleUpload = async () => {
    if (parsedData.length === 0) return;

    setUploadStatus({ loading: true, type: '', message: '' });

    try {
      const response = await fetch(`${API_BASE}/customers/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customers: parsedData })
      });

      const data = await response.json();

      if (response.ok) {
        setUploadStatus({ 
          type: 'success', 
          message: `Successfully uploaded ${data.count} customers!` 
        });
        // Reset
        setFile(null);
        setParsedData([]);
        setErrors([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setUploadStatus({ type: 'error', message: data.error || 'Failed to upload customers' });
      }
    } catch (err) {
      setUploadStatus({ type: 'error', message: 'Network error. Could not reach server.' });
    } finally {
      setUploadStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const downloadTemplate = () => {
    const csvContent = "Name,Email,Phone,Total Spend\nJohn Doe,john@example.com,+1234567890,150.50\nJane Smith,jane@example.com,,0\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "crm_customer_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetFile = () => {
    setFile(null);
    setParsedData([]);
    setErrors([]);
    setUploadStatus({ loading: false, type: '', message: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
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
        background: '#161618',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#f4f4f5', display: 'flex', alignItems: 'center', margin: 0 }}>
            <UploadCloud size={20} style={{ marginRight: '8px', color: '#818cf8' }} />
            Bulk CSV Upload
          </h3>
          <p style={{ fontSize: '13px', color: '#a1a1aa', marginTop: '4px' }}>Upload multiple customers at once.</p>
        </div>
        <button 
          onClick={downloadTemplate}
          style={{
            fontSize: '13px', fontWeight: 500, color: '#818cf8', display: 'flex', alignItems: 'center',
            background: 'rgba(79,70,229,0.1)', padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer'
          }}
        >
          <Download size={14} style={{ marginRight: '6px' }} />
          Download Template
        </button>
      </div>

      <div style={{ padding: '24px' }}>
        {uploadStatus.message && (
          <div style={{
            marginBottom: '24px', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'flex-start',
            background: uploadStatus.type === 'success' ? 'rgba(74,222,128,0.1)' : 'rgba(244,63,94,0.1)',
            color: uploadStatus.type === 'success' ? '#4ade80' : '#f43f5e',
            border: `1px solid ${uploadStatus.type === 'success' ? 'rgba(74,222,128,0.2)' : 'rgba(244,63,94,0.2)'}`
          }}>
            {uploadStatus.type === 'success' ? (
              <CheckCircle size={20} style={{ marginRight: '12px', marginTop: '2px', flexShrink: 0, color: '#4ade80' }} />
            ) : (
              <AlertCircle size={20} style={{ marginRight: '12px', marginTop: '2px', flexShrink: 0, color: '#f43f5e' }} />
            )}
            <p style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>{uploadStatus.message}</p>
          </div>
        )}

        {!file ? (
          <div 
            style={{
              border: `2px dashed ${isDragging ? '#6366f1' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: '12px',
              padding: '40px',
              textAlign: 'center',
              background: isDragging ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.02)',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            onClick={() => fileInputRef.current.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              accept=".csv" 
              style={{ display: 'none' }} 
              ref={fileInputRef}
              onChange={handleFileSelect}
            />
            <FileText size={48} style={{ margin: '0 auto 16px', color: isDragging ? '#818cf8' : '#71717a' }} />
            <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#e4e4e7', marginBottom: '4px' }}>Drag and drop your CSV here</h4>
            <p style={{ fontSize: '14px', color: '#a1a1aa', marginBottom: '16px' }}>or click to browse from your computer</p>
            <button 
              onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}
              style={{
                padding: '8px 16px', background: '#27272a', border: '1px solid #3f3f46',
                borderRadius: '8px', fontSize: '14px', fontWeight: 500, color: '#e4e4e7', cursor: 'pointer'
              }}
            >
              Browse Files
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <FileText size={32} style={{ color: '#818cf8', marginRight: '12px' }} />
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#e4e4e7', margin: 0 }}>{file.name}</p>
                  <p style={{ fontSize: '12px', color: '#a1a1aa', margin: 0 }}>{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button 
                onClick={resetFile}
                style={{
                  padding: '8px', color: '#71717a', background: 'transparent', border: 'none',
                  cursor: 'pointer', borderRadius: '6px'
                }}
              >
                <Trash2 size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '8px', padding: '16px' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Valid Rows</p>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#4ade80', margin: 0 }}>{parsedData.length}</p>
              </div>
              <div style={{ 
                background: errors.length > 0 ? 'rgba(244,63,94,0.05)' : 'rgba(255,255,255,0.02)', 
                border: `1px solid ${errors.length > 0 ? 'rgba(244,63,94,0.2)' : 'rgba(255,255,255,0.07)'}`, 
                borderRadius: '8px', padding: '16px' 
              }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: errors.length > 0 ? '#f43f5e' : '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Errors</p>
                <p style={{ fontSize: '24px', fontWeight: 700, color: errors.length > 0 ? '#f43f5e' : '#e4e4e7', margin: 0 }}>{errors.length}</p>
              </div>
            </div>

            {errors.length > 0 && (
              <div style={{
                background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)',
                borderRadius: '8px', padding: '16px', maxHeight: '192px', overflowY: 'auto'
              }}>
                <h5 style={{ fontSize: '14px', fontWeight: 600, color: '#fb7185', marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                  <AlertCircle size={16} style={{ marginRight: '6px' }} />
                  Fix these errors before uploading:
                </h5>
                <ul style={{ fontSize: '12px', color: '#fda4af', paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}

            <div style={{ paddingTop: '8px' }}>
              <button
                onClick={handleUpload}
                disabled={uploadStatus.loading || parsedData.length === 0}
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
                  cursor: (uploadStatus.loading || parsedData.length === 0) ? 'not-allowed' : 'pointer',
                  opacity: (uploadStatus.loading || parsedData.length === 0) ? 0.5 : 1,
                  transition: 'background 0.2s',
                }}
              >
                {uploadStatus.loading ? 'Uploading...' : `Approve & Upload ${parsedData.length} Customers`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
