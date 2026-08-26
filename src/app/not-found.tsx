import Link from 'next/link'
 
export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="relative z-10 space-y-6 max-w-md">
        <h2 className="text-6xl font-bold text-primary">404</h2>
        <h3 className="text-2xl font-semibold text-white">Page Not Found</h3>
        <p className="text-gray-400">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link 
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(255,191,0,0.3)] hover:shadow-[0_0_25px_rgba(255,191,0,0.5)]"
        >
          Return Home
        </Link>
      </div>
    </div>
  )
}
