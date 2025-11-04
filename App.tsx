
import React, { useState } from 'react';
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
import { Tool, User } from './types';
import { LoginScreen } from './components/LoginScreen';
import { FunnelBuilder } from './components/FunnelBuilder';
import { MarketingVideoCreator } from './components/MarketingVideoCreator';

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (userData: { name: string; bookTitle: string; genre: string; }) => {
    setUser({
      ...userData,
      avatarUrl: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(userData.name)}`,
    });
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTool(null); // Reset tool selection on logout
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
      default:
        return <Dashboard setActiveTool={setActiveTool} user={user!} />;
    }
  };

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
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