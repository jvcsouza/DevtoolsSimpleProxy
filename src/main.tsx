import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DevToolsPanel } from '@components/devtools-panel.tsx';

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<DevToolsPanel />
	</StrictMode>,
);
