export default function NoDataComponent({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative flex flex-col items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="1em"
          height="1em"
          fill="none"
          viewBox="0 0 336 336"
          className="absolute text-gray-500/20"
          style={{ width: "336px", height: "336px" }}
        >
          <mask
            id="circle-sm_svgb"
            width="336"
            height="336"
            x="0"
            y="0"
            maskUnits="userSpaceOnUse"
            style={{ maskType: "alpha" }}
          >
            <path fill="url(#circle-sm_svga)" d="M0 0h336v336H0z"></path>
          </mask>
          <g stroke="currentColor" mask="url(#circle-sm_svgb)">
            <circle cx="168" cy="168" r="47.5"></circle>
            <circle cx="168" cy="168" r="47.5"></circle>
            <circle cx="168" cy="168" r="71.5"></circle>
            <circle cx="168" cy="168" r="95.5"></circle>
            <circle cx="168" cy="168" r="119.5"></circle>
            <circle cx="168" cy="168" r="143.5"></circle>
            <circle cx="168" cy="168" r="167.5"></circle>
          </g>
          <defs>
            <radialGradient
              id="circle-sm_svga"
              cx="0"
              cy="0"
              r="1"
              gradientTransform="rotate(90 0 168)scale(168)"
              gradientUnits="userSpaceOnUse"
            >
              <stop></stop>
              <stop offset="1" stopOpacity="0"></stop>
            </radialGradient>
          </defs>
        </svg>
        <div className="z-10 flex flex-col items-center justify-center rounded-full bg-gray-850/70 w-12 h-12">
          <div className="z-10 flex flex-col items-center justify-center rounded-full bg-zinc-800/80 w-10 h-10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="text-gray-500 w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 10.5V6.8c0-1.68 0-2.52-.327-3.162a3 3 0 00-1.311-1.311C17.72 2 16.88 2 15.2 2H8.8c-1.68 0-2.52 0-3.162.327a3 3 0 00-1.311 1.311C4 4.28 4 5.12 4 6.8v10.4c0 1.68 0 2.52.327 3.162a3 3 0 001.311 1.311C6.28 22 7.12 22 8.8 22h2.7M22 22l-1.5-1.5m1-2.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z"
              />
            </svg>
            {/* Without rectangle: */}
            {/* <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="text-gray-500 w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M22 22l-1.5-1.5m1-2.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z"
              />
            </svg> */}
          </div>
        </div>
      </div>

      <div className="text-[11px] leading-4 font-medium text-gray-500">
        {message}
      </div>
    </div>
  );
}
