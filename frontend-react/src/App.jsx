import { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { ChatView } from './components/chat/ChatView';

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [simMode, setSimMode] = useState(true);

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(d => setSimMode(d.simulation_mode))
      .catch(() => {});
  }, []);

  // Update document title
  useEffect(() => {
    document.title = activeView === 'dashboard'
      ? 'TAO — Pipeline Dashboard'
      : 'TAO — Judge AI Chat';
  }, [activeView]);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
      />

      <main
        className="flex-1 flex flex-col transition-all duration-300 overflow-hidden"
        style={{ marginLeft: sidebarCollapsed ? 68 : 260 }}
      >
        {activeView === 'dashboard' ? (
          <DashboardView simMode={simMode} />
        ) : (
          <div className="flex-1 flex flex-col h-screen">
            <ChatView />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
