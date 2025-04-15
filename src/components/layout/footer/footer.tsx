import { cn } from "@/lib/utils";
import ConnectionDialog from "../../sections/connections/dialog";
import Feedback from "../feedback";
import Position from "./position";

interface Props {
  className?: string;
}

const Footer = ({ className }: Props) => {
  return (
    <div className={cn("h-6 flex flex-row items-center", className)}>
      <ConnectionDialog />

      <div className="flex flex-row items-center ml-auto gap-2">
        <Position />
        <Feedback />
      </div>
    </div>
  );
};

export default Footer;
