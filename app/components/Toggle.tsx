import React from "react";
import { Switch } from "@headlessui/react";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

const toggleIconClassName = "relative left-[2px] top-[2px] h-4 w-4 stroke-[3]";

type ToggleProps = {
  className?: string;
  checked?: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
};

const Toggle = ({ className, ...props }: ToggleProps) => {
  return (
    <Switch
      className={`group relative flex h-7 w-12 items-center rounded-full bg-accent-2 ui-checked:bg-accent ui-selected:border ${className}`}
      {...props}
    >
      <span className="inline-block h-5 w-5 translate-x-1 transform rounded-full bg-color-1 transition group-disabled:opacity-25 ui-checked:translate-x-6">
        <XMarkIcon className={`block text-accent-2 ui-checked:hidden ${toggleIconClassName}`} />
        <CheckIcon className={`hidden text-accent ui-checked:block ${toggleIconClassName}`} />
      </span>
    </Switch>
  );
};

export default Toggle;
