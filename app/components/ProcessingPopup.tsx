export default function ProcessingPopup({ children, ...props }: { children: React.ReactNode }) {
  return (
    <div {...props} className="top-unset absolute top-40 z-10 my-2 h-10 w-full md:top-10">
      <div className="absolute left-1/2 w-4/5 -translate-x-1/2 transform rounded border border-accent-2 bg-background px-8 py-3 md:w-fit md:py-4">
        <span className="absolute top-0 right-0 flex h-3 w-3 translate-x-1/2 -translate-y-1/2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-3 opacity-75"></span>
          <span className="relative inline-flex h-3 w-3 rounded-full bg-accent-3"></span>
        </span>
        <div className="flex justify-around font-bold text-accent-3">{children}</div>
      </div>
    </div>
  );
}
