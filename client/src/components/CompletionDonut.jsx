/**
 * client/src/components/CompletionDonut.jsx
 * Donut chart showing enrolment completion status.
 * Adapted from ui2 DonutThreeSeriesChart.tsx + TrafficSourceCard.tsx
 */
import Chart from 'react-apexcharts';
import styles from './CompletionDonut.module.css';

const LABELS  = ['In Progress', 'Completed', 'Not Started'];
const COLORS  = ['#1a56db', '#16a34a', '#e2e8f0'];
const DOTS    = ['#1a56db', '#16a34a', '#94a3b8'];

export default function CompletionDonut({ inProgress = 0, completed = 0, notStarted = 0 }) {
  const series = [inProgress, completed, notStarted];
  const total  = inProgress + completed + notStarted;

  const options = {
    chart:  { type: 'donut', sparkline: { enabled: true } },
    colors: COLORS,
    labels: LABELS,
    legend: { show: false },
    stroke: { width: 0 },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              fontSize: '11px',
              fontWeight: 700,
              color: '#64748b',
              formatter: () => String(total),
            },
          },
        },
      },
    },
    tooltip: { theme: 'light' },
  };

  return (
    <div className={styles.wrap}>
      <p className={styles.title}>Completion Status</p>
      <Chart options={options} series={series} type="donut" height={180} />
      <div className={styles.legend}>
        {LABELS.map((label, i) => (
          <div key={label} className={styles.legendRow}>
            <span className={styles.dot} style={{ background: DOTS[i] }} />
            <span className={styles.legendLabel}>{label}</span>
            <span className={styles.legendVal}>{series[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
