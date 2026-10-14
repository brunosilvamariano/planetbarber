import {
  Children,
  isValidElement,
  useState,
  forwardRef,
  useRef,
  useImperativeHandle,
  type SelectHTMLAttributes,
  type ReactElement,
} from 'react';
import { Select as Primitive } from 'radix-ui';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
type Option = { value: string; label: string; disabled: boolean };
export const SystemSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function SystemSelect(
    {
      children,
      value,
      defaultValue,
      onChange,
      onBlur,
      disabled,
      required,
      name,
      id,
      className,
      ...props
    },
    ref,
  ) {
    const options: Option[] = [];
    Children.forEach(children, (child) => {
      if (isValidElement(child)) {
        const p = (child as ReactElement<any>).props;
        if (child.type === 'option')
          options.push({
            value: String(p.value ?? p.children ?? ''),
            label: String(p.children ?? ''),
            disabled: !!p.disabled,
          });
      }
    });
    const [internal, setInternal] = useState(String(defaultValue ?? options[0]?.value ?? ''));
    const current = String(value ?? internal);
    const native = useRef<HTMLSelectElement>(null),
      trigger = useRef<HTMLButtonElement>(null);
    useImperativeHandle(ref, () => native.current!);
    const token = (v: string) => (v === '' ? '__empty_option__' : v);
    return (
      <>
        <select
          ref={native}
          name={name}
          value={current}
          required={required}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          className="system-select-native"
          onChange={onChange}
          onInvalid={(e) => {
            e.preventDefault();
            trigger.current?.focus();
          }}
        >
          {children}
        </select>
        <Primitive.Root
          value={token(current)}
          disabled={disabled}
          onValueChange={(v) => {
            const next = v === '__empty_option__' ? '' : v;
            setInternal(next);
            if (native.current) {
              native.current.value = next;
              onChange?.({
                target: native.current,
                currentTarget: native.current,
                type: 'change',
              } as any);
            }
          }}
        >
          <Primitive.Trigger
            ref={trigger}
            id={id}
            className={'plan-trigger system-select ' + (className || '')}
            aria-label={props['aria-label']}
            aria-labelledby={props['aria-labelledby']}
            aria-describedby={props['aria-describedby']}
            aria-required={required}
            onBlur={onBlur as any}
          >
            <Primitive.Value placeholder="Escolha uma opção" />
            <Primitive.Icon className="plan-chevron">
              <ChevronDown size={16} />
            </Primitive.Icon>
          </Primitive.Trigger>
          <Primitive.Portal>
            <Primitive.Content
              className="plan-menu system-select-menu"
              position="popper"
              sideOffset={7}
              collisionPadding={12}
            >
              <Primitive.ScrollUpButton className="plan-scroll">
                <ChevronUp size={16} />
              </Primitive.ScrollUpButton>
              <Primitive.Viewport>
                {options.map((o, i) => (
                  <Primitive.Item
                    key={o.value + '-' + i}
                    value={token(o.value)}
                    disabled={o.disabled}
                    className="plan-option"
                  >
                    <Primitive.ItemText>{o.label}</Primitive.ItemText>
                    <Primitive.ItemIndicator>
                      <Check size={16} />
                    </Primitive.ItemIndicator>
                  </Primitive.Item>
                ))}
              </Primitive.Viewport>
              <Primitive.ScrollDownButton className="plan-scroll">
                <ChevronDown size={16} />
              </Primitive.ScrollDownButton>
            </Primitive.Content>
          </Primitive.Portal>
        </Primitive.Root>
      </>
    );
  },
);
