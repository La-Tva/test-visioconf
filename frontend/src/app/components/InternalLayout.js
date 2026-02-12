"use client";
import React from 'react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function InternalLayout({ children }) {
  return (
    <div className="responsive-layout">
      <Sidebar />
      <div className="page-content">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
