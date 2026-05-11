'use client';
export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-quiet text-sm">
      Print this list
    </button>
  );
}
