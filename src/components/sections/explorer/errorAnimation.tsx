import { cn } from "@/lib/utils";
import { XCircleIcon } from "lucide-react";
import { useEffect } from "react";
import { motion, useAnimation } from "framer-motion";

const DatabaseErrorAnimation = ({
  className,
  title = "Something went wrong",
  errorMessage,
}: {
  className?: string;
  title?: string;
  errorMessage?: string;
}) => {
  const controls = useAnimation();

  useEffect(() => {
    const errorAnimation = async () => {
      await controls.start({
        rotate: [0, -15, 15, -15, 15, 0],
        transition: {
          duration: 0.6,
          repeat: 0,
          ease: "easeInOut",
        },
      });
    };

    errorAnimation();
  }, [controls]);

  return (
    <div className={cn(className, "rounded-md bg-zinc-700/15 p-4")}>
      <div className="flex">
        <div>
          <motion.div
            animate={controls}
            className={cn("size-7 text-muted-foreground")}
          >
            <XCircleIcon className="size-5 text-muted-foreground stroke-1" />
          </motion.div>
        </div>
        <div className="ml-3 overflow-hidden">
          <h3 className="text-sm text-muted-foreground">{title}</h3>
          <div className="mt-2 text-sm">
            <p className="text-primary pt-2 grayscale">{errorMessage}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseErrorAnimation;
