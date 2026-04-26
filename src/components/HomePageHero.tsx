import { motion } from "motion/react";

export default function Hero() {
  return (
    <section
      id="hero"
      className="min-h-screen flex flex-col justify-center items-center bg-[#0e0c15] text-white"
    >
      <h1 className="text-7xl font-space font-extrabold flex gap-3">
        <motion.span
          initial={{ y: 15, opacity: 0 }}
          animate={{
            y: 0,
            opacity: 1,
            filter: ["blur(0px)", "blur(0px)", "blur(6px)"],
          }}
          transition={{
            duration: 0.6,
            delay: 0,
            ease: "easeOut",
            filter: {
              delay: 0.2,
              duration: 1.8,
              ease: "easeInOut",
            },
          }}
        >
          Blur
        </motion.span>

        <motion.span
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            duration: 0.6,
            delay: 0.15,
            ease: "easeOut",
          }}
        >
          That
        </motion.span>

        <motion.span
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            duration: 0.6,
            delay: 0.3,
            ease: "easeOut",
          }}
          className="text-slate-400"
        >
          Face
        </motion.span>
      </h1>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.12, ease: "easeInOut" }}
        className="flex flex-col items-center text-mono text-sm text-[rgba(255,255,255,0.6)]"
      >
        <p className="mt-4">
          Drop a video. AI detects every face. You chose who gets blurred
        </p>
        <p>and how. Export in seconds</p>
      </motion.div>

      <motion.div
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.7 }}
        className="flex justify-center items-baseline mt-7 gap-4"
      >
        <motion.a
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.9, y: 1 }}
          transition={{ type: "spring" }}
          href="#get-started"
          className="text-sm text-[14px] font-space font-medium tracking-tighter rounded-md pt-[10px] pb-[10px] pl-[26px] pr-[26px] bg-[#475569]  transition-all duration-200 ease-out
            hover:bg-teal-600 cursor-pointer"
        >
          Start blurring
        </motion.a>
      </motion.div>
    </section>
  );
}
