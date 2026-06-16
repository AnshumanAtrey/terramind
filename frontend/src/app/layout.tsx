import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'TerraMind — Drone Swarm Command',
  description:
    'Autonomous Drone Swarm Command & Geospatial Intelligence Platform — TerraMind (Case Study 124).',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
