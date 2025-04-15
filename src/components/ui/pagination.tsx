import * as React from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DotsHorizontalIcon,
  ResumeIcon,
} from "@radix-ui/react-icons";

import { cn } from "@/lib/utils";
import { ButtonProps, buttonVariants } from "@/components/ui/button";
import { ChevronFirstIcon, ChevronLastIcon } from "lucide-react";
import { Input } from "./input";
import { useFocusContext } from "@/contexts/focus";
import { useResultContext } from "@/contexts/result";
import { preventDefaultAndStopPropagation } from "../utils";

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
);
Pagination.displayName = "Pagination";

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
));
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
));
PaginationItem.displayName = "PaginationItem";

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<ButtonProps, "size"> &
  React.ComponentProps<"a">;

const PaginationLink = ({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) => (
  <a
    tabIndex={-1}
    aria-current={isActive ? "page" : undefined}
    className={cn(
      buttonVariants({
        variant: isActive ? "outline" : "ghost",
        size,
      }),
      className
    )}
    {...props}
  />
);
PaginationLink.displayName = "PaginationLink";

const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="default"
    className={cn("gap-1 px-1.5", className)}
    {...props}
  >
    <ChevronLeftIcon className="h-4 w-4" />
  </PaginationLink>
);
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationFirst = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to first page"
    size="default"
    className={cn("gap-1 px-1.5", className)}
    onFocus={(e) => e.currentTarget.blur()}
    {...props}
  >
    <ChevronFirstIcon className={cn("h-4 w-4", className)} />
  </PaginationLink>
);
PaginationFirst.displayName = "PaginationFirst";

const PaginationNext = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to next page"
    size="default"
    className={cn("gap-1 px-1.5", className)}
    onFocus={(e) => e.currentTarget.blur()}
    {...props}
  >
    <ChevronRightIcon className="h-4 w-4" />
  </PaginationLink>
);
PaginationNext.displayName = "PaginationNext";

const PaginationCursor = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Fetch more from cursor"
    size="default"
    className={cn("gap-1 px-1.5 h-6", className)}
    onFocus={(e) => e.currentTarget.blur()}
    {...props}
  >
    <ResumeIcon className="h-4 w-4" />
  </PaginationLink>
);
PaginationCursor.displayName = "PaginationCursor";

const PaginationLast = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to last page"
    size="default"
    className={cn("gap-1 px-1.5", className)}
    onFocus={(e) => e.currentTarget.blur()}
    {...props}
  >
    <ChevronLastIcon className={cn("h-4 w-4", className)} />
  </PaginationLink>
);
PaginationLast.displayName = "PaginatioLast";

const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <DotsHorizontalIcon className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

const PaginationEditableIndex = ({
  className,
  index,
  max,
  onValueChange,
  ...props
}: {
  index: number;
  max: number;
  onValueChange: (index: number) => void;
} & React.ComponentProps<"div">) => {
  const { id: resultId } = useResultContext();
  const { setFocus, register } = useFocusContext();
  const ref = React.useRef<HTMLInputElement>(null);
  const current = ref?.current;

  React.useEffect(() => {
    if (current) {
      register("result", "pagination", current, { id: resultId });
    }
  }, [current]);

  React.useEffect(() => {
    if (current) {
      current.value = index.toString();
    }
  }, [current, index]);

  const handleUpdate = React.useCallback(() => {
    if (current) {
      const newIndex = Number(current.value);
      let newValue: number;

      if (isNaN(newIndex)) {
        newValue = index;
      } else if (newIndex > max) {
        onValueChange(max);
        newValue = max;
      } else if (newIndex < 1) {
        onValueChange(1);
        newValue = 1;
      } else {
        onValueChange(newIndex);
        newValue = newIndex;
      }

      current.value = newValue.toString();
    }
  }, [current, index]);

  const handleOnBlur = React.useCallback(() => {
    handleUpdate();
    setFocus("editor", "input", { from: "pagination/handleOnBlur" });
  }, [handleUpdate, setFocus]);

  const handleOnKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleUpdate();
      }
    },
    [handleUpdate]
  );

  const handleOnClick: React.MouseEventHandler<HTMLDivElement> =
    React.useCallback(
      (e) => {
        preventDefaultAndStopPropagation(e);
        current?.focus();
        current?.select();
      },
      [current]
    );

  return (
    <div
      aria-hidden
      className={cn(
        "flex size-6 items-center justify-center cursor-text text-primary",
        className
      )}
      onClick={handleOnClick}
      {...props}
    >
      <Input
        min={1}
        max={max}
        className={cn(
          "w-fit h-fit px-0 py-0 text-center border-t-0 border-x-0 border-b rounded-none text-muted-foreground focus:text-primary focus:rounded-sm"
        )}
        ref={ref}
        defaultValue={index}
        type="number"
        onBlur={handleOnBlur}
        onKeyDown={handleOnKeyDown}
      />
    </div>
  );
};

PaginationEditableIndex.displayName = "PaginationEditableIndex";

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationFirst,
  PaginationNext,
  PaginationCursor,
  PaginationLast,
  PaginationEllipsis,
  PaginationEditableIndex,
};
