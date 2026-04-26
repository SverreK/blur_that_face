export default function Footer() {
  return (
    <footer className="bg-[#0e0c15] text-white px-[48px] py-[28px] flex items-center justify-between">
      <div className="flex items-center gap-2">
        <img src="/blind.png" className="w-[22px] h-[22px]" />
        <span className="font-space font-bold text-[13px]">Blur That Guy</span>
      </div>

      <div className="text-[11px] text-white/30">
        Made by Sverre Kristian Thune
      </div>
    </footer>
  );
}
