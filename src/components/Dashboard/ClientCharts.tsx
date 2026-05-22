"use client"

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { TrendingUp, AlertCircle, Building } from 'lucide-react'

// Colors for Pie Chart
const COLORS = ['#22c55e', '#ef4444', '#f59e0b']

export const ClientCharts = ({
  revenueData,
  occupancyData,
  totalDebt,
  totalRevenue,
}: {
  revenueData: any[]
  occupancyData: any[]
  totalDebt: number
  totalRevenue: number
}) => {
  return (
    <div className="dashboard-charts" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px' }}>
      
      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <div style={{ padding: '24px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '16px', background: '#dcfce7', borderRadius: '50%' }}>
            <TrendingUp color="#16a34a" size={32} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Tổng Doanh Thu (Tháng này)</h3>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalRevenue)}
            </p>
          </div>
        </div>

        <div style={{ padding: '24px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '16px', background: '#fee2e2', borderRadius: '50%' }}>
            <AlertCircle color="#dc2626" size={32} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Tổng Công Nợ</h3>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalDebt)}
            </p>
          </div>
        </div>

        <div style={{ padding: '24px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '16px', background: '#e0e7ff', borderRadius: '50%' }}>
            <Building color="#4f46e5" size={32} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Tỷ lệ lấp đầy</h3>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
              {occupancyData.length > 0
                ? Math.round((occupancyData.find((d) => d.name === 'Đã thuê')?.value || 0) / occupancyData.reduce((a, b) => a + b.value, 0) * 100)
                : 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* Revenue Bar Chart */}
        <div style={{ padding: '24px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginBottom: '24px', fontSize: '18px', color: '#111827' }}>Biểu đồ Doanh Thu</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `${value / 1000000}M`} />
                <Tooltip 
                  formatter={(value: any) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value))}
                  cursor={{ fill: '#f3f4f6' }}
                />
                <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Occupancy Pie Chart */}
        <div style={{ padding: '24px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginBottom: '24px', fontSize: '18px', color: '#111827' }}>Tình trạng Phòng</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={occupancyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {occupancyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  )
}
