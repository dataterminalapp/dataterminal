import { cn } from "@/lib/utils";
import { FuseResultMatch } from "fuse.js";

const HighlightedText = ({
  text,
  matches,
}: {
  text: string;
  matches?: readonly FuseResultMatch[];
}): JSX.Element => {
  if (!matches || matches.length === 0) return <>{text}</>;

  const result = [];
  let lastIndex = 0;

  matches.forEach((match, i) => {
    match.indices.forEach(([start, end]) => {
      // Add non-highlighted text before match
      if (start > lastIndex) {
        result.push(text.slice(lastIndex, start));
      }

      // Add highlighted text with background
      result.push(
        <span
          key={`${i}-${start}`}
          // VS Code Highlight color
          style={{ background: "#5A2B19" }}
          className={cn("py-0.5")}
        >
          {text.slice(start, end + 1)}
        </span>
      );

      lastIndex = end + 1;
    });
  });

  // Add remaining text after last match
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return <>{result}</>;
};

export default HighlightedText;
