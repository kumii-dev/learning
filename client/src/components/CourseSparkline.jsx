/**
 * client/src/components/CourseSparkline.jsx
 * Tiny sparkline for career/course cards.
 * Adapted from ui2 SmallAreaChart.tsx
 */
import Chart from 'react-apexcharts';

const MOCK_DATA = {
  grad0: [12, 19, 15, 27, 22, 31, 38],
  grad1: [8,  14, 11, 18, 25, 20, 34],
  grad2: [5,  10, 16, 13, 22, 28, 24],
  default: [10, 13, 18, 15, 22, 20, 28],
};

export default function CourseSparkline({ grad = 'default', color = '#fff' }) {
  const data = MOCK_DATA[grad] ?? MOCK_DATA.default;

  const options = {
    chart: {
      type: 'area',
      sparkline: { enabled: true },
      toolbar: { show: false },
      animations: { enabled: false },
    },
    stroke: { curve: 'smooth', width: 2, colors: [color] },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0,
        stops: [0, 100],
        colorStops: [{ offset: 0, color, opacity: 0.35 }, { offset: 100, color, opacity: 0 }],
      },
    },
    tooltip: { enabled: false },
    grid: { show: false },
    xaxis: { labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { show: false },
  };

  return (
    <Chart
      options={options}
      series={[{ data }]}
      type="area"
      width={80}
      height={42}
    />
  );
}
