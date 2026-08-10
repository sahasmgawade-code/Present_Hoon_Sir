import React, { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Footer from './Footer.jsx';

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-transparent flex">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className="flex flex-col flex-1 min-w-0 min-h-screen pt-14 md:pt-0">
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">{children}</main>
        <Footer />
      </div>
    </div>
  );
}