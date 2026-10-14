import { Select } from 'radix-ui';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
export function FilterSelect({
  value,
  label,
  onChange,
  options,
}: {
  value: string;
  label: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className="plan-trigger agenda-filter" aria-label={label}>
        <Select.Value />
        <Select.Icon className="plan-chevron">
          <ChevronDown size={16} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="plan-menu"
          position="popper"
          sideOffset={7}
          collisionPadding={12}
        >
          <Select.ScrollUpButton className="plan-scroll">
            <ChevronUp size={16} />
          </Select.ScrollUpButton>
          <Select.Viewport>
            {options.map((o) => (
              <Select.Item className="plan-option" key={o.value} value={o.value}>
                <Select.ItemText>{o.label}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check size={16} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton className="plan-scroll">
            <ChevronDown size={16} />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
