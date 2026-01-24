"use client";
import React from 'react';

export default function AdminLayout({ children }) {
  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh', background: '#F8FAFC' }}>
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
}
