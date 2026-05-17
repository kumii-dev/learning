/**
 * client/src/components/WeeklyActivityChart.jsx
 * Bar chart: lessons completed per day over the last 7 days.
 * Adapted from ui2 CourseActivityCard.tsx / DoubleBarChartSevenSeries.tsx
 */
import Chart from 'react-apexcharts';
import styles from './WeeklyActivityChart.module.css';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Build last-7-days activity from enrolments array.
 * Uses enrolment.updated_at as a proxy for "last active".
 */
function buildActivity(enrolments) {
  const counts = new Array(7).fill(0);
  const now = new Date();
  enrolments.forEach((e) => {
    if (!e.updated_at) return;
    const diff = Math.floor((now - new Date(e.updated_at)) / 86400000);
    if (diff >= 0 && diff < 7) counts[6 - diff] += 1;
  });
  return counts;
}

function last7DayLabels() {
  const labels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(DAY_LABELS[d.getDay()]);
  }
  return labels;
}

export default function WeeklyActivityChart({ enrolments = [] }) {
  const data   = buildActivity(enrolments);
  const labels = last7DayLabels();

  const options = {
    chart: { type: 'bar', toolbar: { show: false }, sparkline: { enabled: false } },
    colors: ['#16a34a'],
    plotOptions: {
      bar: { borderRadius: 5, columnWidth: '50%' },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: labels,
      axisBorder: { show: false },
      axisTicks:  { show: false },
      labels: { style: { fontSize: '11px', colors: '#94a3b8' } },
    },
    yaxis: {
      labels: { style: { fontSize: '11px', colors: '#94a3b8' } },
      min: 0,
      tickAmount: 3,
    },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    tooltip: { theme: 'light', y: { formatter: (v) => `${v} update${v !== 1 ? 's' : ''}` } },
  };

  return (
    <div className={styles.wrap}>
      <p className={styles.title}>Weekly Activity</p>
      <p className={styles.sub}>Course updates in the last 7 days</p>
      <Chart options={options} series={[{ name: 'Activity', data }]} type="bar" height={150} />
    </div>
  );
}
