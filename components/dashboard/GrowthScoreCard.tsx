'use client'

import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'
import Card from '@/components/ui/Card'

type GrowthScoreCardProps = {
  score: number
}

export default function GrowthScoreCard({ score }: GrowthScoreCardProps) {
  const data = [{ name: 'Score', value: score, fill: '#F59E0B' }]

  return (
    <Card className="flex flex-col items-center justify-center min-h-[220px]" gradient>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
        Growth Score
      </p>
      <div className="h-36 w-36">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="100%"
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <RadialBar dataKey="value" cornerRadius={10} background={{ fill: '#e2e8f0' }} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-4xl font-bold text-slate-800">{score}</p>
      {score === 0 && (
        <p className="mt-1 text-sm text-slate-400">Start your journey!</p>
      )}
    </Card>
  )
}
