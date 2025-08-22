import type { Metadata } from 'next';
import './globals.css';
import NavBar from '@/components/NavBar';
import { ThemeProvider } from 'next-themes';
import SessionProviderWrapper from '@/components/SessionProviderWrapper';

export const metadata: Metadata = {
  title: 'BesPick',
  description:
    'An application created for the BESPIN morale team, dedicated to hosting BESPIN giveaways and voting events',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body className='bg-app'>
        <ThemeProvider
          attribute='class' // adds "light" or "dark" to <html>
          defaultTheme='light' // or "system" if you want OS-based default
          enableSystem={false} // disable if you want full manual control
        >
          <SessionProviderWrapper>
            <NavBar />
            {children}
          </SessionProviderWrapper>
        </ThemeProvider>
      </body>
      </html>
  );
}
