import { cn } from "@/lib/utils";

export function SovaMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("size-20", className)}
      fill="none"
      viewBox="0 0 96 96"
    >
      <defs>
        <linearGradient id="sova-gradient" x1="14" x2="82" y1="10" y2="88">
          <stop stopColor="#796BFF" />
          <stop offset="1" stopColor="#B73BE8" />
        </linearGradient>
      </defs>
      <path
        d="M18 36 8 19l24 8A35 35 0 0 1 48 23a35 35 0 0 1 16 4l24-8-10 17a34 34 0 1 1-60 0Z"
        fill="url(#sova-gradient)"
      />
      <circle cx="37" cy="49" r="10" fill="white" fillOpacity=".96" />
      <circle cx="59" cy="49" r="10" fill="white" fillOpacity=".96" />
      <circle cx="37" cy="49" r="5" fill="#24205C" />
      <circle cx="59" cy="49" r="5" fill="#24205C" />
      <path d="m48 52 5 7-5 4-5-4 5-7Z" fill="#FBBC4A" />
    </svg>
  );
}
