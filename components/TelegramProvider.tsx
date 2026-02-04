'use client';

import { useEffect } from 'react';
import { 
  init, 
  miniApp, 
  viewport, 
  postEvent,
  isTMA
} from '@telegram-apps/sdk';

export default function TelegramProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Check if we are in Telegram
    if (typeof window !== 'undefined' && isTMA()) {
      try {
        // Initialize the SDK
        init();

        // Initialize and expand viewport
        if (viewport.mount.isAvailable()) {
          viewport.mount().then(() => {
            viewport.expand();
          }).catch(err => console.error('Viewport mount error:', err));
        }

        // Initialize mini app
        if (miniApp.mount.isAvailable()) {
          miniApp.mount();
          miniApp.ready();
        }

        // Notify Telegram that the app is ready
        postEvent('web_app_ready');
      } catch (e) {
        console.error('Telegram SDK initialization failed:', e);
      }
    }
  }, []);

  return <>{children}</>;
}
