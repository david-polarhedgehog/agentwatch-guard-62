import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AgentNameInitializer } from './services/agentNameInitializer'

// Initialize agent name cache on app startup
AgentNameInitializer.initialize();

createRoot(document.getElementById("root")!).render(<App />);
