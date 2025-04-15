import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "../../ui/breadcrumb";
import { IconByTabType } from "../tabs";
import { TabType } from "@/features/tabs";
import { Fragment } from "react/jsx-runtime";
import { ChevronLeftIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";

const NavBar = ({
  tabType,
  items,
  className,
  onBack,
}: {
  tabType: TabType;
  items: Array<string>;
  className?: string;
  onBack?: () => void;
}) => {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 pt-4 pl-0 px-4 md:px-10",
        className
      )}
    >
      <Breadcrumb>
        <BreadcrumbList>
          <Button
            variant={"ghost"}
            size={"icon"}
            className={cn(
              onBack
                ? "visible text-muted-foreground hover:text-primary"
                : "invisible",
              "h-8"
            )}
            onClick={onBack}
            data-testid="nav-back-button"
          >
            <ChevronLeftIcon className="size-5" />
          </Button>
          <BreadcrumbItem>
            <BreadcrumbLink>
              <div className="flex items-center truncate">
                <div className="p-1.5 mr-2 rounded bg-zinc-800 shrink-0 border border-zinc-700">
                  <IconByTabType tabType={tabType} />
                </div>
                {tabType === "Results" ? "Editor" : tabType}
              </div>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {items.map((item, index) => (
            <Fragment key={"bi_fragment_" + item}>
              <BreadcrumbSeparator
                key={"bi_separator_" + item}
                className="mt-0.5"
              />
              <BreadcrumbItem
                key={"bi_" + item}
                className={
                  index === items.length - 1
                    ? "text-primary"
                    : "hover:text-primary"
                }
              >
                {item}
              </BreadcrumbItem>
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};

export default NavBar;
