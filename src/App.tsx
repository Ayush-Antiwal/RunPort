import React, { useEffect, useState } from 'react';
import { DashboardView } from './views/DashboardView';
import { DesktopWidgetView } from './views/DesktopWidgetView';

export const App: React.FC = () => {
  const [route, setRoute] = useState<string>('dashboard');

  useEffect(() => {
    const updateRoute = () => {
      const hash = window.location.hash.replace('#/', '');
      setRoute(hash || 'dashboard');
    };

    updateRoute();
    window.addEventListener('hashchange', updateRoute);

    return () => {
      window.removeEventListener('hashchange', updateRoute);
    };
  }, []);

  return route === 'widget' ? <DesktopWidgetView /> : <DashboardView />;
};

export default App;
