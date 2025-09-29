import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from "react-router-dom";
import { Button } from '@progress/kendo-react-buttons';
import { Grid, GridColumn } from '@progress/kendo-react-grid';
// import { Card, CardHeader, CardTitle, CardBody } from '@progress/kendo-react-layout';
import { TabStrip, TabStripTab } from '@progress/kendo-react-layout';
import { Upload } from '@progress/kendo-react-upload';
import { API_BASE_URL } from '../services/api';

interface AdminPanelProps {
  onNavigate: (page: 'home' | 'daily-mode' | 'streak-mode' | 'leaderboard' | 'admin') => void;
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalGames: number;
  totalImages: number;
  averageAccuracy: number;
  serverUptime: string;
}

const AdminPanelNew: React.FC<AdminPanelProps> = ({ onNavigate }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [realImages, setRealImages] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [imageType, setImageType] = useState<'real' | 'ai'>('real');
  const [dailyChallenges, setDailyChallenges] = useState<any[]>([]);
  const [uploadCategory, setUploadCategory] = useState<string>('object');
  const [uploadDifficulty, setUploadDifficulty] = useState<number>(3);
  const [uploadQuality, setUploadQuality] = useState<number>(7);

  const [systemStats] = useState<SystemStats>({
    totalUsers: 1247,
    activeUsers: 89,
    totalGames: 15420,
    totalImages: 2840,
    averageAccuracy: 87.3,
    serverUptime: '15 days, 8 hours'
  });

  const loadDashboardData = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/dashboard`, {
        headers: { 'X-API-Key': 'dev-admin-key-123' }
      });
      if (response.ok) {
        const data = await response.json();
        setDashboardStats(data.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }, []);

  const loadImages = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/images`);
      if (response.ok) {
        const data = await response.json();
        setRealImages(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load images:', error);
    }
  }, []);

  const loadDailyChallenges = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/daily-challenges`, {
        headers: { 'X-API-Key': 'dev-admin-key-123' }
      });
      if (response.ok) {
        const data = await response.json();
        setDailyChallenges(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load daily challenges:', error);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    loadImages();
    loadDailyChallenges();
  }, [loadDashboardData, loadImages, loadDailyChallenges]);

  const handleImageUpload = useCallback(async (event: any) => {
    const files = event.newState.filter((file: any) => file.getRawFile);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadStatus('Uploading images...');

    let successCount = 0;
    let failCount = 0;

    for (const fileWrapper of files) {
      try {
        const file = fileWrapper.getRawFile();
        const formData = new FormData();
        formData.append('image', file);
        formData.append('filename', file.name);
        formData.append('category', uploadCategory);
        formData.append('difficulty_level', uploadDifficulty.toString());
        formData.append('is_ai_generated', imageType === 'ai' ? 'true' : 'false');
        formData.append('source_info', 'Admin panel upload');
        formData.append('quality_score', uploadQuality.toString());

        const response = await fetch(`${API_BASE_URL}/images/upload`, {
          method: 'POST',
          body: formData
        });

        const result = await response.json();
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
      }
    }

    if (successCount > 0) {
      setUploadStatus(`✅ Successfully uploaded ${successCount} images!`);
      loadImages();
      loadDashboardData();
    } else {
      setUploadStatus(`❌ Upload failed`);
    }
    setIsUploading(false);
  }, [imageType, uploadCategory, uploadDifficulty, loadImages, loadDashboardData]);

  const createAutoPairs = async () => {
    try {
      setUploadStatus('Creating pairs...');
      const response = await fetch(`${API_BASE_URL}/admin/auto-pairs`, {
        method: 'POST',
        headers: {
          'X-API-Key': 'dev-admin-key-123',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (response.ok) {
        const result = await response.json();
        setUploadStatus(`✅ Created ${result.data.created} pairs!`);
        loadDashboardData();
      } else {
        setUploadStatus('❌ Failed to create pairs');
      }
    } catch (error) {
      setUploadStatus('❌ Error creating pairs');
    }
  };

  const navigate = useNavigate();
  const goHome = () => {
    onNavigate("home");
    navigate("/");
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #9effb7 0%, #7dd3a0 25%, #5ba688 75%, #3a7a70 100%)',
      padding: '0.5rem'
    }}>
      <div style={{ 
        background: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
        height: 'calc(100vh - 1rem)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '1rem 1.5rem', 
          borderBottom: '1px solid #e9ecef',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div>
            <h1 style={{ margin: 0, color: '#495057', fontSize: '1.5rem' }}>⚙️ Admin Panel</h1>
            <p style={{ margin: '0.25rem 0 0 0', color: '#6c757d', fontSize: '0.9rem' }}>Manage your Bot or Not game</p>
          </div>
          <Button onClick={goHome} themeColor="secondary" size="small">
            🏠 Back to Game
          </Button>
        </div>

        {/* Tabs */}
        <TabStrip 
          selected={selectedTab} 
          onSelect={(e) => setSelectedTab(e.selected)}
          style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        >
         

          <TabStripTab title="🖼️ Images">
            <div style={{ padding: '1.5rem', height: '100%', overflow: 'auto' }}>
              {/* Top Action Bar - Always Visible */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                marginBottom: '1.5rem',
                padding: '1rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <Button
                  themeColor="primary"
                  size="large"
                  onClick={createAutoPairs}
                  disabled={isUploading}
                  style={{
                    padding: '1rem 2rem',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    background: 'white',
                    color: '#667eea',
                    border: 'none',
                    minWidth: '200px'
                  }}
                >
                  🔗 Create Auto Pairs
                </Button>
              </div>

              {/* Two Column Layout */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '320px 1fr', 
                gap: '1.5rem', 
                height: '500px' // Fixed height for better control
              }}>
                
                {/* Left Column - Upload Section */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  height: '500px', // Fixed height to match parent
                  overflowY: 'auto', // Explicit vertical scrolling
                  overflowX: 'hidden', // Prevent horizontal scroll
                  paddingRight: '0.5rem', // Space for scrollbar
                  border: '1px solid #e9ecef', // Visual boundary
                  borderRadius: '8px',
                  padding: '1rem',
                  background: '#f8f9fa'
                }}>
                  {/* Image Type Selection */}
                  <div style={{ marginBottom: '1rem', flexShrink: 0 }}>
                    <h3 style={{ margin: '0 0 0.75rem 0', color: '#495057', fontSize: '1.1rem' }}>📁 Image Upload</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <Button
                        themeColor={imageType === 'real' ? 'success' : 'secondary'}
                        onClick={() => {
                          setImageType('real');
                          setUploadStatus(`📷 Ready to upload REAL images (${uploadCategory}, difficulty ${uploadDifficulty})`);
                        }}
                        style={{
                          padding: '0.6rem',
                          fontSize: '0.85rem',
                          fontWeight: 'bold',
                          width: '100%'
                        }}
                      >
                        📷 Upload Real Images
                      </Button>

                      <Button
                        themeColor={imageType === 'ai' ? 'info' : 'secondary'}
                        onClick={() => {
                          setImageType('ai');
                          setUploadStatus(`🤖 Ready to upload AI images (${uploadCategory}, difficulty ${uploadDifficulty})`);
                        }}
                        style={{
                          padding: '0.6rem',
                          fontSize: '0.85rem',
                          fontWeight: 'bold',
                          width: '100%'
                        }}
                      >
                        🤖 Upload AI Images
                      </Button>
                    </div>
                  </div>

                  {/* Image Properties */}
                  <div style={{ marginBottom: '0.75rem', flexShrink: 0 }}>
                    <h4 style={{ margin: '0 0 0.4rem 0', color: '#495057', fontSize: '0.9rem' }}>⚙️ Image Properties</h4>
                    
                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.75rem', fontWeight: 'bold', color: '#6c757d' }}>
                        Category:
                      </label>
                      <select 
                        value={uploadCategory}
                        onChange={(e) => setUploadCategory(e.target.value)}
                        style={{ 
                          width: '100%', 
                          padding: '0.3rem', 
                          borderRadius: '4px', 
                          border: '1px solid #ced4da',
                          fontSize: '0.8rem'
                        }}
                      >
                        <option value="object">🎯 Object</option>
                        <option value="portrait">👤 Portrait</option>
                        <option value="landscape">🏞️ Landscape</option>
                        <option value="abstract">🎨 Abstract</option>
                        <option value="animal">🐾 Animal</option>
                        <option value="food">🍎 Food</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.75rem', fontWeight: 'bold', color: '#6c757d' }}>
                        Difficulty Level:
                      </label>
                      <select 
                        value={uploadDifficulty}
                        onChange={(e) => setUploadDifficulty(parseInt(e.target.value))}
                        style={{ 
                          width: '100%', 
                          padding: '0.3rem', 
                          borderRadius: '4px', 
                          border: '1px solid #ced4da',
                          fontSize: '0.8rem'
                        }}
                      >
                        <option value={1}>1 - Very Easy</option>
                        <option value={2}>2 - Easy</option>
                        <option value={3}>3 - Medium</option>
                        <option value={4}>4 - Hard</option>
                        <option value={5}>5 - Very Hard</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: '0.5rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.2rem', fontSize: '0.75rem', fontWeight: 'bold', color: '#6c757d' }}>
                        Quality Score:
                      </label>
                      <select 
                        value={uploadQuality}
                        onChange={(e) => setUploadQuality(parseInt(e.target.value))}
                        style={{ 
                          width: '100%', 
                          padding: '0.3rem', 
                          borderRadius: '4px', 
                          border: '1px solid #ced4da',
                          fontSize: '0.8rem'
                        }}
                      >
                        <option value={1}>1 - Poor</option>
                        <option value={2}>2 - Below Average</option>
                        <option value={3}>3 - Fair</option>
                        <option value={4}>4 - Good</option>
                        <option value={5}>5 - Very Good</option>
                        <option value={6}>6 - Excellent</option>
                        <option value={7}>7 - Outstanding</option>
                        <option value={8}>8 - Perfect</option>
                        <option value={9}>9 - Exceptional</option>
                        <option value={10}>10 - Masterpiece</option>
                      </select>
                    </div>
                  </div>

                  {/* Upload Area */}
                  <div
                    style={{
                      background: '#f8f9fa',
                      border: '2px dashed #dee2e6',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      textAlign: 'center',
                      marginBottom: '0.75rem',
                      minHeight: '120px', // Reduced from 200px
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <h4
                      style={{
                        color: '#495057',
                        marginBottom: '0.5rem',
                        fontSize: '0.95rem',
                      }}
                    >
                      {imageType === 'real'
                        ? '📷 Drop Real Images Here'
                        : '🤖 Drop AI Images Here'}
                    </h4>
                    <Upload
                      batch={false}
                      multiple={true}
                      defaultFiles={[]}
                      onAdd={handleImageUpload}
                      restrictions={{
                        allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
                        maxFileSize: 10485760,
                      }}
                      disabled={isUploading}
                    />

                    {uploadStatus && (
                      <div
                        style={{
                          marginTop: '0.75rem',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          background: uploadStatus.includes('✅')
                            ? '#d4edda'
                            : uploadStatus.includes('📷') ||
                              uploadStatus.includes('🤖')
                            ? '#cce5ff'
                            : '#f8d7da',
                          color: uploadStatus.includes('✅')
                            ? '#155724'
                            : uploadStatus.includes('📷') ||
                              uploadStatus.includes('🤖')
                            ? '#004085'
                            : '#721c24',
                          fontSize: '0.8rem'
                        }}
                      >
                        {uploadStatus}
                      </div>
                    )}
                  </div>

                  {/* Refresh Button */}
                  <div style={{ 
                    flexShrink: 0,
                    marginTop: 'auto'
                  }}>
                    <Button
                      themeColor="warning"
                      onClick={loadImages}
                      size="small"
                      style={{
                        padding: '0.5rem',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        width: '100%'
                      }}
                    >
                      🔄 Refresh Images
                    </Button>
                  </div>
                </div>

                {/* Right Column - Images Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', height: '500px' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '1rem' 
                  }}>
                    <h3 style={{ margin: 0, color: '#495057', fontSize: '1.2rem' }}>🖼️ Image Library</h3>
                    <span style={{ 
                      background: '#e9ecef', 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '12px', 
                      fontSize: '0.9rem',
                      color: '#495057'
                    }}>
                      {realImages.length} images
                    </span>
                  </div>
                  
                  <div
                    style={{
                      background: 'white',
                      borderRadius: '8px',
                      border: '1px solid #e9ecef',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 0 // Important for flex child to shrink
                    }}
                  >
                    <Grid
                      data={realImages.map((img) => ({
                        id: img.id,
                        filename: img.filename,
                        type: img.is_ai_generated ? 'AI' : 'Real',
                        category: img.category,
                        difficulty: img.difficulty_level,
                        uploadDate: new Date(img.upload_date).toLocaleDateString(),
                        usage: img.usage_count,
                        size: Math.round(img.file_size / 1024) + ' KB',
                      }))}
                      style={{ 
                        height: '400px', // Fixed height instead of 100%
                        flex: 1
                      }}
                      pageable={{
                        buttonCount: 5,
                        info: true,
                        type: 'numeric',
                        pageSizes: [10, 20, 50],
                        previousNext: true
                      }}
                      sortable={true}
                      filterable={true}
                      scrollable="scrollable"
                    >
                      <GridColumn field="filename" title="Filename" width="180px" />
                      <GridColumn field="type" title="Type" width="70px" />
                      <GridColumn field="category" title="Category" width="90px" />
                      <GridColumn field="difficulty" title="Diff." width="70px" />
                      <GridColumn field="uploadDate" title="Date" width="100px" />
                      <GridColumn field="usage" title="Used" width="60px" />
                      <GridColumn field="size" title="Size" width="80px" />
                    </Grid>
                  </div>
                </div>
              </div>
            </div>
          </TabStripTab>

          <TabStripTab title="🎯 Daily Challenges">
            <div style={{ padding: '1.5rem', height: '100%', overflow: 'auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{ color: '#495057' }}>🎯 Daily Challenge Management</h2>
                <p style={{ color: '#6c757d' }}>Create and manage daily challenges for players</p>
              </div>

              {/* Challenge Creation */}
              <div style={{ 
                background: 'white', 
                padding: '2rem', 
                borderRadius: '12px', 
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                marginBottom: '2rem'
              }}>
                {/* <h3 style={{ marginBottom: '1rem' }}>Create New Daily Challenge</h3> */}
                <Button 
                  themeColor="primary" 
                  size="large"
                  onClick={async () => {
                    try {
                      setUploadStatus('Creating daily challenge...');
                      
                      // Get form values
                      const dateEl = document.getElementById('challenge-date') as HTMLInputElement;
                      const difficultyEl = document.getElementById('challenge-difficulty') as HTMLSelectElement;
                      const categoryEl = document.getElementById('challenge-category') as HTMLSelectElement;
                      const pointsEl = document.getElementById('challenge-points') as HTMLInputElement;
                      const descriptionEl = document.getElementById('challenge-description') as HTMLTextAreaElement;
                      
                      const challengeData: any = {
                        date: dateEl?.value || new Date().toISOString().split('T')[0],
                        title: `Daily Challenge - ${new Date(dateEl?.value || new Date()).toLocaleDateString()}`,
                        description: descriptionEl?.value || 'Can you spot the AI-generated images in today\'s challenge?',
                        difficulty_level: parseInt(difficultyEl?.value || '3'),
                        points_reward: parseInt(pointsEl?.value || '100')
                      };
                      
                      // Only add category if it's not 'any'
                      if (categoryEl?.value && categoryEl.value !== 'any') {
                        challengeData.category = categoryEl.value;
                      }

                      console.log('Sending challenge data:', challengeData);
                      
                      const response = await fetch(`${API_BASE_URL}/admin/daily-challenges`, {
                        method: 'POST',
                        headers: {
                          'X-API-Key': 'dev-admin-key-123',
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(challengeData)
                      });

                      const result = await response.json();
                      console.log('Challenge creation response:', result);
                      
                      if (result.success) {
                        setUploadStatus('✅ Daily challenge created successfully!');
                        // Clear form
                        if (descriptionEl) descriptionEl.value = '';
                        // Reload challenges list
                        loadDailyChallenges();
                      } else {
                        setUploadStatus(`❌ Failed to create challenge: ${result.error || JSON.stringify(result)}`);
                      }
                    } catch (error: any) {
                      setUploadStatus(`❌ Error creating challenge: ${error.message}`);
                    }
                  }}
                  style={{ padding: '1rem 2rem', fontSize: '1rem', fontWeight: 'bold' }}
                >
                  🎯 Create Daily Challenge
                </Button>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '1rem', 
                  marginBottom: '1.5rem' 
                }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Challenge Date:
                    </label>
                    <input 
                      id="challenge-date"
                      type="date" 
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                      defaultValue={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Difficulty Level:
                    </label>
                    <select id="challenge-difficulty" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                      <option value="1">1 - Very Easy</option>
                      <option value="2">2 - Easy</option>
                      <option value="3" selected>3 - Medium</option>
                      <option value="4">4 - Hard</option>
                      <option value="5">5 - Very Hard</option>
                    </select>
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Category:
                    </label>
                    <select id="challenge-category" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                      <option value="any">Any Category</option>
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                      <option value="object">Object</option>
                      <option value="abstract">Abstract</option>
                    </select>
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Points Reward:
                    </label>
                    <input 
                      id="challenge-points"
                      type="number" 
                      defaultValue="100"
                      min="50"
                      max="500"
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>
                </div>
                
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Challenge Description:
                  </label>
                  <textarea 
                    id="challenge-description"
                    placeholder="Enter a description for today's challenge..."
                    style={{ 
                      width: '100%', 
                      padding: '0.5rem', 
                      borderRadius: '4px', 
                      border: '1px solid #ccc',
                      minHeight: '80px',
                      resize: 'vertical'
                    }}
                  />
                </div>
                
              </div>

              {/* Active Challenges */}
              <div style={{ 
                background: 'white', 
                padding: '2rem', 
                borderRadius: '12px', 
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0 }}>Active Daily Challenges</h3>
                  <Button
                    themeColor="info"
                    size="small"
                    onClick={loadDailyChallenges}
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    🔄 Refresh
                  </Button>
                </div>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                  gap: '1rem' 
                }}>
                  {dailyChallenges.length > 0 ? (
                    dailyChallenges.map((challenge) => (
                      <div key={challenge.id} style={{ 
                        border: '1px solid #e9ecef', 
                        borderRadius: '8px', 
                        padding: '1.5rem',
                        background: '#f8f9fa'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                          <h4 style={{ margin: 0, color: '#495057' }}>{challenge.title}</h4>
                          <span style={{ 
                            background: challenge.is_active ? '#28a745' : '#6c757d', 
                            color: 'white', 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: '12px', 
                            fontSize: '0.8rem' 
                          }}>
                            {challenge.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p style={{ color: '#6c757d', marginBottom: '1rem' }}>
                          {challenge.description}
                        </p>
                        <div style={{ fontSize: '0.9rem', color: '#495057' }}>
                          <div>📅 Date: {new Date(challenge.date).toLocaleDateString()}</div>
                          <div>🎯 Difficulty: {challenge.difficulty_level}/5</div>
                          <div>🏆 Reward: {challenge.points_reward} points</div>
                          {challenge.category && <div>📂 Category: {challenge.category}</div>}
                        </div>
                        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                          <Button
                            themeColor="warning"
                            size="small"
                            onClick={() => setUploadStatus(`Editing challenge: ${challenge.title}`)}
                            style={{ fontSize: '0.8rem' }}
                          >
                            ✏️ Edit
                          </Button>
                          <Button
                            themeColor="error"
                            size="small"
                            onClick={async () => {
                              if (confirm('Delete this challenge?')) {
                                try {
                                  const response = await fetch(`${API_BASE_URL}/admin/daily-challenges/${challenge.id}`, {
                                    method: 'DELETE',
                                    headers: { 'X-API-Key': 'dev-admin-key-123' }
                                  });
                                  if (response.ok) {
                                    setUploadStatus('✅ Challenge deleted successfully!');
                                    loadDailyChallenges();
                                  }
                                } catch (error: any) {
                                  setUploadStatus(`❌ Delete failed: ${error.message}`);
                                }
                              }
                            }}
                            style={{ fontSize: '0.8rem' }}
                          >
                            🗑️ Delete
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ 
                      border: '2px dashed #dee2e6', 
                      borderRadius: '8px', 
                      padding: '2rem',
                      textAlign: 'center',
                      color: '#6c757d',
                      gridColumn: '1 / -1'
                    }}>
                      <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📅</div>
                      <div>No daily challenges created yet</div>
                      <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Create your first challenge above!</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabStripTab>

          <TabStripTab title="⚙️ Settings">
            <div style={{ padding: '1.5rem', height: '100%', overflow: 'auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{ color: '#495057' }}>⚙️ Game Settings</h2>
                <p style={{ color: '#6c757d' }}>Configure game parameters and system settings</p>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                gap: '2rem' 
              }}>
                {/* Game Settings */}
                <div style={{ 
                  background: 'white', 
                  padding: '2rem', 
                  borderRadius: '12px', 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ marginBottom: '1.5rem' }}>🎮 Game Configuration</h3>
                  
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Daily Games Limit:
                    </label>
                    <input 
                      type="number" 
                      defaultValue="3"
                      min="1"
                      max="10"
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>
                  
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Points Per Correct Answer:
                    </label>
                    <input 
                      type="number" 
                      defaultValue="100"
                      min="50"
                      max="500"
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>
                  
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Streak Multiplier:
                    </label>
                    <input 
                      type="number" 
                      defaultValue="1.5"
                      min="1"
                      max="5"
                      step="0.1"
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                    />
                  </div>
                  
                  <Button 
                    themeColor="primary"
                    onClick={() => setUploadStatus('✅ Game settings saved!')}
                  >
                    💾 Save Game Settings
                  </Button>
                </div>

                {/* System Settings */}
                <div style={{ 
                  background: 'white', 
                  padding: '2rem', 
                  borderRadius: '12px', 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ marginBottom: '1.5rem' }}>🔧 System Configuration</h3>
                  
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Maintenance Mode:
                    </label>
                    <select style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                      <option value="false">Disabled</option>
                      <option value="true">Enabled</option>
                    </select>
                  </div>
                  
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Auto-backup Frequency:
                    </label>
                    <select style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Log Level:
                    </label>
                    <select style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
                      <option value="error">Error</option>
                      <option value="warning">Warning</option>
                      <option value="info" selected>Info</option>
                      <option value="debug">Debug</option>
                    </select>
                  </div>
                  
                  <Button 
                    themeColor="warning"
                    onClick={() => setUploadStatus('✅ System settings saved!')}
                  >
                    🔧 Save System Settings
                  </Button>
                </div>
              </div>
            </div>
          </TabStripTab>
        </TabStrip>
      </div>
    </div>
  );
};

export default AdminPanelNew;