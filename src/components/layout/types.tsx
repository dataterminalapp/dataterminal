import React, { useCallback, useState } from "react";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check } from "lucide-react";
import { Button } from "../ui/button";
import DetectBoardKey from "../utils/shortcuts/detectBoardKey";

const Layouts = () => {
  const [selectedLayout, setSelectedLayout] = useState<string>("Terminal");

  const layouts = [
    { title: "Terminal", description: "Command-line interface" },
    { title: "Editor", description: "Code editing environment" },
    { title: "Notebooks", description: "Interactive coding notebooks" },
  ];

  const handleSelect = useCallback((title: string) => {
    setSelectedLayout(title);
  }, []);

  const handleKeyMove = useCallback((id?: string) => {
    if (id) {
      setSelectedLayout(id);
    }
  }, []);

  return (
    <div>
      <div className="grid grid-cols-3 max-w-6xl gap-4">
        {layouts.map((layout, index) => (
          <>
            <Card
              key={layout.title}
              className={`w-full cursor-pointer transition-all ${
                selectedLayout === layout.title
                  ? "ring-2 ring-green-500 shadow-lg"
                  : "hover:shadow-md"
              }`}
              onClick={() => handleSelect(layout.title)}
            >
              <CardHeader>
                <CardTitle>{layout.title}</CardTitle>
                <CardDescription>{layout.description}</CardDescription>
              </CardHeader>
              {/* <CardContent>
                            <p>Card Content</p>
                        </CardContent> */}
              <CardFooter>
                {selectedLayout === layout.title && (
                  <Check className="size-4 stroke-green-500 ml-auto" />
                )}
              </CardFooter>
            </Card>
            <DetectBoardKey
              id={layout.title}
              boardKey={String(index + 1)}
              onKeyPress={handleKeyMove}
            />
          </>
        ))}
      </div>
      <Button type="submit" className="mt-10">
        Continue
      </Button>
    </div>
  );
};

export default Layouts;
