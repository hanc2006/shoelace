import 'element-internals-polyfill';
import { html, TemplateResult, LitElement } from 'lit';
import { classMap } from 'lit-html/directives/class-map';
import { ifDefined } from 'lit-html/directives/if-defined';
import { property, state } from 'lit/decorators.js';
import { ElementInternals } from 'element-internals-polyfill/dist/element-internals';
import { emit } from './event';
import type SlInput from '../components/input/input';

// As of TypeScript 4.2, you can use an https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-2.html#abstract-construct-signatures
type Constructor<T> = abstract new (...args: any[]) => T;

abstract class FormElement<M> {
  abstract input: HTMLInputElement;
  abstract formResetCallback(): void;
  abstract formStateRestoreCallback(state: string, mode: any): void;
  hasFocus: boolean;
  value: M;
  name: string;
  readonly: boolean;
  disabled: boolean;
  required: boolean;
  invalid: boolean;
  internals?: ElementInternals;
  handleBlur: () => void;
  handleFocus: () => void;
  updateInternals: () => void;
}

export function SlFormElement<M = number | string | string[]>() {
  return function <T extends Constructor<LitElement>>(Base: T) {
    abstract class LitElementMixin extends Base {
      static formAssociated = true;
      internals?: ElementInternals = this.attachInternals!();

      abstract input: HTMLInputElement;
      abstract formResetCallback(): void;
      abstract formStateRestoreCallback(state: string, mode: any): void;

      // @event('sl-change') slChange: EventEmitter<void>;
      // @event('sl-input') slInput: EventEmitter<void>;
      // @event('sl-focus') slFocus: EventEmitter<void>;
      // @event('sl-blur') slBlur: EventEmitter<void>;

      @state() hasFocus: boolean = false;
      @property() value: M;
      @property() name: string;
      @property({ type: Boolean, reflect: true }) readonly: boolean = false;
      @property({ type: Boolean, reflect: true }) disabled: boolean = false;
      @property({ type: Boolean, reflect: true }) required: boolean = false;
      @property({ type: Boolean, reflect: true }) invalid: boolean = false;

      updateInternals() {
        let formData = new FormData();

        if (this.value instanceof Array) {
          this.value.forEach(val => formData.append(this.name, val));
        } else if (typeof this.value === 'number') {
          formData.append(this.name, this.value.toString());
        } else if (typeof this.value === 'string') {
          formData.append(this.name, this.value);
        }
        this.internals!.setFormValue(formData);
        this.internals!.setValidity(this.input.validity, this.input.validationMessage, this.input);
      }

      handleFocus() {
        this.hasFocus = true;
        emit(this, 'sl-focus');
      }

      handleBlur() {
        this.hasFocus = false;
        emit(this, 'sl-blur');
      }

      blur() {
        this.input.blur();
      }
    }

    return LitElementMixin as Constructor<FormElement<M>> & T;
  };
}

export const renderFormControl = (
  props: {
    /** The input id, used to map the input to the label */
    inputId: string;

    /** The size of the form control */
    size: 'small' | 'medium' | 'large';

    /** The label id, used to map the label to the input */
    labelId?: string;

    /** The label text (if the label slot isn't used) */
    label?: string;

    /** Whether or not a label slot has been provided. */
    hasLabelSlot?: boolean;

    /** The help text id, used to map the input to the help text */
    helpTextId?: string;

    /** The help text (if the help-text slot isn't used) */
    helpText?: string;

    /** Whether or not a help text slot has been provided. */
    hasHelpTextSlot?: boolean;

    /** A function that gets called when the label is clicked. */
    onLabelClick?: (event: MouseEvent) => void;
  },
  input: TemplateResult
) => {
  const hasLabel = props.label ? true : !!props.hasLabelSlot;
  const hasHelpText = props.helpText ? true : !!props.hasHelpTextSlot;

  return html`
    <div
      part="form-control"
      class=${classMap({
        'form-control': true,
        'form-control--small': props.size === 'small',
        'form-control--medium': props.size === 'medium',
        'form-control--large': props.size === 'large',
        'form-control--has-label': hasLabel,
        'form-control--has-help-text': hasHelpText
      })}
    >
      <label
        part="label"
        id=${ifDefined(props.labelId)}
        class="form-control__label"
        for=${props.inputId}
        aria-hidden=${hasLabel ? 'false' : 'true'}
        @click=${(event: MouseEvent) => (props.onLabelClick ? props.onLabelClick(event) : null)}
      >
        <slot name="label">${props.label}</slot>
      </label>

      <div class="form-control__input">${html`${input}`}</div>

      <div
        part="help-text"
        id=${ifDefined(props.helpTextId)}
        class="form-control__help-text"
        aria-hidden=${hasHelpText ? 'false' : 'true'}
      >
        <slot name="help-text">${props.helpText}</slot>
      </div>
    </div>
  `;
};

