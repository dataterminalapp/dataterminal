import { motion } from "framer-motion";

export const WordmarkSVG = ({ className }: { className?: string }) => {
  const variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      transition={{ duration: 1 }}
    >
      <svg
        width="808"
        height="690"
        viewBox="0 0 808 690"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <g filter="url(#filter0_i_0_1)">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M458.044 10.368C473.397 -4.11198 497.512 -3.32921 511.906 12.116L797.694 318.782C811.435 333.527 811.435 356.472 797.694 371.217L511.906 677.882C497.512 693.33 473.397 694.112 458.044 679.63C442.691 665.148 441.912 640.89 456.306 625.45L717.665 345L456.306 64.5513C441.912 49.1061 442.691 24.8473 458.044 10.368Z"
            fill="url(#paint0_linear_0_1)"
          />
        </g>
        <g filter="url(#filter1_i_0_1)">
          <path
            d="M345 2C299.694 2 254.832 10.872 212.974 28.1093C171.117 45.3467 133.084 70.6119 101.048 102.462C69.0119 134.313 43.5994 172.125 26.2615 213.74C8.92368 255.354 -6.84102e-06 299.957 0 345C6.84103e-06 390.043 8.9237 434.646 26.2616 476.26C43.5995 517.875 69.012 555.687 101.048 587.538C133.084 619.388 171.117 644.653 212.974 661.891C254.832 679.128 299.694 688 345 688L345 345L345 2Z"
            fill="url(#paint1_linear_0_1)"
          />
        </g>
        <defs>
          <filter
            id="filter0_i_0_1"
            x="446"
            y="0"
            width="362"
            height="694"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feOffset dy="5" />
            <feGaussianBlur stdDeviation="2" />
            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
            />
            <feBlend
              mode="normal"
              in2="shape"
              result="effect1_innerShadow_0_1"
            />
          </filter>
          <filter
            id="filter1_i_0_1"
            x="0"
            y="2"
            width="345"
            height="690"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feOffset dy="5" />
            <feGaussianBlur stdDeviation="2" />
            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
            />
            <feBlend
              mode="normal"
              in2="shape"
              result="effect1_innerShadow_0_1"
            />
          </filter>
          <linearGradient
            id="paint0_linear_0_1"
            x1="627"
            y1="-0.775281"
            x2="627"
            y2="690"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="white" />
            <stop offset="1" stopColor="white" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient
            id="paint1_linear_0_1"
            x1="345"
            y1="1.22921"
            x2="345"
            y2="688"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="white" />
            <stop offset="1" stopColor="white" stopOpacity="0.5" />
          </linearGradient>
        </defs>
      </svg>
    </motion.div>
  );
};
