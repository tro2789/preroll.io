export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[100vw] relative left-1/2 -translate-x-1/2 px-4 sm:px-6 -mt-3">
      {children}
    </div>
  )
}
