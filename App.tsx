
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { ImageEditor } from './components/ImageEditor';
import { ImageGenerator } from './components/ImageGenerator';
import { VideoGenerator } from './components/VideoGenerator';
import { ContentAnalyzer } from './components/ContentAnalyzer';
import { MarketingCopywriter } from './components/MarketingCopywriter';
import { MarketResearch } from './components/MarketResearch';
import { MarketingChatbot } from './components/MarketingChatbot';
import { AudiobookSampleCreator } from './components/AudiobookSampleCreator';
import { AudioTranscriber } from './components/AudioTranscriber';
import { AudienceAnalyzer } from './components/AudienceAnalyzer';
import { BookDistributor } from './components/BookDistributor';
import { WebsiteBuilder } from './components/WebsiteBuilder';
import { Tool, User, SalesPageConfig, SalesRecord } from './types';
import { LoginScreen } from './components/LoginScreen';
import { FunnelBuilder } from './components/FunnelBuilder';
import { MarketingVideoCreator } from './components/MarketingVideoCreator';
import { SalesAnalytics } from './components/SalesAnalytics';
import { DirectSalesChannel } from './components/DirectSalesChannel';
import { PublicSalesPage } from './components/PublicSalesPage';
import { generateSalesData } from './services/salesDataService';


const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<'app' | 'salesPage'>('app');

  // Lifted state for sales data and direct sales page config
  const [salesData, setSalesData] = useState<SalesRecord[]>([]);
  const [salesPageConfig, setSalesPageConfig] = useState<SalesPageConfig | null>(null);


  useEffect(() => {
    if (user) {
        // Generate initial historical sales data on login
        const historicalData = generateSalesData(user.bookTitle, user.genre, 365);
        setSalesData(historicalData);
    }
  }, [user]);

  const handleLogin = (userData: { name: string; bookTitle: string; genre: string; }) => {
    setUser({
      ...userData,
      avatarUrl: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(userData.name)}`,
    });
     setActiveView('app');
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTool(null);
    setSalesPageConfig(null);
    setSalesData([]);
  };
  
  const handleUpdateSalesPageConfig = (config: SalesPageConfig | null) => {
    setSalesPageConfig(config);
  };

  const handleNewSale = (sale: SalesRecord) => {
      setSalesData(prevData => [...prevData, sale]);
  };


  const renderActiveTool = () => {
    switch (activeTool?.id) {
      case 'image-editor':
        return <ImageEditor />;
      case 'image-generator':
        return <ImageGenerator />;
      case 'video-generator':
        return <VideoGenerator />;
      case 'marketing-video-creator':
        return <MarketingVideoCreator />;
      case 'book-distributor':
        return <BookDistributor />;
      case 'funnel-builder':
        return <FunnelBuilder />;
      case 'cover-analyzer':
        return <ContentAnalyzer />;
      case 'copywriter':
        return <MarketingCopywriter />;
      case 'market-research':
        return <MarketResearch />;
      case 'audiobook-creator':
        return <AudiobookSampleCreator />;
      case 'audio-transcriber':
        return <AudioTranscriber />;
      case 'audience-analyzer':
        return <AudienceAnalyzer />;
      case 'website-builder':
        return <WebsiteBuilder />;
      case 'sales-analytics':
        return <SalesAnalytics user={user!} salesData={salesData} />;
      case 'direct-sales-channel':
        return <DirectSalesChannel 
            user={user!} 
            onConfigUpdate={handleUpdateSalesPageConfig} 
            config={salesPageConfig}
            onViewSalesPage={() => setActiveView('salesPage')}
        />;
      default:
        return <Dashboard setActiveTool={setActiveTool} user={user!} />;
    }
  };

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }
  
  if (activeView === 'salesPage' && salesPageConfig) {
      return <PublicSalesPage 
        user={user} 
        config={salesPageConfig} 
        onBackToApp={() => setActiveView('app')}
        onNewSale={handleNewSale}
      />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-indigo-900 font-sans">
      <Header user={user} onLogout={handleLogout} setActiveTool={setActiveTool} />
      <main className="p-4 sm:p-6 lg:p-8">
        {renderActiveTool()}
      </main>
      <MarketingChatbot />
    </div>
  );
};

export default App;
