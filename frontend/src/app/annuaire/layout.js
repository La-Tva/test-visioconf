"use client";
import React from 'react';
import Sidebar from '../components/Sidebar';

export default function DirectoryLayout({ children }) {
  return (
    <div style={{ display: 'flex', width: '100%', background: '#F8FAFC' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
}
