export function Navbar() {
  return (
    <nav className="border-b border-surface-800 bg-surface-950/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-2.5">
            <svg className="w-7 h-7" viewBox="0 0 80 80" fill="none">
              <defs>
                <linearGradient id="nav-logo-g" x1="16" y1="8" x2="64" y2="72" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#34d399"/>
                  <stop offset="100%" stopColor="#059669"/>
                </linearGradient>
              </defs>
              <path d="M40 12 L58 62 L50 62 L40 34 L30 62 L22 62 Z" fill="url(#nav-logo-g)"/>
              <rect x="18" y="50" width="44" height="4" rx="2" fill="#065f46"/>
            </svg>
            <span className="text-xl font-bold text-white tracking-tight">
              Writent
            </span>
          </a>
          <div className="text-xs text-surface-500 tracking-widest uppercase">
            The Most Humanly AI Writer
          </div>
        </div>
      </div>
    </nav>
  );
}
