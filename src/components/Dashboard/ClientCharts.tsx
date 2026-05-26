"use client"

import React from 'react'
import {
  AreaChart,
  Area,
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
import { TrendingUp, AlertCircle, Building, Wallet, CreditCard, Home } from 'lucide-react'

// Modern HSL Colors for Pie Chart
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const dataName = label || payload[0].name || ''
    const dataValue = payload[0].value || 0
    const isCurrency = dataValue > 1000

    return (
      <div className="custom-tooltip">
        <div className="custom-tooltip-label">{dataName}</div>
        <div className="custom-tooltip-value">
          {isCurrency 
            ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(dataValue))
            : `${dataValue} phòng`}
        </div>
      </div>
    )
  }
  return null
}

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', padding: '0 40px 40px' }}>
      
      {/* Premium Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        <div className="premium-card card-revenue">
          <div className="stat-content">
            <h3 className="stat-title">Doanh Thu (Tháng Này)</h3>
            <p className="stat-value">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalRevenue)}
            </p>
          </div>
          <Wallet className="card-decoration" size={160} color="#ffffff" />
        </div>

        <div className="premium-card card-debt">
          <div className="stat-content">
            <h3 className="stat-title">Tổng Công Nợ</h3>
            <p className="stat-value">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalDebt)}
            </p>
          </div>
          <CreditCard className="card-decoration" size={160} color="#ffffff" />
        </div>

        <div className="premium-card card-occupancy">
          <div className="stat-content">
            <h3 className="stat-title">Tỷ Lệ Lấp Đầy</h3>
            <p className="stat-value">
              {occupancyData.length > 0
                ? Math.round((occupancyData.find((d) => d.name === 'Đã thuê')?.value || 0) / occupancyData.reduce((a, b) => a + b.value, 0) * 100)
                : 0}%
            </p>
          </div>
          <Home className="card-decoration" size={160} color="#ffffff" />
        </div>

      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
        
        {/* Revenue Area Chart */}
        <div className="premium-card chart-card">
          <h3 className="chart-title">Biểu đồ Doanh Thu</h3>
          <div style={{ height: '340px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }} 
                  tickFormatter={(value) => `${value / 1000000}M`} 
                  dx={-10}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ stroke: 'rgba(79, 70, 229, 0.4)', strokeWidth: 2, strokeDasharray: '4 4' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#4f46e5" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Occupancy Pie Chart */}
        <div className="premium-card chart-card">
          <h3 className="chart-title">Tình Trạng Phòng</h3>
          <div style={{ height: '340px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={occupancyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={95}
                  outerRadius={125}
                  paddingAngle={6}
                  dataKey="value"
                  stroke="none"
                  animationDuration={1500}
                >
                  {occupancyData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={PIE_COLORS[index % PIE_COLORS.length]} 
                      style={{ filter: `drop-shadow(0px 8px 12px ${PIE_COLORS[index % PIE_COLORS.length]}40)` }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  formatter={(value) => <span style={{ color: 'var(--text-primary)', fontWeight: 600, paddingLeft: '4px' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  )
}
