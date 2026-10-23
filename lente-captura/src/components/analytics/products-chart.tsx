'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const COLORS = ['#2563eb', '#d97706', '#16a34a', '#7c3aed', '#dc2626', '#0891b2'];

export function ProductsChart({
  series,
}: {
  series: Array<{
    date: string;
    product_id: string;
    product_name: string;
    sales: number;
  }>;
}) {
  if (!series.length) {
    return (
      <p className="py-8 text-center text-[13px] text-[var(--brand-text-tertiary)]">
        Sem vendas por produto no período
      </p>
    );
  }

  const dates = [...new Set(series.map((row) => row.date))].sort();
  const products = [...new Map(
    series.map((row) => [row.product_id, row.product_name || row.product_id])
  ).entries()];

  const labels = dates.map((date) => {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  });

  const datasets = products.slice(0, 6).map(([productId, productName], index) => ({
    label: productName,
    data: dates.map((date) => {
      const row = series.find((item) => item.date === date && item.product_id === productId);
      return row?.sales ?? 0;
    }),
    backgroundColor: COLORS[index % COLORS.length],
  }));

  return (
    <div className="h-64">
      <Bar
        data={{ labels, datasets }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } },
          scales: {
            x: { stacked: true },
            y: { stacked: true, ticks: { precision: 0 } },
          },
        }}
      />
    </div>
  );
}
