import { useScrolled } from "../hooks/useScrolled.ts";

export default function Header() {
  const scrolled = useScrolled(50);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-[40px] h-[60px] backdrop-blur-sm transition-all duration-250 ${scrolled ? "bg-[rgba(244,243,239,0.92)]" : "bg-transparent"}`}
    >
      <div className="flex items-center gap-[10px]">
        <div
          className={`flex items-center justify-center transition-all duration-300`}
        >
          <img src="/blind.png" className="w-[25px] h-[25px]" />
        </div>

        <a
          href="#hero"
          className={`font-space font-bold text-[18px] tracking-[-0.03em] transition-colors duration-300 cursor-pointer ${
            scrolled ? "text-black" : "text-white"
          }`}
        >
          Blur That Face
        </a>
      </div>

      <nav className="flex items-center">
        <ul className="flex items-center gap-5 text-[13px]">
          <li>
            <a
              href="#how-it-works"
              className={`${scrolled ? "text-[rgba(24,23,31,0.6)]" : "text-[rgba(255,255,255,0.65)]"} cursor-pointer`}
            >
              How it works
            </a>
          </li>
          <li>
            <a
              href="#get-started"
              className={`
                font-sans font-medium text-[13px] rounded-[7px] backdrop-blur-[10px] transition-all duration-200 ease-out
                hover:-translate-y-[0.5px]
                hover:bg-teal-600 cursor-pointer ${
                  scrolled
                    ? "bg-[rgb(24,23,31)] text-white border border-[rgb(24,23,31)] px-[18px] py-[7px]"
                    : "bg-slate-600 text-white border border-[rgba(255,255,255,0.25)] px-[17px] py-[6px]"
                }`}
            >
              Get started
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
