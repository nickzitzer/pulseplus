import React from 'react';
import Head from 'next/head';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Head>
        <title>PulsePlus</title>
        <meta name="description" content="PulsePlus gamification platform" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex-grow">{children}</main>
      <footer className="bg-gray-800 text-white p-4 fixed bottom-0 left-0 right-0">
        <div className="max-w-7xl mx-auto text-center">
          <p>&copy; {new Date().getFullYear()} Happy Technologies LLC. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;