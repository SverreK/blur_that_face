export default function Hero() {
  return (
    <section
      id="hero"
      className="min-h-screen flex flex-col justify-center items-center bg-[#0e0c15] text-white"
    >
      <h1 className="text-7xl font-space font-extrabold">
        <span className="blur-xs">Blur</span> <span>That</span>{" "}
        <span className="text-slate-400">Face</span>
      </h1>
      <div className="flex flex-col items-center text-mono text-sm text-[rgba(255,255,255,0.6)]">
        <p className="mt-4">
          Drop a video. AI detects every face. You chose who gets blurred
        </p>
        <p>and how. Export in seconds</p>
      </div>

      <ul>
        <li className="flex justify-center items-baseline mt-7 gap-4">
          <a
            href="#get-started"
            className="text-sm text-[14px] font-space font-medium tracking-tighter rounded-md pt-[10px] pb-[10px] pl-[26px] pr-[26px] bg-[#475569]  transition-all duration-200 ease-out
            hover:-translate-y-[1px]
            hover:bg-teal-600 cursor-pointer"
          >
            Start blurring
          </a>
          <p className="text-[13px] font-space text-[rgba(255,255,255,0.25)]">
            Google BlazeFace 100% local
          </p>
        </li>
      </ul>
    </section>
  );
}
