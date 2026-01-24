"use client";
import React from 'react';
import Sidebar from '../components/Sidebar';

export default function DirectoryLayout({ children }) {
  return (
    <div className="responsive-layout">
      <Sidebar />
      <div className="page-content">
        {children}
      </div>
    </div>
  );
}
