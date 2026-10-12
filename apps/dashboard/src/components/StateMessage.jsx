export default function StateMessage({ children, error = false }) {
  return (
    <p
      role={error ? 'alert' : 'status'}
      className={`rounded-lg p-4 text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-500'}`}
    >
      {children}
    </p>
  );
}
