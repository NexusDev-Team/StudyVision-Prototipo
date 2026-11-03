import { forwardRef } from "react";

const ScrollArea = forwardRef(function ScrollArea({ padding = "14px 20px 20px", flexColumn = false, children }, ref) {
  return (
    <div ref={ref} className={`flex-1 overflow-y-auto ${flexColumn ? "flex flex-col" : ""}`} style={{ padding }}>
      {children}
    </div>
  );
});

export default ScrollArea;