export function getLabelledBy(props: {
  /** The label id, used to map the label to the input */
  labelId: string;

  /** The label text (if the label slot isn't used) */
  label: string;

  /** Whether or not a label slot has been provided. */
  hasLabelSlot: boolean;

  /** The help text id, used to map the input to the help text */
  helpTextId: string;

  /** The help text (if the help-text slot isn't used) */
  helpText: string;

  /** Whether or not a help text slot has been provided. */
  hasHelpTextSlot: boolean;
}) {
  const labelledBy = [
    props.label || props.hasLabelSlot ? props.labelId : '',
    props.helpText || props.hasHelpTextSlot ? props.helpTextId : ''
  ].filter(val => val);

  return labelledBy.join(' ') || undefined;
}

export const propertyName = <T>(obj: T, selector: (x: Record<keyof T, keyof T>) => keyof T): string => {
  const keyRecord = Object.keys(obj).reduce((res, key) => {
    const typedKey = key as keyof T;
    res[typedKey] = typedKey;

    return res;
  }, {} as Record<keyof T, keyof T>);

  return selector(keyRecord) as string;
};

// interface Person {
//   firstName: string;
//   lastName: string;
// }

// const person = {
//   firstName: "Jim",
//   lastName: "Bloggs",
// };

export const nameof =
  <T>() =>
  (name: keyof T) =>
    name;

type PropertyOnly<T> = Pick<T, { [K in keyof T]: T[K] extends Function ? never : K }[keyof T]>;
type FilterProperty<T> = Omit<PropertyOnly<T>, 'name' | 'value'>;

export const formInput = <
  M extends {
    [index: string]: any;
  }
>(obj: {
  data: M;
  bind: (name: Record<keyof M, keyof M>) => keyof M;
  attr: Partial<Omit<FilterProperty<SlInput>, keyof LitElement>>;
}): TemplateResult => {
  const name = propertyName(obj.data, obj.bind);

  return html` <sl-input id=${name} name=${name} .value=${obj.data[name]}> </sl-input> `;
};

// export const formInput = <
//   M extends {
//     [index: string]: any;
//   }
// >(obj: {
//     data: M,
//     bind: string;
//     attr: Partial<Omit<FilterProperty<SlInput>, keyof LitElement>>;
//   }
// ): TemplateResult => {
//   const name = obj.bind;

//   return html`
//     <sl-input id=${name} name=${name} .value=${obj.data[name]}> </sl-input>
//   `;
// };

// formInput<Person>({
//   data: person,
//   bind: p => p.firstName,
//   attr: { label: "Surname" },
// });

export const input = <
  M extends {
    [index: string]: any;
  }
>(
  strings: TemplateStringsArray,
  d: {
    data: M;
    bind: (name: Record<keyof M, keyof M>) => keyof M;
    attr: Partial<Omit<FilterProperty<SlInput>, keyof LitElement>>;
  }
) => {
  console.log(strings);
  return formInput<M>({
    data: d.data,
    bind: d.bind,
    attr: d.attr
  });
};

export const reinput = <
  M extends {
    [index: string]: any;
  }
>(
  data: M,
  bind: (name: Record<keyof M, keyof M>) => keyof M,
  attr: Partial<Omit<FilterProperty<SlInput>, keyof LitElement>>
) =>
  formInput<M>({
    data: data,
    bind: bind,
    attr: attr
  });

// @customElement('sl-form-input')
// export default class SlFormInput<M> extends LitElement {

//   @property({attribute: false})
//   data: M;

//   @property({attribute: true})
//   // bind: (name: Record<keyof M, keyof M>) => keyof M;
//   bind: string;

//   @property({attribute: false})
//   attr: Partial<Omit<FilterProperty<SlInput>, keyof LitElement>>;

//   createRenderRoot =() => this;

//   render = () => formInput<M>({
//       data: this.data,
//       bind: this.bind,
//       attr: this.attr
//     });
// }
