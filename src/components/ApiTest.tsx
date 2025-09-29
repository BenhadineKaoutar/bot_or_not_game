import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

const ApiTest: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [healthData, setHealthData] = useState<any>(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        const health = await apiService.healthCheck();
        setStatus('success');
        setMessage(`✅ Backend connected! ${health.message || 'API is running'}`);
        setHealthData(health);
        console.log('Health check response:', health);
      } catch (error: any) {
        setStatus('error');
        setMessage(`❌ Backend connection failed: ${error.message}`);
        console.error('Health check error:', error);
      }
    };

    testConnection();
  }, []);

  return (
    <div style={{ 
      padding: '1rem', 
      margin: '1rem', 
      border: '1px solid #ccc', 
      borderRadius: '8px',
      backgroundColor: status === 'success' ? '#d4edda' : status === 'error' ? '#f8d7da' : '#fff3cd'
    }}>
      <h3>Backend API Connection Test</h3>
      <p>{status === 'loading' ? '🔄 Testing connection...' : message}</p>
      {status === 'success' && (
        <div>
          <p><strong>Backend URL:</strong> http://localhost:3001/api</p>
          {healthData?.stats && (
            <div>
              <p><strong>Database Stats:</strong></p>
              <ul style={{ textAlign: 'left', fontSize: '0.9rem' }}>
                <li>Images: {healthData.stats.totalImages}</li>
                <li>Pairs: {healthData.stats.totalPairs}</li>
                <li>Sessions: {healthData.stats.totalSessions}</li>
                <li>Active Pairs: {healthData.stats.activePairs}</li>
              </ul>
            </div>
          )}
          {healthData?.timestamp && (
            <p style={{ fontSize: '0.8rem', color: '#666' }}>
              Last checked: {new Date(healthData.timestamp).toLocaleTimeString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ApiTest;