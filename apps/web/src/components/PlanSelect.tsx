import { Select } from 'radix-ui';
import { Check, ChevronDown, ChevronUp, Layers } from 'lucide-react';
const plans = ['START', 'PRO', 'PREMIUM', 'ENTERPRISE'];
export function PlanSelect({
  value,
  label,
  onChange,
}: {
  value: string;
  label: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className="plan-trigger" aria-label={label}>
        <Layers size={15} />
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
            {plans.map((plan) => (
              <Select.Item className="plan-option" value={plan} key={plan}>
                <Select.ItemText>{plan}</Select.ItemText>
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
