import FlickeringGrid from "../ui/flickeringgrid";

const Loading = () => {
  return (
    <>
      <div
        className="relative h-full w-full"
        style={{
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 0%, black 30%, transparent 70%)",
          maskImage:
            "radial-gradient(ellipse at center, black 0%, black 30%, transparent 70%)",
        }}
      >
        <div className="absolute h-full w-full">
          <FlickeringGrid
            color="rgb(57, 57, 58)"
            squareSize={2}
            gridGap={4}
            maxOpacity={0.5}
            flickerChance={1}
          />
        </div>
      </div>
    </>
  );
};

export default Loading;
