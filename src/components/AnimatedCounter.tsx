"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

export default function AnimatedCounter({ value }: { value: number }) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const current = useRef(value);
  useEffect(() => {
    if (reduceMotion) { current.current = value; return; }
    const startValue = current.current;
    let start: number | null = null;
    let frame = 0;
    const step = (time: number) => {
      start ??= time;
      const progress = Math.min((time - start) / 450, 1);
      current.current = startValue + (value - startValue) * (1 - Math.pow(1 - progress, 3));
      setDisplay(progress === 1 ? value : Math.round(current.current));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, reduceMotion]);
  return <>{(reduceMotion ? value : display).toLocaleString(undefined, { maximumFractionDigits: 2 })}</>;
}
