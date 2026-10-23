'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler
);

export function RevenueChart({
  series,
}: {
  series: Array<{ date: string; revenue: number; sales: number }>;
}) {
  if (!series.length) {
    return (
      <p className="py-8 text-center text-[13px] text-[var(--brand-text-tertiary)]">
        Sem receita no período
      </p>
    );
  }

  const labels = series.map((row) => {
    const [y, m, d] = row.date.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  });

  return (
    <div className="h-64">
      <Line
        data={{
          labels,
          datasets: [
            {
              label: 'Receita',
              data: series.map((row) => row.revenue),
              borderColor: '#d97706',
              backgroundColor: 'rgba(217, 119, 6, 0.08)',
              fill: true,
              tension: 0.3,
              yAxisID: 'y',
            },
            {
              label: 'Vendas',
              data: series.map((row) => row.sales),
              borderColor: '#2563eb',
              backgroundColor: 'transparent',
              tension: 0.3,
              yAxisID: 'y1',
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { position: 'bottom' } },
          scales: {
            y: {
              type: 'linear',
              position: 'left',
              ticks: { precision: 0 },
            },
            y1: {
              type: 'linear',
              position: 'right',
              grid: { drawOnChartArea: false },
              ticks: { precision: 0 },
            },
          },
        }}
      />
    </div>
  );
}
