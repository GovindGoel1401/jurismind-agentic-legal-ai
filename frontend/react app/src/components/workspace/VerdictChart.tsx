import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { VerdictProbabilityItem } from './types'

interface VerdictChartProps {
  data: VerdictProbabilityItem[]
}

export default function VerdictChart({ data }: VerdictChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.35} />
          <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
          <YAxis
            stroke="#94a3b8"
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            cursor={{ fill: 'rgba(59,130,246,0.1)' }}
            formatter={(value: number) => [`${value}%`, 'Probability']}
            contentStyle={{
              backgroundColor: '#111827',
              border: '1px solid rgba(59,130,246,0.35)',
              borderRadius: '10px',
              color: '#E5E7EB',
            }}
          />
          <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={1000}>
            {data.map((entry) => (
              <Cell key={entry.label} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
