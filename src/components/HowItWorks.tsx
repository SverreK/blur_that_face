import InfoBox from "./InfoBox";
import Arrow from "./Arrow";

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="min-h-screen bg-[#f4f3ef] px-[96px] py-[65px]"
    >
      <div className="max-w-[1100px] mx-auto">
        <h1 className="mb-[46px] font-space text-[40px] text-black font-bold tracking-tight">
          How it works
        </h1>

        <div className="flex items-start">
          <div className="flex-1 min-w-0">
            <InfoBox
              icon={
                <svg viewBox="0 0 384 512" className="w-7 h-7">
                  <path d="M0 64C0 28.7 28.7 0 64 0L213.5 0c17 0 33.3 6.7 45.3 18.7L365.3 125.3c12 12 18.7 28.3 18.7 45.3L384 448c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm208-5.5l0 93.5c0 13.3 10.7 24 24 24L325.5 176 208 58.5zM175 441c9.4 9.4 24.6 9.4 33.9 0l64-64c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0l-23 23 0-86.1c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 86.1-23-23c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l64 64z" />
                </svg>
              }
              number="01"
              title="Drop your video"
              description="Drag & drop any MP4, MOV or AVI file. Everything stays on your device — nothing leaves your machine."
            />
          </div>

          <div className="px-[6px] pt-[40px] flex-shrink-0 text-black/20">
            <Arrow />
          </div>

          <div className="flex-1 min-w-0">
            <InfoBox
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                  {" "}
                  <path d="M9.4 9.4C21.9-3.1 42.1-3.1 54.6 9.4L128 82.7 128 64c0-17.7 14.3-32 32-32s32 14.3 32 32l0 96c0 17.7-14.3 32-32 32l-96 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l18.7 0-73.4-73.4C-3.1 42.1-3.1 21.9 9.4 9.4zM200 256a56 56 0 1 1 112 0 56 56 0 1 1 -112 0zM502.6 54.6L429.3 128 448 128c17.7 0 32 14.3 32 32s-14.3 32-32 32l-96 0c-17.7 0-32-14.3-32-32l0-96c0-17.7 14.3-32 32-32s32 14.3 32 32l0 18.7 73.4-73.4c12.5-12.5 32.8-12.5 45.3 0s12.5 32.8 0 45.3zm-45.3 448L384 429.3 384 448c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-96c0-17.7 14.3-32 32-32l96 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-18.7 0 73.4 73.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0zM9.4 457.4L82.7 384 64 384c-17.7 0-32-14.3-32-32s14.3-32 32-32l96 0c17.7 0 32 14.3 32 32l0 96c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-18.7-73.4 73.4c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3z" />{" "}
                </svg>
              }
              number="02"
              title="AI detects faces"
              description="Google's BlazeFace model runs directly in your browser via MediaPipe — a fast, lightweight detector that requires no GPU server."
            />
          </div>

          <div className="px-[6px] pt-[40px] flex-shrink-0 text-black/20">
            <Arrow />
          </div>

          <div className="flex-1 min-w-0">
            <InfoBox
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                  {" "}
                  <path d="M224 248a120 120 0 1 0 0-240 120 120 0 1 0 0 240zm-29.7 56C95.8 304 16 383.8 16 482.3 16 498.7 29.3 512 45.7 512l356.6 0c16.4 0 29.7-13.3 29.7-29.7 0-98.5-79.8-178.3-178.3-178.3l-59.4 0z" />{" "}
                </svg>
              }
              number="03"
              title="Click to blur"
              description="Pick which faces to blur. Adjust intensity per person. Leave the others untouched — you stay in full control."
            />
          </div>

          <div className="px-[6px] pt-[40px] flex-shrink-0 text-black/20">
            <Arrow />
          </div>

          <div className="flex-1 min-w-0">
            <InfoBox
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
                  {" "}
                  <path d="M246.6 9.4c-12.5-12.5-32.8-12.5-45.3 0l-128 128c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 109.3 192 320c0 17.7 14.3 32 32 32s32-14.3 32-32l0-210.7 73.4 73.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-128-128zM64 352c0-17.7-14.3-32-32-32S0 334.3 0 352l0 64c0 53 43 96 96 96l256 0c53 0 96-43 96-96l0-64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64c0 17.7-14.3 32-32 32L96 448c-17.7 0-32-14.3-32-32l0-64z" />{" "}
                </svg>
              }
              number="04"
              title="Export"
              description="Render and download your video. Same quality, same length — just the right faces blurred out."
            />
          </div>
        </div>
      </div>
    </section>
  );
}
