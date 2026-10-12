import { useEffect, useRef } from 'react';
const width = 800;
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
export default function ClickHeatmap({ clicks, mode }) {
  const ref = useRef(null);
  const ratio =
    median(clicks.map((click) => click.document_height)) /
    median(clicks.map((click) => click.document_width));
  const height = Math.max(100, Math.min(4000, Math.round(width * ratio)));
  useEffect(() => {
    const context = ref.current.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#f8fafc';
    context.fillRect(0, 0, width, height);
    context.strokeStyle = '#e2e8f0';
    for (let index = 1; index < 10; index++) {
      context.beginPath();
      context.moveTo((width * index) / 10, 0);
      context.lineTo((width * index) / 10, height);
      context.stroke();
      context.beginPath();
      context.moveTo(0, (height * index) / 10);
      context.lineTo(width, (height * index) / 10);
      context.stroke();
    }
    for (const click of clicks) {
      const x = (click.x / click.document_width) * width;
      const y = (click.y / click.document_height) * height;
      if (mode === 'dots') {
        context.fillStyle = 'rgba(220,38,38,0.7)';
        context.beginPath();
        context.arc(x, y, 5, 0, Math.PI * 2);
        context.fill();
      } else {
        const gradient = context.createRadialGradient(x, y, 0, x, y, 28);
        gradient.addColorStop(0, 'rgba(239,68,68,0.4)');
        gradient.addColorStop(1, 'rgba(239,68,68,0)');
        context.fillStyle = gradient;
        context.fillRect(x - 28, y - 28, 56, 56);
      }
    }
  }, [clicks, mode, height]);
  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      role="img"
      aria-label={`${mode === 'dots' ? 'Click dots' : 'Click heatmap'} showing ${clicks.length} clicks`}
      className="h-auto max-w-full rounded-lg border border-slate-200"
    >
      Canvas showing click positions for the selected page.
    </canvas>
  );
}
