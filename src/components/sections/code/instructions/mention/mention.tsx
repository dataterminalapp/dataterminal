import { cn } from "@/lib/utils";
import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";

export function Mention(props: NodeViewProps) {
  // const entity = useAppSelector(
  //   (state) => state.schema.entities[props.node.attrs.id]
  // );
  {
    /* {entity.type === BaseEntityType.Table && (
          <TableIcon className="size-2.5" />
        )} */
  }

  return (
    <NodeViewWrapper className="inline w-fit">
      <span className={cn("rounded bg-white/5 px-1 border font-medium")}>
        @{props.node.attrs.label}
      </span>
    </NodeViewWrapper>
  );
}
