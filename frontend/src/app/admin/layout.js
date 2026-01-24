"use client";
import React from 'react';

export default function AdminLayout({ children }) {
  return (
    <div className="responsive-layout">
      <div className="page-content">
        {children}
      </div>
    </div>
  );
}
