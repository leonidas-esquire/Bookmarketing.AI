
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
import { WebsiteBuilder } from './components/WebsiteBuilder';
import { Tool, User, SalesPageConfig, SalesRecord, Book } from './types';
import { LoginScreen } from './components/LoginScreen';
import { FunnelBuilder } from './components/FunnelBuilder';
import { DirectSalesChannel } from './components/DirectSalesChannel';
import { PublicSalesPage } from './components/PublicSalesPage';
import { generateSalesData } from './services/salesDataService';
import { LeftSidebar } from './components/LeftSidebar';
import { AddBookModal } from './components/AddBookModal';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ConfirmationModal } from './components/ConfirmationModal';


const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'app' | 'salesPage'>('app');
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);

  const [salesData, setSalesData] = useState<Record<string, SalesRecord[]>>({});
  const [salesPageConfigs, setSalesPageConfigs] = useState<Record<string, SalesPageConfig | null>>({});

  // Load data from localStorage on initial render but don't auto-login
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('bookmarketing_user');
      const storedSalesData = localStorage.getItem('bookmarketing_salesData');
      const storedSalesConfigs = localStorage.getItem('bookmarketing_salesPageConfigs');
      const storedActiveBookId = localStorage.getItem('bookmarketing_activeBookId');

      if (storedUser) {
        const parsedUser: User = JSON.parse(storedUser);
        setUser(parsedUser);
        
        const bookExists = parsedUser.books.some(b => b.id === storedActiveBookId);
        if (storedActiveBookId && bookExists) {
          setActiveBookId(storedActiveBookId);
        } else {
          setActiveBookId(parsedUser.books[0]?.id || null);
        }

        if (storedSalesData) {
          setSalesData(JSON.parse(storedSalesData));
        }
        if (storedSalesConfigs) {
          setSalesPageConfigs(JSON.parse(storedSalesConfigs));
        }
      }
    } catch (error) {
        console.error("Failed to load data from localStorage", error);
        localStorage.clear(); // Clear potentially corrupted data
    }
  }, []);

  // Persist data to localStorage whenever it changes, but only if authenticated
  useEffect(() => {
    if (user && isAuthenticated) {
      try {
        localStorage.setItem('bookmarketing_user', JSON.stringify(user));
        if(activeBookId) localStorage.setItem('bookmarketing_activeBookId', activeBookId);
        localStorage.setItem('bookmarketing_salesData', JSON.stringify(salesData));
        localStorage.setItem('bookmarketing_salesPageConfigs', JSON.stringify(salesPageConfigs));
      } catch (error) {
        console.error("Failed to save data to localStorage", error);
      }
    }
  }, [user, activeBookId, salesData, salesPageConfigs, isAuthenticated]);


  const activeBook = user?.books.find(b => b.id === activeBookId) || null;
  const activeSalesData = activeBookId ? salesData[activeBookId] || [] : [];
  const activeSalesPageConfig = activeBookId ? salesPageConfigs[activeBookId] || null : null;


  const handleLogin = (userData?: { name: string; bookTitle: string; genre: string; }) => {
    // If userData is provided, it's a new user registration
    if (userData) {
      const firstBook: Book = {
        id: Date.now().toString(),
        title: userData.bookTitle,
        genre: userData.genre
      };
      
      setUser({
        name: userData.name,
        avatarUrl: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(userData.name)}`,
        books: [firstBook]
      });

      setActiveBookId(firstBook.id);
      const initialSales = generateSalesData(firstBook.title, firstBook.genre, 365);
      setSalesData({ [firstBook.id]: initialSales });
      setSalesPageConfigs({ [firstBook.id]: null });
    }
    // For both new and existing users, we set isAuthenticated to true to enter the app.
    setIsAuthenticated(true);
    setActiveView('app');
  };

  const handleLogout = () => {
    // Clear state
    setUser(null);
    setActiveBookId(null);
    setActiveTool(null);
    setSalesPageConfigs({});
    setSalesData({});
    setIsAuthenticated(false);
    
    // Clear localStorage
    localStorage.removeItem('bookmarketing_user');
    localStorage.removeItem('bookmarketing_activeBookId');
    localStorage.removeItem('bookmarketing_salesData');
    localStorage.removeItem('bookmarketing_salesPageConfigs');
  };

  const handleSetActiveBook = (bookId: string) => {
    setActiveBookId(bookId);
    setActiveTool(null); // Return to dashboard on book switch
  };
  
  const handleAddNewBook = (bookData: { title: string; genre: string; }) => {
    if (!user) return;
    const newBook: Book = { ...bookData, id: Date.now().toString() };

    setUser(prevUser => ({...prevUser!, books: [...prevUser!.books, newBook]}));
    setActiveBookId(newBook.id);

    const initialSales = generateSalesData(newBook.title, newBook.genre, 365);
    setSalesData(prev => ({...prev, [newBook.id]: initialSales}));
    setSalesPageConfigs(prev => ({...prev, [newBook.id]: null}));

    setIsAddBookModalOpen(false);
    setActiveTool(null);
  };

  const handleRequestDeleteBook = (bookId: string) => {
    const book = user?.books.find(b => b.id === bookId);
    if (book) {
        setBookToDelete(book);
    }
  };

  const handleCancelDelete = () => {
      setBookToDelete(null);
  };

  const handleConfirmDeleteBook = () => {
      if (!bookToDelete || !user) return;

      if (user.books.length <= 1) {
          alert("You cannot delete your only book. Please add another book first or edit the existing one.");
          setBookToDelete(null);
          return;
      }

      const updatedBooks = user.books.filter(b => b.id !== bookToDelete.id);
      setUser({ ...user, books: updatedBooks });

      const newSalesData = { ...salesData };
      delete newSalesData[bookToDelete.id];
      setSalesData(newSalesData);
      
      const newSalesConfigs = { ...salesPageConfigs };
      delete newSalesConfigs[bookToDelete.id];
      setSalesPageConfigs(newSalesConfigs);

      if (activeBookId === bookToDelete.id) {
          setActiveBookId(updatedBooks[0].id);
      }

      setBookToDelete(null);
  };

  const handleUpdateSalesPageConfig = (config: SalesPageConfig | null) => {
    if (activeBookId) {
      setSalesPageConfigs(prev => ({ ...prev, [activeBookId]: config }));
    }
  };

  const handleNewSale = (sale: SalesRecord) => {
    if (activeBookId) {
      setSalesData(prev => ({ ...prev, [activeBookId]: [...(prev[activeBookId] || []), sale] }));
    }
  };


  const renderMainStage = () => {
    if (!activeBook) {
      return <div className="text-center p-8"><p>Please select a book to begin.</p></div>;
    }
    switch (activeTool?.id) {
      case 'image-editor':
        return <ImageEditor />;
      case 'image-generator':
        return <ImageGenerator />;
      case 'video-generator':
        return <VideoGenerator />;
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
      case 'website-builder':
        return <WebsiteBuilder />;
      case 'direct-sales-channel':
        return <DirectSalesChannel 
            book={activeBook} 
            onConfigUpdate={handleUpdateSalesPageConfig} 
            config={activeSalesPageConfig}
            onViewSalesPage={() => setActiveView('salesPage')}
        />;
      default:
        return <Dashboard setActiveTool={setActiveTool} user={user!} activeBook={activeBook} />;
    }
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} existingUser={user} />;
  }
  
  if (!user || !activeBook) {
    return <div className="h-screen w-screen flex items-center justify-center bg-gray-900"><LoadingSpinner message="Loading your dashboard..." /></div>;
  }
  
  if (activeView === 'salesPage' && activeSalesPageConfig) {
      return <PublicSalesPage 
        user={user} 
        book={activeBook}
        config={activeSalesPageConfig} 
        onBackToApp={() => setActiveView('app')}
        onNewSale={handleNewSale}
      />
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 to-indigo-900 font-sans flex flex-col">
      <Header 
        user={user} 
        activeBook={activeBook}
        onLogout={handleLogout} 
        setActiveTool={setActiveTool}
        onSetActiveBook={handleSetActiveBook}
        onAddNewBook={() => setIsAddBookModalOpen(true)}
        onRequestDeleteBook={handleRequestDeleteBook}
      />
      <main className="flex flex-1 overflow-hidden">
        <LeftSidebar user={user} salesData={activeSalesData} activeBook={activeBook} />
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            {renderMainStage()}
          </div>
        </div>
      </main>
      <MarketingChatbot />
      <AddBookModal 
        isOpen={isAddBookModalOpen}
        onClose={() => setIsAddBookModalOpen(false)}
        onAddBook={handleAddNewBook}
      />
      <ConfirmationModal
        isOpen={!!bookToDelete}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDeleteBook}
        title={`Delete "${bookToDelete?.title}"?`}
        message="This will permanently delete the book and all of its associated data, including sales analytics and marketing materials. This action cannot be undone."
      />
    </div>
  );
};

export default App;
