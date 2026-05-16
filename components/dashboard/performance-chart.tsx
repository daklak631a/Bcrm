'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

const data = [
  {
    name: "Jan",
    loans: 4000,
    deposits: 2400,
  },
  {
    name: "Feb",
    loans: 3000,
    deposits: 1398,
  },
  {
    name: "Mar",
    loans: 2000,
    deposits: 9800,
  },
  {
    name: "Apr",
    loans: 2780,
    deposits: 3908,
  },
  {
    name: "May",
    loans: 1890,
    deposits: 4800,
  },
  {
    name: "Jun",
    loans: 2390,
    deposits: 3800,
  },
];

export function PerformanceChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{
          top: 10,
          right: 10,
          left: -20,
          bottom: 0,
        }}
        barSize={20}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          fontSize={12} 
          tickMargin={10} 
          stroke="hsl(var(--muted-foreground))"
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          fontSize={12} 
          tickFormatter={(value) => `$${value/1000}k`}
          stroke="hsl(var(--muted-foreground))"
        />
        <Tooltip 
          cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
          contentStyle={{ 
            backgroundColor: 'hsl(var(--card))', 
            borderRadius: '8px',
            border: '1px solid hsl(var(--border))',
            fontSize: '12px'
          }}
          formatter={(value: number) => [`$${value}`, undefined]}
        />
        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
        <Bar dataKey="loans" name="Loans" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        <Bar dataKey="deposits" name="Deposits" fill="hsl(var(--secondary-foreground))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
