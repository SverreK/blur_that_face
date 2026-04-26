import { useScrolled } from '../hooks/useScrolled.ts';
import { smoothScrollTo } from '../utils/smoothScroll';

interface HeaderProps {
  mode: 'landing' | 'app';
  onReset?: () => void;
}

export default function Header({ mode, onReset }: HeaderProps) {
  const scrolled = useScrolled(50);
  const solid = mode === 'app' || scrolled;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-[40px] h-[60px] backdrop-blur-sm transition-all duration-300 ${
        solid ? 'bg-[rgba(244,243,239,0.92)]' : 'bg-transparent'
      }`}
    >
      <div className="flex items-center gap-[10px]">
        <div className="flex items-center justify-center transition-all duration-300">
          <img src="/blind.png" className="w-[25px] h-[25px]" />
        </div>

        <a
          onClick={
            mode === 'landing'
              ? (e) => {
                  e.preventDefault();
                  smoothScrollTo('hero');
                }
              : undefined
          }
          className={`font-space font-bold text-[18px] tracking-[-0.03em] transition-colors duration-300 ${
            solid ? 'text-black' : 'text-white'
          } ${mode === 'landing' ? 'cursor-pointer' : 'cursor-default'}`}
        >
          Blur That Face
        </a>
      </div>

      <nav className="flex items-center">
        <ul className="flex items-center gap-5 text-[13px]">
          {mode === 'landing' ? (
            <>
              <li>
                <a
                  onClick={(e) => {
                    e.preventDefault();
                    smoothScrollTo('how-it-works');
                  }}
                  className={`cursor-pointer transition-colors duration-300 ${
                    solid
                      ? 'text-[rgba(24,23,31,0.6)]'
                      : 'text-[rgba(255,255,255,0.65)]'
                  }`}
                >
                  How it works
                </a>
              </li>

              <li>
                <a
                  onClick={(e) => {
                    e.preventDefault();
                    smoothScrollTo('get-started');
                  }}
                  className={`font-sans font-medium text-[13px] rounded-[7px] backdrop-blur-[10px] transition-all duration-200 ease-out hover:-translate-y-[0.5px] hover:bg-teal-600 cursor-pointer ${
                    solid
                      ? 'bg-[rgb(24,23,31)] text-white border border-[rgb(24,23,31)] px-[18px] py-[7px]'
                      : 'bg-slate-600 text-white border border-[rgba(255,255,255,0.25)] px-[17px] py-[6px]'
                  }`}
                >
                  Get started
                </a>
              </li>
            </>
          ) : (
            <>
              <li>
                <button
                  type="button"
                  onClick={onReset}
                  className="text-[rgba(24,23,31,0.6)] cursor-pointer hover:text-[rgba(24,23,31,0.9)] transition-colors duration-200"
                >
                  Cancel
                </button>
              </li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
}
