import React, { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatInput from './components/ChatInput';
import ChatMessage from './components/ChatMessage';
import ChatLayout from './components/ChatLayout';
import Prompts from './components/Prompts';
import AuthChoice from './components/AuthChoice';

function App() {
  const [messages, setMessages] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState({});
  const [currentView, setCurrentView] = useState('chat');
  const messagesEndRef = useRef(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [promptsRefreshTrigger, setPromptsRefreshTrigger] = useState(0);

  const handleAuthSuccess = (token) => {
    setIsAuthenticated(true);
    localStorage.setItem('token', token);
  };
  
  const handleGuestAccess = () => {
    setIsAuthenticated(true);
    localStorage.setItem('token', 'guest-token');
    localStorage.setItem('isGuest', 'true');
  };

  useEffect(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('isGuest');
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleSavePrompt = async (message) => {
    try {
      const token = localStorage.getItem('token');
      const isGuest = localStorage.getItem('isGuest');
      
      if (!token || isGuest === 'true') {
        console.error('Must be logged in to save prompts');
        return false;
      }

      console.log('Attempting to save prompt with token:', token);
      console.log('Message content:', message);

      const response = await fetch('http://localhost:3001/api/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: message })
      });

      console.log('Response status:', response.status);
      
      // Get the response text first
      const responseText = await response.text();
      console.log('Response text:', responseText);

      // Try to parse it as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        throw new Error('Server returned invalid JSON');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save prompt');
      }
      
      setSavedPrompts(prev => ({
        ...prev,
        [message]: data.id
      }));

      setPromptsRefreshTrigger(prev => prev + 1);
      
      return true;
    } catch (error) {
      console.error('Error saving prompt:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      return false;
    }
  };

  const handleSendMessage = async (message) => {
    setMessages(prev => [...prev, { text: message, isBot: false }]);
    
    try {
      const response = await fetch('http://localhost:5001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error');
      }
      
      const data = await response.json();
      setMessages(prev => [...prev, { text: data.response, isBot: true }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        text: `Error: ${error.message}`, 
        isBot: true 
      }]);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {!isAuthenticated ? (
        <AuthChoice onAuthSuccess={handleAuthSuccess} onGuestAccess={handleGuestAccess} darkMode={darkMode} />
      ) : (
        <div className="flex flex-col h-full">
          <Header darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />
          <div className="flex flex-1">
            <Sidebar 
              onNavigate={setCurrentView} 
              currentView={currentView}
              darkMode={darkMode}
              onToggleDarkMode={toggleDarkMode}
            />
            <main className="flex-1 relative">
              {currentView === 'chat' ? (
                <ChatLayout
                  inputComponent={
                    <ChatInput 
                      onSendMessage={handleSendMessage} 
                      darkMode={darkMode} 
                    />
                  }
                >
                  {messages.map((msg, index) => (
                    <ChatMessage
                      key={index}
                      message={msg.text}
                      isBot={msg.isBot}
                      darkMode={darkMode}
                      onSavePrompt={() => handleSavePrompt(msg.text)}
                      isSaved={savedPrompts[msg.text]}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </ChatLayout>
              ) : (
                <Prompts 
                  darkMode={darkMode} 
                  refreshTrigger={promptsRefreshTrigger}
                />
              )}
            </main>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;