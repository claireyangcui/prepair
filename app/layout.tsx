import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prepair - Tradesmen Assistant',
  description: 'Agentic tool helping tradesmen filling the gap of tools, materials and information for the job',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

