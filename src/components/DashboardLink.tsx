import React from 'react'
import Link from 'next/link'

export const DashboardLink = () => {
  return (
    <div style={{ marginBottom: '16px', padding: '0 12px' }}>
      <Link 
        href="/admin" 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          padding: '8px 12px', 
          background: '#f3f4f6', 
          borderRadius: '4px', 
          color: '#111827', 
          textDecoration: 'none', 
          fontWeight: 600,
          fontSize: '14px'
        }}
      >
        <span style={{ fontSize: '18px' }}>📊</span> Dashboard Thống Kê
      </Link>
    </div>
  )
}
