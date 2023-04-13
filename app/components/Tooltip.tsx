import React, { useState, Ref } from "react";
import { Popover } from "@headlessui/react";
import { InformationCircleIcon } from "@heroicons/react/24/solid";
import { usePopper } from "react-popper";

const TextAlignedInfoIcon = (): JSX.Element => (
  <InformationCircleIcon className="relative top-[.125em] h-[1em] w-[1em] text-muted" />
);

const TooltipPopover = ({ children }: { children: React.ReactNode }) => {
  const [referenceElement, setReferenceElement] = useState(null);
  const [popperElement, setPopperElement] = useState(null);

  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    modifiers: [
      {
        name: "preventOverflow",
        options: {
          padding: 24,
        },
      },
    ],
  });

  return (
    <Popover className="group cursor-pointer">
      {/* ref type stuff is a workaround for the weird way popper needs references */}
      <Popover.Button as="div" ref={setReferenceElement as unknown as Ref<HTMLButtonElement>}>
        <div className="px-2">
          <TextAlignedInfoIcon />
        </div>
      </Popover.Button>

      <Popover.Panel
        ref={setPopperElement as unknown as Ref<HTMLDivElement>}
        className={`invisible z-10 w-4/5 max-w-screen-md rounded-md border border-accent-2 bg-background text-sm group-hover:visible`}
        style={styles.popper}
        {...attributes.popper}
        static
      >
        <div className="px-4 py-2">{children}</div>
      </Popover.Panel>
    </Popover>
  );
};

export default TooltipPopover;
