import type { InfoBoxProps } from "../types";

export default function InfoBox({
  icon,
  number,
  title,
  description,
}: InfoBoxProps) {
  return (
    <div className="flex-1 items-start border-2px rounded-2xl w-full pt-[28px] pb-[32px] px-[24px] bg-transparent hover:bg-[rgba(13,148,136,0.05)] transition-colors duration-250">
      <div className="mb-[25px] w-5 h-5">{icon}</div>
      <div className="mb-[8px] font-space text-[10px] font-semibold tracking-[0.12em] uppercase text-[rgba(0,0,0,0.4)]">
        {number}
      </div>
      <h3 className="mb-[8px] font-space font-md text-[16px] font-bold">
        {title}
      </h3>

      <p className="font-space text-[14px]">{description}</p>
    </div>
  );
}
