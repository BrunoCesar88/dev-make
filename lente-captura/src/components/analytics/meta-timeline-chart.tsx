'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { MetaTimeSeriesPoint } from '@/lib/tracker/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

interface MetaTimelineChartProps {
  series: MetaTimeSeriesPoint[];
}

export function MetaTimelineChart({ series }: MetaTimelineChartProps) {
  if (!series.length) {
    return (
      <p className="py-8 text-center text-[13px] text-[var(--brand-text-tertiary)]">
        Sem série temporal no período
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
              label: 'Investimento (R$)',
              data: series.map((row) => row.spend),
              borderColor: '#d97706',
              backgroundColor: 'rgba(217, 119, 6, 0.1)',
              fill: true,
              tension: 0.3,
              yAxisID: 'y',
              pointRadius: 2,
            },
            {
              label: 'Leads WhatsApp',
              data: series.map((row) => row.leads),
              borderColor: '#2563eb',
              backgroundColor: 'rgba(37, 99, 235, 0.08)',
              fill: true,
              tension: 0.3,
              yAxisID: 'y1',
              pointRadius: 2,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              position: 'bottom',
              labels: { boxWidth: 10, font: { size: 11 } },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { maxTicksLimit: 8, font: { size: 10 } },
            },
            y: {
              type: 'linear',
              position: 'left',
              grid: { color: 'rgba(0,0,0,0.04)' },
              ticks: { font: { size: 10 } },
              title: {
                display: true,
                text: 'R$',
                font: { size: 10 },
              },
            },
            y1: {
              type: 'linear',
              position: 'right',
              grid: { drawOnChartArea: false },
              ticks: { font: { size: 10 }, precision: 0 },
              title: {
                display: true,
                text: 'Leads',
                font: { size: 10 },
              },
            },
          },
        }}
      />
    </div>
  );
}
