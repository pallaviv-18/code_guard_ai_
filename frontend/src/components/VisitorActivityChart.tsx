import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DailyVisitorStats } from '../hooks/useVisitorAnalytics'

type VisitorActivityChartProps = {
  daily: DailyVisitorStats[]
}

export default function VisitorActivityChart({ daily }: VisitorActivityChartProps) {
  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={daily} margin={{ top: 16, right: 4, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7863f6" stopOpacity={0.24} />
              <stop offset="95%" stopColor="#7863f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="visitorsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#42b9a2" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#42b9a2" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#eeedf3" vertical={false} />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9b99a9', fontSize: 11 }}
            tickFormatter={(value: string) => new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}
            dy={10}
          />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9b99a9', fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ border: '1px solid #eeedf3', borderRadius: 10, fontSize: 12 }}
            labelFormatter={(value) => new Date(`${value}T00:00:00`).toLocaleDateString()}
          />
          <Area type="monotone" dataKey="views" name="Page views" stroke="#7863f6" strokeWidth={2.4} fill="url(#viewsGradient)" />
          <Area type="monotone" dataKey="unique_visitors" name="Visitors" stroke="#42b9a2" strokeWidth={2} fill="url(#visitorsGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
